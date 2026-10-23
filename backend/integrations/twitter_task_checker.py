import os
import re
import time
import logging
import threading
from datetime import datetime

import requests
from urllib.parse import urlparse

from backend.auth.usertwitter import UserTwitter
from backend.integrations.twitterAPI import (
    TWITTER_API_BASE as X_API_BASE,
    BEARER_TOKEN as X_BEARER_TOKEN,
    refresh_access_token as refresh_twitter_token,
)

logger = logging.getLogger(__name__)


# ============================================================
# Mode switch
# ============================================================
# AUTO_ACTIONS = True  -> on Claim, Gleyo performs the like / repost /
#                         follow itself using the user's connected X
#                         account (needs tweet.write, like.write,
#                         follows.write scopes). Nothing to verify, no
#                         scanning, near-zero read cost.
# AUTO_ACTIONS = False -> old behaviour: check the user's recent
#                         likes/posts/follow status (read-only).
# Flip with env var X_AUTO_ACTIONS=0 if X write access isn't available
# on your plan or you need to turn it off quickly.
AUTO_ACTIONS = os.getenv("X_AUTO_ACTIONS", "1") == "1"


class TwitterVerificationError(Exception):
    def __init__(self, message, status_code=None):
        super().__init__(message)
        self.status_code = status_code


class TwitterReauthRequired(TwitterVerificationError):
    """Raised only when we're confident the connected token itself is the
    problem (missing, or a real 401 that survives a refresh attempt)."""
    pass


def _is_already_done_error(e, *phrases):
    """True when X says the action was already performed (goal state reached).

    X's retweet endpoint is NOT idempotent: retweeting something you've
    already retweeted returns HTTP 400 "You cannot retweet a Tweet that you
    have already retweeted." For our purposes that means the task's goal
    state is already true, so we treat it as success.

    Only matches the specific phrases passed in, never "any 400".
    """
    msg = (str(e) or "").lower()
    status = getattr(e, "status_code", None)
    return status in (400, 403) and any(p in msg for p in phrases)


# ============================================================
# Spend guard
# ============================================================
# X bills per resource (post/user object) RETURNED, and writes cost too.
# We count every resource that comes back (and every write) and stop
# calling X once the daily budget is hit, so a bug or a spam wave can
# never drain the account again. This counter is per-process (per
# gunicorn worker), so the real ceiling is roughly
# DAILY_READ_BUDGET x number_of_workers.
# Set X_DAILY_READ_BUDGET in your env to tune it.
DAILY_READ_BUDGET = int(os.getenv("X_DAILY_READ_BUDGET", "5000"))

_budget_lock = threading.Lock()
_budget_day = None
_budget_used = 0


def _budget_roll_day():
    global _budget_day, _budget_used
    today = datetime.utcnow().date()
    if _budget_day != today:
        _budget_day = today
        _budget_used = 0


def _budget_exhausted():
    with _budget_lock:
        _budget_roll_day()
        return _budget_used >= DAILY_READ_BUDGET


def _budget_add(n):
    global _budget_used
    if n <= 0:
        return
    with _budget_lock:
        _budget_roll_day()
        _budget_used += n
        used = _budget_used
    if used in range(int(DAILY_READ_BUDGET * 0.8), int(DAILY_READ_BUDGET * 0.8) + n):
        logger.warning("X API daily budget 80%% used (%d/%d)", used, DAILY_READ_BUDGET)


def _x_request(method, path, params=None, json_body=None, access_token=None):
    token = access_token or X_BEARER_TOKEN
    if not token:
        raise TwitterVerificationError("X API bearer token is not configured.")

    if _budget_exhausted():
        logger.error("X API daily budget (%d) exhausted — refusing call to %s", DAILY_READ_BUDGET, path)
        raise TwitterVerificationError("X API daily budget exhausted.", status_code=429)

    url = f"{X_API_BASE}{path}"

    response = requests.request(
        method,
        url,
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        json=json_body,
        timeout=15,
    )

    if response.status_code >= 400:
        try:
            payload = response.json()
        except Exception:
            payload = {}

        logger.warning("X API %s error on %s %s: %s", response.status_code, method, url, response.text[:500])

        detail = (
            payload.get("detail")
            or payload.get("title")
            or f"X API returned HTTP {response.status_code}"
        )

        # X puts the useful reason (e.g. "You cannot retweet a Tweet that you
        # have already retweeted.") inside errors[].message, while `detail`
        # is just a generic "One or more parameters..." string. Keep both so
        # callers can recognise specific cases.
        inner = " ".join(
            err.get("message", "")
            for err in (payload.get("errors") or [])
            if isinstance(err, dict)
        ).strip()

        msg = f"{detail} {inner}".strip() if inner else detail
        raise TwitterVerificationError(msg, status_code=response.status_code)

    payload = response.json()

    if method.upper() == "GET":
        data = payload.get("data")
        if isinstance(data, list):
            _budget_add(len(data))
        elif data:
            _budget_add(1)
    else:
        _budget_add(1)

    return payload


def x_get(path, params=None, access_token=None):
    return _x_request("GET", path, params=params, access_token=access_token)


def x_post(path, json_body, access_token=None):
    return _x_request("POST", path, json_body=json_body, access_token=access_token)


def _call_with_user_context(fn, twitter, *args, **kwargs):
    """
    Run an x_get/x_post-backed call using the connected user's OWN token
    (required for liking/reposting/following as that user, and for
    endpoints like liked_tweets / user timeline / tweet lookup).

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


def get_x_user_by_username(username, access_token=None, user_fields="id,name,username,verified,public_metrics"):
    data = x_get(
        f"/users/by/username/{username}",
        params={"user.fields": user_fields},
        access_token=access_token,
    )

    return data.get("data")


# ============================================================
# Result cache
# ============================================================
# Remember outcomes per (kind, user, target):
#   - True (done / verified) is cached forever.
#   - False (not done yet) is cached briefly so spam-clicking can't
#     re-bill us. Only used by the read-based fallback path.
#
# Cache is per-process. For a cache shared across gunicorn workers,
# swap these two helpers for Redis (SET key val EX ttl) — same interface.
# (Auto actions are safe to repeat: like/follow are idempotent on X, and
# the "already retweeted" error on repost is treated as success, so a
# cache miss on another worker or after a restart never causes a wrong
# result.)
_RESULT_CACHE = {}
_RESULT_CACHE_MAX = 50000
_NEGATIVE_TTL = 20  # seconds before a "no" can be re-checked against X


def _result_cache_get(kind, user_id, target_id):
    entry = _RESULT_CACHE.get((kind, str(user_id), str(target_id)))
    if not entry:
        return None
    value, expires_at = entry
    if expires_at is not None and time.time() > expires_at:
        _RESULT_CACHE.pop((kind, str(user_id), str(target_id)), None)
        return None
    return value


def _result_cache_set(kind, user_id, target_id, value):
    if len(_RESULT_CACHE) >= _RESULT_CACHE_MAX:
        _RESULT_CACHE.clear()  # crude safety valve, avoids unbounded growth
    expires_at = None if value else time.time() + _NEGATIVE_TTL
    _RESULT_CACHE[(kind, str(user_id), str(target_id))] = (value, expires_at)


# Username -> user id rarely changes; cache it for a day so repeat
# follow tasks against the same account never pay for the lookup twice.
_USERNAME_CACHE = {}
_USERNAME_CACHE_TTL = 86400


def _resolve_user(username, access_token=None):
    key = username.lower()
    entry = _USERNAME_CACHE.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]

    user = get_x_user_by_username(username, access_token=access_token, user_fields="id,name,username")
    if user:
        _USERNAME_CACHE[key] = (user, time.time() + _USERNAME_CACHE_TTL)
    return user


# ============================================================
# AUTO ACTIONS — Gleyo performs the action as the user
# ============================================================
# X v2 write endpoints, called with the user's OWN OAuth token:
#   POST /2/users/:id/likes      {"tweet_id": ...}         (like.write)
#   POST /2/users/:id/retweets   {"tweet_id": ...}         (tweet.write)
#   POST /2/users/:id/following  {"target_user_id": ...}   (follows.write)
#
# Repeat-safety:
#   like / follow -> X returns success again if already done.
#   retweet       -> X returns HTTP 400 "You cannot retweet a Tweet that
#                    you have already retweeted." We treat that specific
#                    error as success (goal state already reached).
#                    Same defensive handling is applied to like/follow in
#                    case X changes behaviour.

def like_tweet(user_twitter_id, tweet_id, access_token=None):
    if _result_cache_get("like", user_twitter_id, tweet_id) is True:
        return True

    try:
        payload = x_post(
            f"/users/{user_twitter_id}/likes",
            {"tweet_id": str(tweet_id)},
            access_token=access_token,
        )
        if not (payload.get("data") or {}).get("liked"):
            logger.warning("Like call returned 2xx but liked flag missing: %s", payload)
    except TwitterVerificationError as e:
        if _is_already_done_error(e, "already liked"):
            logger.info(
                "Like already exists: user %s -> tweet %s (treating as done)",
                user_twitter_id, tweet_id,
            )
        else:
            raise

    _result_cache_set("like", user_twitter_id, tweet_id, True)
    logger.info("Auto-like: user %s -> tweet %s", user_twitter_id, tweet_id)
    return True


def retweet_tweet(user_twitter_id, tweet_id, access_token=None):
    if _result_cache_get("repost", user_twitter_id, tweet_id) is True:
        return True

    try:
        payload = x_post(
            f"/users/{user_twitter_id}/retweets",
            {"tweet_id": str(tweet_id)},
            access_token=access_token,
        )
        if not (payload.get("data") or {}).get("retweeted"):
            logger.warning("Retweet call returned 2xx but retweeted flag missing: %s", payload)
    except TwitterVerificationError as e:
        if _is_already_done_error(e, "already retweeted", "already reposted"):
            logger.info(
                "Repost already exists: user %s -> tweet %s (treating as done)",
                user_twitter_id, tweet_id,
            )
        else:
            raise

    _result_cache_set("repost", user_twitter_id, tweet_id, True)
    logger.info("Auto-repost: user %s -> tweet %s", user_twitter_id, tweet_id)
    return True


def follow_account(user_twitter_id, target_username, access_token=None):
    """Follow target_username as the user. Returns (target_user_or_None, pending).

    `pending` is True when the target is a protected account: X sends a
    follow REQUEST that the target must approve.
    """
    target_user = _resolve_user(target_username, access_token=access_token)
    if not target_user:
        return None, False

    target_user_id = str(target_user["id"])

    if _result_cache_get("follow", user_twitter_id, target_user_id) is True:
        return target_user, False

    pending = False

    try:
        payload = x_post(
            f"/users/{user_twitter_id}/following",
            {"target_user_id": target_user_id},
            access_token=access_token,
        )
        data = payload.get("data") or {}
        pending = bool(data.get("pending_follow"))
    except TwitterVerificationError as e:
        if _is_already_done_error(e, "already following", "already follow"):
            logger.info(
                "Follow already exists: user %s -> @%s (treating as done)",
                user_twitter_id, target_user.get("username"),
            )
        else:
            raise

    _result_cache_set("follow", user_twitter_id, target_user_id, True)
    logger.info("Auto-follow: user %s -> @%s (pending=%s)", user_twitter_id, target_user.get("username"), pending)
    return target_user, pending


# ============================================================
# READ-BASED FALLBACK (used only when AUTO_ACTIONS is off)
# ============================================================
# X has no "did user A like post B" endpoint. The cheapest honest
# option is the user's OWN most-recent activity, one tiny page:
#   likes   -> GET /users/:id/liked_tweets   (newest like first)
#   reposts -> GET /users/:id/tweets         (reposts show up as
#              referenced_tweets type "retweeted")
_ACTIVITY_PAGE_SIZE = 5
_ACTIVITY_MAX_PAGES = 1


def _scan_recent_activity(path, matcher, access_token, extra_params=None,
                          page_size=_ACTIVITY_PAGE_SIZE, max_pages=_ACTIVITY_MAX_PAGES):
    page_size = max(5, min(100, page_size))
    pagination_token = None

    for _ in range(max_pages):
        params = {"max_results": page_size}
        if extra_params:
            params.update(extra_params)
        if pagination_token:
            params["pagination_token"] = pagination_token

        data = x_get(path, params=params, access_token=access_token)

        for item in data.get("data", []) or []:
            if matcher(item):
                return True

        pagination_token = (data.get("meta") or {}).get("next_token")
        if not pagination_token:
            break

    return False


def user_follows_account(target_username, access_token=None):
    """Single user lookup (1 billable read) using the claimer's own token.

    Returns (target_user_dict_or_None, followed_bool).
    """
    data = x_get(
        f"/users/by/username/{target_username}",
        params={"user.fields": "id,name,username,connection_status"},
        access_token=access_token,
    )

    target_user = data.get("data")
    if not target_user:
        return None, False

    if "connection_status" not in target_user:
        logger.warning("connection_status missing for @%s: %s", target_username, target_user)
        raise TwitterVerificationError(
            "X did not return connection_status (check app access/scopes).",
            status_code=403,
        )

    statuses = target_user.get("connection_status") or []
    return target_user, ("following" in statuses)


def user_liked_tweet(user_twitter_id, tweet_id, access_token=None):
    cached = _result_cache_get("like", user_twitter_id, tweet_id)
    if cached is not None:
        return cached

    liked = _scan_recent_activity(
        f"/users/{user_twitter_id}/liked_tweets",
        matcher=lambda t: str(t.get("id")) == str(tweet_id),
        access_token=access_token,
    )

    _result_cache_set("like", user_twitter_id, tweet_id, liked)
    logger.info("Like check: user %s vs tweet %s -> %s", user_twitter_id, tweet_id, liked)
    return liked


def user_reposted_tweet(user_twitter_id, tweet_id, access_token=None):
    cached = _result_cache_get("repost", user_twitter_id, tweet_id)
    if cached is not None:
        return cached

    def _is_repost_of_target(t):
        for ref in t.get("referenced_tweets") or []:
            if ref.get("type") == "retweeted" and str(ref.get("id")) == str(tweet_id):
                return True
        return False

    reposted = _scan_recent_activity(
        f"/users/{user_twitter_id}/tweets",
        matcher=_is_repost_of_target,
        access_token=access_token,
        extra_params={"tweet.fields": "referenced_tweets"},
    )

    _result_cache_set("repost", user_twitter_id, tweet_id, reposted)
    logger.info("Repost check: user %s vs tweet %s -> %s", user_twitter_id, tweet_id, reposted)
    return reposted


# ============================================================
# Reply verification (always read-based — can't auto-reply for someone)
# ============================================================

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


# ============================================================
# Error mapping for write actions
# ============================================================

def _write_failure_response(e, user, label, data=None):
    """Turn an X error from a write action into a response dict.

    403 on a write almost always means the user's token was issued BEFORE
    we asked for write scopes (or the user unticked them), so the fix is
    reconnecting. 429 is X rate limiting.
    """
    status = getattr(e, "status_code", None)

    if isinstance(e, TwitterReauthRequired) or status == 403:
        logger.warning("Write permission/auth problem for user %s (%s): %s", user.id, label, e)
        resp = {
            "success": False,
            "error": f"Reconnect your X account to let Gleyo {label} for you, then try again.",
            "reason": "twitter_reauth_required",
            "debug": str(e),
        }
    elif status == 429:
        logger.warning("X rate limit on %s for user %s: %s", label, user.id, e)
        resp = {
            "success": False,
            "error": "X is busy right now. Please try again in a minute.",
            "reason": "x_rate_limited",
            "debug": str(e),
        }
    else:
        logger.warning("X write failed (%s) for user %s: %s", label, user.id, e)
        resp = {
            "success": False,
            "error": "Unable to complete this X task right now. Please try again.",
            "reason": "x_api_error",
            "debug": str(e),
        }

    if data is not None:
        resp["data"] = data
    return resp


def check_twitter_task_for_user(user, task, reply_url=None):
    """
    Complete / verify an X/Twitter task for the user's connected X account.

    AUTO_ACTIONS on (default):
        follow         -> Gleyo follows the account as the user
        engage -> like -> Gleyo likes the post as the user
        engage -> repost -> Gleyo reposts as the user
    AUTO_ACTIONS off:
        same modes, but verified by reading the user's recent activity

    Always:
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

            # ---------------- AUTO: follow on the user's behalf ----------------
            if AUTO_ACTIONS:

                try:
                    target_user, pending = _call_with_user_context(
                        follow_account,
                        twitter,
                        user_twitter_id,
                        target_username,
                    )
                except TwitterVerificationError as e:
                    return _write_failure_response(e, user, "follow this account")

                if not target_user:
                    return {
                        "success": False,
                        "error": "The required X account could not be found.",
                        "reason": "target_account_not_found",
                    }

                return {
                    "success": True,
                    "data": {
                        "mode": "follow",
                        "target_user_id": str(target_user["id"]),
                        "target_username": target_user["username"],
                        "followed": True,
                        "pending_follow": pending,
                        "auto": True,
                    }
                }

            # ---------------- FALLBACK: verify by reading ----------------
            cached_follow = _result_cache_get("follow_check", user_twitter_id, target_username.lower())

            if cached_follow is True:
                return {
                    "success": True,
                    "data": {
                        "mode": "follow",
                        "target_username": target_username,
                        "followed": True,
                    }
                }

            if cached_follow is False:
                return {
                    "success": False,
                    "error": f"Follow @{target_username} before claiming this task.",
                    "reason": "not_following",
                }

            try:
                target_user, followed = _call_with_user_context(
                    user_follows_account,
                    twitter,
                    target_username,
                )
            except TwitterReauthRequired as e:
                logger.warning("Twitter reauth required for user %s: %s", user.id, e)
                return {
                    "success": False,
                    "error": "We couldn't verify your follow — please reconnect your X account and try again.",
                    "reason": "twitter_reauth_required",
                    "debug": str(e),
                }

            if not target_user:
                return {
                    "success": False,
                    "error": "The required X account could not be found.",
                    "reason": "target_account_not_found",
                }

            _result_cache_set("follow_check", user_twitter_id, target_username.lower(), followed)

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
                    "target_user_id": str(target_user["id"]),
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
            # LIKE
            # --------------------------------------------------------

            if config.get("like") is True:

                if AUTO_ACTIONS:

                    try:
                        _call_with_user_context(
                            like_tweet,
                            twitter,
                            user_twitter_id,
                            target_tweet_id,
                        )
                    except TwitterVerificationError as e:
                        return _write_failure_response(e, user, "like this post", data=result)

                    result["liked"] = True

                else:

                    try:
                        liked = _call_with_user_context(
                            user_liked_tweet,
                            twitter,
                            user_twitter_id,
                            target_tweet_id,
                        )
                    except TwitterReauthRequired as e:
                        logger.warning("Twitter reauth required for user %s: %s", user.id, e)
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
            # REPOST
            # --------------------------------------------------------

            if config.get("retweet") is True:

                if AUTO_ACTIONS:

                    try:
                        _call_with_user_context(
                            retweet_tweet,
                            twitter,
                            user_twitter_id,
                            target_tweet_id,
                        )
                    except TwitterVerificationError as e:
                        return _write_failure_response(e, user, "repost this post", data=result)

                    result["reposted"] = True

                else:

                    try:
                        reposted = _call_with_user_context(
                            user_reposted_tweet,
                            twitter,
                            user_twitter_id,
                            target_tweet_id,
                        )
                    except TwitterReauthRequired as e:
                        logger.warning("Twitter reauth required for user %s: %s", user.id, e)
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
            # REPLY — user pastes their reply link, 1 read to verify
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
                    logger.warning("Twitter reauth required for user %s: %s", user.id, e)
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

        logger.exception("X verification failed")

        return {
            "success": False,
            "error": "Unable to verify this X task right now. Please try again.",
            "reason": "x_api_error",
            "debug": str(e),
        }

    except requests.RequestException:

        logger.exception("X API request failed")

        return {
            "success": False,
            "error": "X verification is temporarily unavailable. Please try again.",
            "reason": "x_network_error",
        }