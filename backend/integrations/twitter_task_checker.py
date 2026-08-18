import re
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


def user_follows_account(user_twitter_id, target_user_id, max_pages=_MAX_LOOKUP_PAGES):
    """Still uses app-only auth — this endpoint accepts it for your app tier."""
    pagination_token = None

    for _ in range(max_pages):
        params = {
            "max_results": 1000,
        }

        if pagination_token:
            params["pagination_token"] = pagination_token

        data = x_get(
            f"/users/{user_twitter_id}/following",
            params=params
        )

        for followed_user in data.get("data", []):
            if str(followed_user["id"]) == str(target_user_id):
                return True

        meta = data.get("meta", {})
        pagination_token = meta.get("next_token")

        if not pagination_token:
            break

    return False


def user_liked_tweet(
    user_twitter_id,
    tweet_id,
    access_token=None,
    max_pages=1,    
):
    """Check whether a specific X user has liked a specific tweet."""

    pagination_token = None

    logger.info("========== USER LIKES DEBUG ==========")
    logger.info("Target X user ID: %s", user_twitter_id)
    logger.info("Target tweet ID: %s", tweet_id)
    logger.info("Using OAuth token: %s", bool(access_token))
    logger.info("======================================")

    for _ in range(max_pages):

        params = {
            "max_results": 100,
        }

        if pagination_token:
            params["pagination_token"] = pagination_token

        data = x_get(
            f"/users/{user_twitter_id}/liked_tweets",
            params=params,
            access_token=access_token,
        )

        for liked_tweet in data.get("data", []):
            if str(liked_tweet.get("id")) == str(tweet_id):
                logger.info(
                    "✅ LIKE MATCH FOUND: user %s liked tweet %s",
                    user_twitter_id,
                    tweet_id,
                )
                return True

        meta = data.get("meta", {})
        pagination_token = meta.get("next_token")

        if not pagination_token:
            break

    logger.info(
        "❌ LIKE MATCH NOT FOUND (checked %s page(s)): user %s vs tweet %s",
        max_pages,
        user_twitter_id,
        tweet_id,
    )

    return False

def user_reposted_tweet(user_twitter_id, tweet_id, access_token=None, max_pages=_MAX_LOOKUP_PAGES):
    """Requires user-context auth — X rejects Application-Only here."""
    pagination_token = None

    for _ in range(max_pages):
        params = {
            "max_results": 100,
        }

        if pagination_token:
            params["pagination_token"] = pagination_token

        data = x_get(
            f"/tweets/{tweet_id}/retweeted_by",
            params=params,
            access_token=access_token,
        )

        for x_user in data.get("data", []):
            if str(x_user["id"]) == str(user_twitter_id):
                return True

        meta = data.get("meta", {})
        pagination_token = meta.get("next_token")

        if not pagination_token:
            break

    return False


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