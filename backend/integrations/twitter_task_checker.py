import re
import time
import logging
import requests
from urllib.parse import urlparse

from backend.auth.usertwitter import UserTwitter
from backend.integrations.twitterAPI import (
    TWITTER_API_BASE as X_API_BASE,
    BEARER_TOKEN as X_BEARER_TOKEN,
    refresh_access_token as refresh_twitter_token,
)

logger = logging.getLogger(__name__)

class TwitterVerificationError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


class TwitterReauthRequired(TwitterVerificationError):
    """Raised only when we're confident the connected token itself is the
    problem (missing, or a real 401 that survives a refresh attempt)."""
    pass


def x_get(path, params=None, access_token=None):
    token = access_token or X_BEARER_TOKEN
    if not token:
        raise TwitterVerificationError("X API bearer token is not configured.")

    url = f"{X_API_BASE}{path}"

    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        timeout=15,
    )

    if response.status_code >= 400:
        try:
            payload = response.json()
        except Exception:
            payload = {}

        logger.warning("X API %s error on %s: %s", response.status_code, url, response.text[:500])  # add this

        msg = (
            payload.get("detail")
            or payload.get("title")
            or f"X API returned HTTP {response.status_code}"
        )
        raise TwitterVerificationError(msg, status_code=response.status_code)

    return response.json()


def _call_with_user_context(fn, twitter, *args, **kwargs):
    """
    Run an x_get-backed lookup using the connected user's OWN token
    (required by endpoints like liking_users / retweeted_by / tweet
    lookup that reject Application-Only auth).

    Only raises TwitterReauthRequired when the token itself is genuinely
    the problem. Any other error (403 permission/tier issue, 429 rate
    limit, etc.) is NOT swallowed — it propagates as a normal
    TwitterVerificationError with the real message intact, so callers
    can see what actually went wrong instead of a misleading
    "reconnect your account" message.
    """
    if not twitter.access_token:
        if not refresh_twitter_token(twitter):
            raise TwitterReauthRequired(
                "No access token on file and refresh failed."
            )

    try:
        return fn(*args, access_token=twitter.access_token, **kwargs)
    except TwitterVerificationError as e:
        if e.status_code == 401:
            if refresh_twitter_token(twitter):
                try:
                    return fn(*args, access_token=twitter.access_token, **kwargs)
                except TwitterVerificationError as e2:
                    if e2.status_code == 401:
                        raise TwitterReauthRequired(str(e2)) from e2
                    raise
            raise TwitterReauthRequired(str(e)) from e
        # Not an auth problem (e.g. 403 access-tier restriction, 429 rate
        # limit) — let the real error bubble up untouched.
        raise


TWITTER_TWEET_RE = re.compile(
    r"(?:twitter\.com|x\.com)/[^/]+/status/(\d+)",
    re.IGNORECASE
)

TWITTER_PROFILE_RE = re.compile(
    r"(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)",
    re.IGNORECASE
)

# Hard cap on pagination for follow/like/retweet lookups. Protects against a
# popular target tweet/account causing unbounded (costly) pagination when the
# claiming user simply hasn't done the action — we stop after this many pages
# regardless of whether we found a match.
_MAX_LOOKUP_PAGES = 10


def extract_tweet_id(url):
    if not url:
        return None

    match = TWITTER_TWEET_RE.search(url)

    if not match:
        return None

    return match.group(1)


def extract_profile_username(url):
    if not url:
        return None

    match = TWITTER_PROFILE_RE.search(url)

    if not match:
        return None

    username = match.group(1)

    if username.lower() in ("i", "home", "explore", "notifications", "messages"):
        return None

    return username


def get_x_user_by_username(username):
    data = x_get(
        f"/users/by/username/{username}",
        params={
            "user.fields": "id,name,username,verified,public_metrics"
        }
    )

    return data.get("data")


# ============================================================
# Shared engagement cache
# ============================================================
# The old approach checked "did THIS user like/follow/repost X" fresh,
# per user, per claim — even though hundreds of users are all checking
# the SAME quest target. That means cost scaled with claim attempts,
# not with number of quests, and burned through API credit fast.
#
# The fix: for a given target (tweet or account), fetch the full set of
# "who liked / who reposted / who follows" ONCE, cache it for a short
# window, and answer every subsequent claim against that target from
# the cached set — no API call at all.
#
# Trade-off: this is a single, possibly-multi-page fetch per target per
# cache window, capped at _MAX_LOOKUP_PAGES pages (up to ~1,000 IDs for
# likes/reposts at 100/page, or ~10,000 for follows at 1000/page). For a
# quest tweet/account far bigger than that, some genuine likers/
# followers/reposters past the cap won't be found — bump
# _MAX_LOOKUP_PAGES if your quest targets are unusually large.
_ENGAGEMENT_CACHE = {}
_ENGAGEMENT_CACHE_TTL = 180  # seconds — how long a target's cached set is reused


def _cache_get_ids(kind, target_id):
    entry = _ENGAGEMENT_CACHE.get((kind, target_id))
    if not entry:
        return None
    ids, expires_at = entry
    if time.time() > expires_at:
        _ENGAGEMENT_CACHE.pop((kind, target_id), None)
        return None
    return ids


def _cache_set_ids(kind, target_id, ids):
    _ENGAGEMENT_CACHE[(kind, target_id)] = (ids, time.time() + _ENGAGEMENT_CACHE_TTL)


def _fetch_id_set(path, access_token=None, max_pages=_MAX_LOOKUP_PAGES, max_results=100):
    """Paginate an X 'list of users' endpoint ONCE and return the full
    set of user IDs seen. Shared by follows/likes/reposts."""
    ids = set()
    pagination_token = None

    for _ in range(max_pages):
        params = {"max_results": max_results}
        if pagination_token:
            params["pagination_token"] = pagination_token

        data = x_get(path, params=params, access_token=access_token)

        for x_user in data.get("data", []):
            ids.add(str(x_user["id"]))

        meta = data.get("meta", {})
        pagination_token = meta.get("next_token")
        if not pagination_token:
            break

    return ids


def user_follows_account(user_twitter_id, target_user_id, max_pages=_MAX_LOOKUP_PAGES):
    """Check whether user_twitter_id follows target_user_id.

    Fetches target_user_id's FOLLOWERS list once (cached), instead of
    pulling the claiming user's entire following list on every claim —
    the old approach could mean paginating up to 10,000 accounts per
    single claim. Still app-only auth; this endpoint accepts it for
    your app tier.
    """
    follower_ids = _cache_get_ids("followers", target_user_id)

    if follower_ids is None:
        follower_ids = _fetch_id_set(
            f"/users/{target_user_id}/followers",
            max_pages=max_pages,
            max_results=1000,
        )
        _cache_set_ids("followers", target_user_id, follower_ids)

    return str(user_twitter_id) in follower_ids


def user_liked_tweet(
    user_twitter_id,
    tweet_id,
    access_token=None,
    max_pages=_MAX_LOOKUP_PAGES,
):
    """Check whether a specific X user has liked a specific tweet.

    Fetches the tweet's LIKING USERS once per cache window (shared by
    every claimer checking the same tweet), instead of pulling each
    claiming user's own liked-tweets history on every claim.
    """
    liker_ids = _cache_get_ids("likes", tweet_id)

    if liker_ids is None:
        liker_ids = _fetch_id_set(
            f"/tweets/{tweet_id}/liking_users",
            access_token=access_token,
            max_pages=max_pages,
        )
        _cache_set_ids("likes", tweet_id, liker_ids)

    matched = str(user_twitter_id) in liker_ids

    logger.info(
        "Like check (cached, %d likers known): user %s vs tweet %s -> %s",
        len(liker_ids), user_twitter_id, tweet_id, matched,
    )

    return matched


def user_reposted_tweet(user_twitter_id, tweet_id, access_token=None, max_pages=_MAX_LOOKUP_PAGES):
    """Requires user-context auth — X rejects Application-Only here.
    Backed by the same shared per-tweet cache as likes."""
    reposter_ids = _cache_get_ids("reposts", tweet_id)

    if reposter_ids is None:
        reposter_ids = _fetch_id_set(
            f"/tweets/{tweet_id}/retweeted_by",
            access_token=access_token,
            max_pages=max_pages,
        )
        _cache_set_ids("reposts", tweet_id, reposter_ids)

    return str(user_twitter_id) in reposter_ids


def get_tweet(tweet_id, access_token=None):
    data = x_get(
        f"/tweets/{tweet_id}",
        params={
            "tweet.fields": (
                "id,author_id,created_at,conversation_id,"
                "in_reply_to_user_id,referenced_tweets,text"
            )
        },
        access_token=access_token,
    )

    return data.get("data")


def verify_reply(
    user_twitter_id,
    target_tweet_id,
    reply_tweet_id,
    access_token=None,
):
    reply = get_tweet(reply_tweet_id, access_token=access_token)

    if not reply:
        return False, "Reply post could not be found.", None

    # 1. It must belong to the connected X account.
    if str(reply.get("author_id")) != str(user_twitter_id):
        return False, "That reply was not posted by your connected X account.", reply

    referenced = reply.get("referenced_tweets") or []

    replied_to_ids = {
        str(ref["id"])
        for ref in referenced
        if ref.get("type") == "replied_to"
    }

    # 2. It must actually reply to the task's target post.
    if str(target_tweet_id) not in replied_to_ids:
        return False, "That post is not a reply to the required post.", reply

    return True, None, reply


def check_twitter_task_for_user(user, task, reply_url=None):
    """
    Verify an X/Twitter task against the user's connected X account.

    Supported:
        follow
        engage -> like
        engage -> repost
        engage -> reply   (needs reply_url, collected from the frontend)
        space  -> always passes (no API can verify Space attendance)
    """

    twitter = (
        UserTwitter.query
        .filter_by(
            user_id=user.id,
            action="connected"
        )
        .order_by(UserTwitter.timestamp.desc())
        .first()
    )

    if not twitter:
        return {
            "success": False,
            "error": "Connect your X account before completing this task.",
            "reason": "twitter_not_connected",
        }

    user_twitter_id = str(twitter.twitter_user_id)

    config = task.config or {}

    mode = config.get("mode")

    try:

        # ============================================================
        # FOLLOW
        # ============================================================

        if mode == "follow":

            profile_link = config.get("profile_link")

            target_username = extract_profile_username(profile_link)

            if not target_username:
                return {
                    "success": False,
                    "error": "Invalid X profile link.",
                    "reason": "invalid_profile_link",
                }

            target_user = get_x_user_by_username(target_username)

            if not target_user:
                return {
                    "success": False,
                    "error": "The required X account could not be found.",
                    "reason": "target_account_not_found",
                }

            target_user_id = str(target_user["id"])

            followed = user_follows_account(
                user_twitter_id=user_twitter_id,
                target_user_id=target_user_id,
            )

            if not followed:
                return {
                    "success": False,
                    "error": f"Follow @{target_user['username']} before claiming this task.",
                    "reason": "not_following",
                }

            return {
                "success": True,
                "data": {
                    "mode": "follow",
                    "target_user_id": target_user_id,
                    "target_username": target_user["username"],
                    "followed": True,
                }
            }

        # ============================================================
        # ENGAGE
        # ============================================================

        elif mode == "engage":

            tweet_link = config.get("tweet_link")

            target_tweet_id = extract_tweet_id(tweet_link)

            if not target_tweet_id:
                return {
                    "success": False,
                    "error": "Invalid X post link.",
                    "reason": "invalid_tweet_link",
                }

            result = {
                "mode": "engage",
                "tweet_id": target_tweet_id,
            }

            # --------------------------------------------------------
            # LIKE — needs user-context auth
            # --------------------------------------------------------

            if config.get("like") is True:

                try:
                    liked = _call_with_user_context(
                        user_liked_tweet,
                        twitter,
                        user_twitter_id,
                        target_tweet_id,
                    )
                except TwitterReauthRequired as e:
                    logging.warning("Twitter reauth required for user %s: %s", user.id, e)
                    return {
                        "success": False,
                        "error": "We couldn't verify your like — please reconnect your X account and try again.",
                        "reason": "twitter_reauth_required",
                        "debug": str(e),
                        "data": result,
                    }

                if not liked:
                    return {
                        "success": False,
                        "error": "Like the required post before claiming.",
                        "reason": "not_liked",
                        "data": result,
                    }

                result["liked"] = True

            # --------------------------------------------------------
            # REPOST — needs user-context auth
            # --------------------------------------------------------

            if config.get("retweet") is True:

                try:
                    reposted = _call_with_user_context(
                        user_reposted_tweet,
                        twitter,
                        user_twitter_id,
                        target_tweet_id,
                    )
                except TwitterReauthRequired as e:
                    logging.warning("Twitter reauth required for user %s: %s", user.id, e)
                    return {
                        "success": False,
                        "error": "We couldn't verify your repost — please reconnect your X account and try again.",
                        "reason": "twitter_reauth_required",
                        "debug": str(e),
                        "data": result,
                    }

                if not reposted:
                    return {
                        "success": False,
                        "error": "Repost the required post before claiming.",
                        "reason": "not_reposted",
                        "data": result,
                    }

                result["reposted"] = True

            # --------------------------------------------------------
            # REPLY — tweet lookup needs user-context auth
            # --------------------------------------------------------

            if config.get("reply") is True:

                if not reply_url:
                    return {
                        "success": False,
                        "error": "Reply URL is required.",
                        "reason": "reply_url_required",
                        "requires_reply_url": True,
                        "data": result,
                    }

                reply_tweet_id = extract_tweet_id(reply_url)

                if not reply_tweet_id:
                    return {
                        "success": False,
                        "error": "Invalid reply link.",
                        "reason": "invalid_reply_link",
                        "data": result,
                    }

                try:
                    ok, err, reply_tweet = _call_with_user_context(
                        verify_reply,
                        twitter,
                        user_twitter_id=user_twitter_id,
                        target_tweet_id=target_tweet_id,
                        reply_tweet_id=reply_tweet_id,
                    )
                except TwitterReauthRequired as e:
                    logging.warning("Twitter reauth required for user %s: %s", user.id, e)
                    return {
                        "success": False,
                        "error": "We couldn't verify your reply — please reconnect your X account and try again.",
                        "reason": "twitter_reauth_required",
                        "debug": str(e),
                        "data": result,
                    }

                if not ok:
                    return {
                        "success": False,
                        "error": err,
                        "reason": "reply_invalid",
                        "data": result,
                    }

                result["replied"] = True
                result["reply_tweet_id"] = reply_tweet_id

            return {
                "success": True,
                "data": result,
            }

        # ============================================================
        # SPACE — no API can verify Space attendance/join, so this task
        # type always passes. It's a "show that we tried to check" no-op
        # rather than blocking a claim on something that can't be checked.
        # ============================================================

        elif mode == "space":

            space_link = config.get("space_link")

            return {
                "success": True,
                "data": {
                    "mode": "space",
                    "space_link": space_link,
                    "verified": False,  # honest flag: not actually checked
                },
            }

        return {
            "success": False,
            "error": f"Unsupported X task mode: {mode}",
            "reason": "unsupported_mode",
        }

    except TwitterVerificationError as e:

        logging.exception("X verification failed")

        return {
            "success": False,
            "error": "Unable to verify this X task right now. Please try again.",
            "reason": "x_api_error",
            "debug": str(e),
        }

    except requests.RequestException:

        logging.exception("X API request failed")

        return {
            "success": False,
            "error": "X verification is temporarily unavailable. Please try again.",
            "reason": "x_network_error",
        }