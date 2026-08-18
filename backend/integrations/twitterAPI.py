import os
import time
import math
import secrets
import hashlib
import base64
import urllib.parse
import requests
import logging
import json
import re
from datetime import datetime, timedelta

from flask import Blueprint, session, redirect, url_for, request, flash, jsonify
from flask_login import login_required, current_user

from backend.utils.instance import db
from backend.models.models import Users
from backend.auth.usertwitter import UserTwitter

logger = logging.getLogger(__name__)
twitter_bp = Blueprint("twitter", __name__)

# ─── Config ─────────────────────────────────────────────

TWITTER_API_BASE = "https://api.twitter.com/2"
BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN") 

USER_FIELDS = "profile_image_url,verified,verified_type"
TWEET_FIELDS = "created_at,author_id"
SPACE_FIELDS = "title,state,scheduled_start,started_at,host_ids"

CLIENT_ID     = os.getenv("TWITTER_CLIENT_ID")
CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")
REDIRECT_URI  = os.getenv("TWITTER_REDIRECT_URI")

SCOPES = ["tweet.read", "users.read", "like.read", "offline.access"]

AUTH_URL  = "https://twitter.com/i/oauth2/authorize"
TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
ME_URL    = "https://api.twitter.com/2/users/me?user.fields=username"

_CACHE = {}
CACHE_TTL = {
    "profile": 300,
    "tweet": 300,
    "space": 60,
}

_KNOWN_VERIFIED_TYPES = {"blue", "business", "government", "none"}


def _normalize_verified_type(raw, is_verified_flag):
    if raw:
        val = str(raw).strip().lower()
        if val in _KNOWN_VERIFIED_TYPES:
            return val
        return "blue" if is_verified_flag else None
    if is_verified_flag:
        return "blue"
    return "none"


# ─── PKCE helpers ──────────────────────────────────────
def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


def _new_state() -> str:
    return secrets.token_urlsafe(24)


def _basic_auth_header():
    """
    X apps registered as Confidential clients (the default for
    server-side apps) require HTTP Basic auth with client_id:client_secret
    on token requests. Falls back to None if no secret is configured
    (public client) — callers put client_id in the body instead.
    """
    if not CLIENT_SECRET:
        return None
    raw = f"{CLIENT_ID}:{CLIENT_SECRET}".encode()
    return "Basic " + base64.b64encode(raw).decode()


# ─── OAuth helpers ──────────────────────────────────────
def build_authorize_url(sess) -> str:
    code_verifier, code_challenge = _pkce_pair()
    sess["tw_code_verifier"] = code_verifier
    state = _new_state()
    sess["tw_state"] = state

    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return AUTH_URL + "?" + urllib.parse.urlencode(params)


def exchange_code_for_token(code: str, code_verifier: str) -> dict:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "code_verifier": code_verifier,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    basic = _basic_auth_header()
    if basic:
        headers["Authorization"] = basic
    else:
        data["client_id"] = CLIENT_ID

    resp = requests.post(TOKEN_URL, data=data, headers=headers, timeout=20)
    if not resp.ok:
        raise RuntimeError(f"Token error {resp.status_code}: {resp.text}")
    return resp.json()


def fetch_current_user(access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(ME_URL, headers=headers, timeout=15)
    if not resp.ok:
        raise RuntimeError(f"/users/me error {resp.status_code}: {resp.text}")
    return resp.json()["data"]


# ─── Routes: OAuth ─────────────────────────────────────────────
@twitter_bp.route("/twitter-login")
@login_required
def twitter_login():
    try:
        next_url = request.args.get("next") or request.referrer or url_for("account_settings_linked_accounts")
        session["tw_post_login_redirect"] = next_url

        auth_url = build_authorize_url(session)
        return redirect(auth_url)
    except Exception as e:
        flash(f"Failed to start Twitter login: {e}", "error")
        return redirect(url_for("account_settings_linked_accounts"))


@twitter_bp.route("/twitter-callback")
def twitter_callback():
    logger.debug("Twitter callback triggered. Args: %s", dict(request.args))

    fallback_url = url_for("account_settings_linked_accounts")
    next_url = session.pop("tw_post_login_redirect", None) or fallback_url

    if "error" in request.args:
        error = request.args.get("error")
        desc  = request.args.get("error_description")
        logger.error("Twitter OAuth error: %s (%s)", error, desc)
        flash(f"Twitter authorization failed: {desc or error}", "error")
        return redirect(next_url)

    state = request.args.get("state")
    saved_state = session.pop("tw_state", None)
    if not state or not saved_state or state != saved_state:
        logger.warning("Invalid state in Twitter callback")
        flash("Invalid OAuth state. Please try again.", "error")
        return redirect(next_url)

    code = request.args.get("code")
    code_verifier = session.pop("tw_code_verifier", None)
    if not code or not code_verifier:
        flash("Invalid callback payload. Please try again.", "error")
        return redirect(next_url)

    try:
        token_json = exchange_code_for_token(code, code_verifier)

        access_token  = token_json.get("access_token")
        refresh_token = token_json.get("refresh_token")
        token_type    = token_json.get("token_type")

        if not access_token:
            raise RuntimeError(f"No access_token in response: {token_json}")

        me = fetch_current_user(access_token)

        twitter_id       = me["id"]
        twitter_username = me["username"]

    except Exception as e:
        logger.exception("Twitter login failed")
        flash(f"Twitter login failed: {e}", "error")
        return redirect(next_url)

    user_id = current_user.id if current_user.is_authenticated else None
    user = Users.query.get(user_id)
    if not user:
        flash("User not found.", "error")
        return redirect(next_url)

    existing = UserTwitter.query.filter_by(
        twitter_user_id=twitter_id, action="connected"
    ).first()
    if existing and existing.user_id != user.id:
        linked_user = Users.query.get(existing.user_id)
        linked_email = linked_user.email if linked_user else "another user"
        flash(f"Twitter account already used by {linked_email}", "error")
        return redirect(next_url)

    user_tw = UserTwitter.query.filter_by(
        user_id=user.id, twitter_user_id=twitter_id
    ).first()
    if not user_tw:
        user_tw = UserTwitter(
            user_id=user.id,
            twitter_user_id=twitter_id,
            xusername=twitter_username,
            action="connected",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type
        )
        db.session.add(user_tw)
    else:
        user_tw.xusername = twitter_username
        user_tw.access_token = access_token
        user_tw.refresh_token = refresh_token
        user_tw.token_type = token_type
        user_tw.action = "connected"

    db.session.commit()

    session["twitter_connected"] = True
    session["twitter_username"] = twitter_username

    flash(f"Connected Twitter @{twitter_username}", "success")
    return redirect(next_url)


@twitter_bp.route("/twitter-disconnect")
@login_required
def twitter_disconnect():
    user_tw = UserTwitter.query.filter_by(
        user_id=current_user.id,
        action="connected"
    ).first()

    if user_tw:
        user_tw.action = "disconnected"
        user_tw.access_token = None
        user_tw.refresh_token = None
        db.session.commit()

        session.pop("twitter_connected", None)
        session.pop("twitter_username", None)

        return jsonify({"success": True, "message": "Twitter disconnected"})

    return jsonify({"success": False, "message": "No connected Twitter account found"}), 400


@twitter_bp.route("/debug-session")
def debug_session():
    return {
        "flask_login_user": current_user.get_id(),
        "twitter_connected": session.get("twitter_connected"),
        "twitter_username": session.get("twitter_username"),
    }


def refresh_access_token(user_tw: UserTwitter) -> bool:
    if not user_tw.refresh_token:
        logger.warning(f"No refresh_token stored for {user_tw.xusername} — cannot refresh.")
        return False

    data = {
        "grant_type": "refresh_token",
        "refresh_token": user_tw.refresh_token,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    basic = _basic_auth_header()
    if basic:
        headers["Authorization"] = basic
    else:
        data["client_id"] = CLIENT_ID

    try:
        resp = requests.post(TOKEN_URL, data=data, headers=headers, timeout=10)

        if not resp.ok:
            # Log X's actual error body instead of swallowing it —
            # this is what tells us WHY the refresh failed
            # (invalid_client, invalid_grant, unauthorized_client, etc.)
            logger.warning(
                "Twitter refresh failed for %s -> HTTP %s: %s",
                user_tw.xusername, resp.status_code, resp.text[:500]
            )
            resp.raise_for_status()

        tokens = resp.json()

        user_tw.access_token = tokens.get("access_token")
        user_tw.refresh_token = tokens.get("refresh_token", user_tw.refresh_token)
        db.session.commit()
        return True
    except requests.RequestException as e:
        logger.warning(f"Failed to refresh Twitter token for {user_tw.xusername}: {e}")
        return False


def get_live_followers_count(user_tw: UserTwitter) -> int:
    """Kept as-is for OAuth-linked accounts (needs that user's own access_token)."""
    if not user_tw:
        return 0

    now = datetime.utcnow()
    if user_tw.followers_last_checked and (now - user_tw.followers_last_checked) < timedelta(minutes=5):
        return user_tw.last_followers_count or 0

    if not user_tw.access_token:
        if not refresh_access_token(user_tw):
            return user_tw.last_followers_count or 0

    url = f"https://api.twitter.com/2/users/{user_tw.twitter_user_id}?user.fields=public_metrics"
    headers = {"Authorization": f"Bearer {user_tw.access_token}"}

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 401:
            if refresh_access_token(user_tw):
                headers["Authorization"] = f"Bearer {user_tw.access_token}"
                resp = requests.get(url, headers=headers, timeout=10)

        resp.raise_for_status()
        data = resp.json()
        followers_count = data.get("data", {}).get("public_metrics", {}).get("followers_count", 0)

        user_tw.last_followers_count = followers_count
        user_tw.followers_last_checked = now
        db.session.commit()

        return followers_count
    except requests.RequestException as e:
        logger.warning(f"Error fetching Twitter followers for {user_tw.xusername}: {e}")
        return user_tw.last_followers_count or 0


# ─── Cache helpers ──────────────────────────────────────

def _cache_get(kind, key):
    entry = _CACHE.get((kind, key))
    if not entry:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        _CACHE.pop((kind, key), None)
        return None
    return value


def _cache_set(kind, key, value):
    _CACHE[(kind, key)] = (value, time.time() + CACHE_TTL[kind])


# ─── URL PARSING ────────────────────────────────────────

_HANDLE_RE = re.compile(r"(?:twitter\.com|x\.com)/([A-Za-z0-9_]{1,15})/?(?:\?.*)?$")
_TWEET_RE = re.compile(r"(?:twitter\.com|x\.com)/[A-Za-z0-9_]{1,15}/status/(\d+)")
_SPACE_RE = re.compile(r"(?:twitter\.com|x\.com)/i/spaces/([A-Za-z0-9]+)")

_RESERVED_PATH_SEGMENTS = {"i", "home", "explore", "notifications", "messages", "settings"}


def extract_handle(url):
    match = _HANDLE_RE.search(url)
    if not match:
        return None
    handle = match.group(1)
    if handle.lower() in _RESERVED_PATH_SEGMENTS:
        return None
    return handle


def extract_tweet_id(url):
    match = _TWEET_RE.search(url)
    return match.group(1) if match else None


def extract_space_id(url):
    match = _SPACE_RE.search(url)
    return match.group(1) if match else None


class TwitterAPIError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def _fallback_avatar(handle_or_id):
    return f"https://unavatar.io/twitter/{handle_or_id}"


_SYNDICATION_UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json",
}


def _syndication_profile(handle):
    url = "https://cdn.syndication.twimg.com/widgets/followbutton/info.json"
    resp = requests.get(url, params={"screen_names": handle}, headers=_SYNDICATION_UA, timeout=10)
    if not resp.ok:
        logger.warning("syndication profile @%s -> HTTP %s: %s", handle, resp.status_code, resp.text[:300])
        return None
    try:
        data = resp.json()
    except ValueError:
        logger.warning("syndication profile @%s -> non-JSON response: %s", handle, resp.text[:300])
        return None
    if not data:
        logger.warning("syndication profile @%s -> empty payload", handle)
        return None
    logger.debug("syndication profile @%s raw -> %s", handle, data[0])
    return data[0]


def _tweet_token(tweet_id: str) -> str:
    n = int(tweet_id) / 1e15 * math.pi
    int_part = int(n)
    frac = n - int_part

    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if int_part == 0:
        int_str = "0"
    else:
        chars = []
        x = int_part
        while x:
            x, r = divmod(x, 36)
            chars.append(digits[r])
        int_str = "".join(reversed(chars))

    frac_chars = []
    f = frac
    for _ in range(20):
        f *= 36
        d = int(f)
        frac_chars.append(digits[d])
        f -= d
    frac_str = "".join(frac_chars)

    token = f"{int_str}.{frac_str}"
    return re.sub(r"(0+|\.)", "", token)


def _syndication_tweet(tweet_id):
    url = "https://cdn.syndication.twimg.com/tweet-result"
    params = {"id": tweet_id, "lang": "en", "token": _tweet_token(tweet_id)}
    resp = requests.get(url, params=params, headers=_SYNDICATION_UA, timeout=10)
    if not resp.ok:
        logger.warning("syndication tweet %s -> HTTP %s: %s", tweet_id, resp.status_code, resp.text[:300])
        return None
    try:
        data = resp.json()
    except ValueError:
        logger.warning("syndication tweet %s -> non-JSON response: %s", tweet_id, resp.text[:300])
        return None
    if not data or "text" not in data:
        logger.warning("syndication tweet %s -> unusable payload: %s", tweet_id, data)
        return None
    return data


_OG_TAG_RE = re.compile(
    r'<meta[^>]+property=["\'](og:[a-z:]+)["\'][^>]+content=["\']([^"\']*)["\']',
    re.IGNORECASE,
)


_CRAWLER_UAS = [
    {
        "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
        "Accept": "text/html",
    },
    {
        "User-Agent": "Twitterbot/1.0",
        "Accept": "text/html",
    },
]

_META_TAG_RE = re.compile(r'<meta\s+[^>]*>', re.IGNORECASE)
_ATTR_RE = re.compile(r'([\w:-]+)\s*=\s*["\']([^"\']*)["\']')

def _fetch_og_tags(handle_or_url, is_handle=False):
    domains = ["https://twitter.com/", "https://x.com/"] if is_handle else [None]

    for domain in domains:
        target = f"{domain}{handle_or_url}" if domain else handle_or_url
        for ua in _CRAWLER_UAS:
            try:
                resp = requests.get(target, headers=ua, timeout=10, allow_redirects=True)
            except requests.RequestException as e:
                logger.warning(f"OG scrape request failed for {target} ({ua['User-Agent']}): {e}")
                continue
            if not resp.ok:
                continue

            tags = {}
            for meta_tag in _META_TAG_RE.findall(resp.text):
                attrs = dict(_ATTR_RE.findall(meta_tag))
                key = attrs.get("property") or attrs.get("name")
                content = attrs.get("content")
                if key and content and (key.startswith("og:") or key.startswith("twitter:")):
                    tags[key] = content

            if tags:
                return tags
    return {}


_SCHEDULED_HINT_RE = re.compile(
    r'\b(today|tomorrow|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b'
    r'.{0,15}?\d{1,2}:\d{2}\s*[AaPp][Mm]',
    re.IGNORECASE,
)

def _detect_space_state(description):
    if not description:
        return False, None

    desc_lower = description.lower()

    scheduled_match = _SCHEDULED_HINT_RE.search(description)
    if scheduled_match:
        return False, scheduled_match.group(0)

    strong_live_markers = ["🔴", "is live", "live now", "currently talking"]
    is_live = any(m in desc_lower for m in strong_live_markers)

    return is_live, None

# ────────────────────────────────
# 1) PROFILE (Follow task) — LIVE, no bearer token
# ────────────────────────────────
@twitter_bp.route("/api/social/twitter/profile")
def twitter_profile():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "bad url"}), 400

    handle = extract_handle(url)
    if not handle:
        return jsonify({"error": "could not parse a Twitter/X handle from that URL"}), 400

    cached = _cache_get("profile", handle.lower())
    if cached:
        return jsonify(cached)

    syn_result = None
    try:
        profile = _syndication_profile(handle)
        if profile:
            raw_verified_type = profile.get("verified_type")
            legacy_verified_flag = bool(profile.get("verified"))
            verified_type = _normalize_verified_type(raw_verified_type, legacy_verified_flag)
            syn_result = {
                "name": profile.get("name"),
                "handle": profile.get("screen_name", handle),
                "avatar": profile.get("profile_image_url"),
                "verified_type": verified_type,
                "verified": bool(verified_type) and verified_type != "none",
            }
    except Exception as e:
        logger.warning(f"Syndication profile lookup failed for @{handle}: {e}")

    need_og = syn_result is None or not syn_result.get("name") or not syn_result.get("avatar")
    og_tags = _fetch_og_tags(handle, is_handle=True) if need_og else {}

    og_name = None
    if og_tags.get("og:title"):
        m = re.match(r"^(.*)\s\(@", og_tags["og:title"])
        og_name = m.group(1) if m else og_tags["og:title"]

    if syn_result:
        result = {
            "name": syn_result["name"] or og_name,
            "handle": syn_result["handle"],
            "avatar": syn_result["avatar"] or og_tags.get("og:image") or _fallback_avatar(handle),
            "verified_type": syn_result["verified_type"],
            "verified": syn_result["verified"],
        }
    else:
        result = {
            "name": og_name,
            "handle": handle,
            "avatar": og_tags.get("og:image") or _fallback_avatar(handle),
            "verified": None,
            "verified_type": None,
        }

    if not result.get("name") and not result.get("avatar"):
        return jsonify({"error": "profile not found"}), 404

    _cache_set("profile", handle.lower(), result)
    return jsonify(result)

# ────────────────────────────────
# 2) TWEET (Like/Retweet/Reply task) — LIVE, no bearer token
# ────────────────────────────────
@twitter_bp.route("/api/social/twitter/tweet")
def twitter_tweet():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "bad url"}), 400

    tweet_id = extract_tweet_id(url)
    if not tweet_id:
        return jsonify({"error": "could not parse a tweet ID from that URL"}), 400

    cached = _cache_get("tweet", tweet_id)
    if cached:
        return jsonify(cached)

    result = None

    try:
        tweet = _syndication_tweet(tweet_id)
        if tweet:
            user = tweet.get("user") or {}
            raw_verified_type = user.get("verified_type")
            legacy_verified_flag = bool(user.get("verified") or user.get("is_blue_verified"))
            verified_type = _normalize_verified_type(raw_verified_type, legacy_verified_flag)
            result = {
                "text": tweet.get("text"),
                "author": user.get("name"),
                "handle": user.get("screen_name"),
                "avatar": user.get("profile_image_url_https") or _fallback_avatar(user.get("screen_name", tweet_id)),
                "verified_type": verified_type,
                "verified": bool(verified_type) and verified_type != "none",
                "created_at": tweet.get("created_at"),
            }
    except Exception as e:
        logger.warning(f"Syndication tweet lookup failed for {tweet_id}: {e}")

    if result is None:
        tags = _fetch_og_tags(url if url.startswith("http") else f"https://{url}")
        title = tags.get("og:title", "")
        m = re.match(r"^(.*)\son (?:X|Twitter)", title)
        author = m.group(1) if m else None
        result = {
            "text": tags.get("og:description"),
            "author": author,
            "handle": None,
            "avatar": tags.get("og:image") or _fallback_avatar(tweet_id),
            "verified": None,
            "verified_type": None,
            "created_at": None,
        }

    if not result.get("text"):
        return jsonify({"error": "tweet not found"}), 404

    _cache_set("tweet", tweet_id, result)
    return jsonify(result)


# ────────────────────────────────
# 3) SPACE
# ────────────────────────────────
_HOST_HANDLE_RE = re.compile(r"(?:hosted by|host:?)\s*@?([A-Za-z0-9_]{1,15})", re.IGNORECASE)
_AT_HANDLE_RE = re.compile(r"@([A-Za-z0-9_]{1,15})")

def _clean_space_avatar(avatar_url, fallback_seed):
    if not avatar_url or ".svg" in avatar_url.lower() or "card_img" in avatar_url.lower():
        return _fallback_avatar(fallback_seed)
    return avatar_url


_HOST_POSSESSIVE_RE = re.compile(r"^(.*?)[\u2019']s\s+Space\b", re.IGNORECASE)


def _candidate_handles_from_name(name):
    stripped = re.sub(r"[^A-Za-z0-9]", "", name)
    return [stripped] if stripped else []


def _names_roughly_match(a, b):
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    a, b = norm(a), norm(b)
    return bool(a and b) and (a == b or a in b or b in a)


def _fetch_space_via_api(space_id):
    if not BEARER_TOKEN:
        return None

    headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
    params = {
        "space.fields": SPACE_FIELDS,
        "expansions": "host_ids",
        "user.fields": USER_FIELDS,
    }

    try:
        resp = requests.get(
            f"{TWITTER_API_BASE}/spaces/{space_id}",
            params=params, headers=headers, timeout=10,
        )
    except requests.RequestException as e:
        logger.warning("Space API request failed for %s: %s", space_id, e)
        return None

    if resp.status_code == 402:
        logger.warning("Space API credits depleted for %s, falling back to scrape", space_id)
        return None
    if resp.status_code == 401:
        logger.warning("Space API auth error for %s — check TWITTER_BEARER_TOKEN", space_id)
        return None
    if not resp.ok:
        logger.warning("Space API error %s for %s: %s", resp.status_code, space_id, resp.text[:300])
        return None

    payload = resp.json()
    logger.info("Space API raw response for %s: %s", space_id, json.dumps(payload))

    space = payload.get("data")
    if not space:
        logger.warning("Space API empty data for %s: %s", space_id, payload)
        return None

    host_user = None
    users = (payload.get("includes") or {}).get("users") or []
    host_ids = space.get("host_ids") or []
    if users and host_ids:
        host_user = next((u for u in users if u.get("id") == host_ids[0]), users[0])
    elif users:
        host_user = users[0]

    host_verified = None
    verified_type = None
    if host_user:
        raw_vtype = host_user.get("verified_type")
        verified_type = raw_vtype if raw_vtype in _KNOWN_VERIFIED_TYPES else _normalize_verified_type(
            raw_vtype, bool(host_user.get("verified"))
        )
        host_verified = bool(verified_type) and verified_type != "none"

    state = space.get("state")

    return {
        "title": space.get("title"),
        "host_name": host_user.get("name") if host_user else None,
        "host_handle": host_user.get("username") if host_user else None,
        "host_avatar": host_user.get("profile_image_url") if host_user else None,
        "host_verified": host_verified,
        "verified_type": verified_type,
        "is_live": state == "live",
        "scheduled_start": space.get("scheduled_start"),
        "scheduled_label": None,
        "description": None,
        "source": "api",
    }



@twitter_bp.route("/api/social/twitter/space")
def twitter_space():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "bad url"}), 400

    space_id = extract_space_id(url)
    if not space_id:
        return jsonify({"error": "could not parse a Space ID from that URL"}), 400

    cached = _cache_get("space", space_id)
    if cached:
        return jsonify(cached)

    result = _fetch_space_via_api(space_id)

    if result is None:
        target_url = url if url.startswith("http") else f"https://{url}"
        tags = _fetch_og_tags(target_url)
        if not tags:
            logger.warning("SPACE DEBUG %s -> no og/twitter tags found at all for %s", space_id, target_url)
            return jsonify({"error": "space not found"}), 404

        raw_title = tags.get("og:title", "")
        description = tags.get("og:description", "")
        clean_title = re.sub(r"^(Scheduled:|LIVE:?)\s*", "", raw_title, flags=re.IGNORECASE)
        clean_title = re.sub(r"\s*/\s*X$", "", clean_title).strip()

        host_handle = None
        host_display_name = None
        tw_creator = tags.get("twitter:creator") or tags.get("twitter:site")
        if tw_creator:
            host_handle = tw_creator.lstrip("@").strip() or None
        possessive_match = _HOST_POSSESSIVE_RE.search(description)
        if possessive_match:
            host_display_name = possessive_match.group(1).strip()
        if not host_handle:
            host_match = _HOST_HANDLE_RE.search(description) or _HOST_HANDLE_RE.search(raw_title)
            if host_match:
                host_handle = host_match.group(1)
            else:
                any_handle = _AT_HANDLE_RE.search(description) or _AT_HANDLE_RE.search(raw_title)
                if any_handle:
                    host_handle = any_handle.group(1)

        host_name = None
        host_avatar = None
        host_verified = None
        verified_type = None

        if host_handle:
            try:
                profile = _syndication_profile(host_handle)
                if profile:
                    host_name = profile.get("name")
                    host_avatar = profile.get("profile_image_url")
                    raw_vtype = profile.get("verified_type")
                    legacy_vflag = bool(profile.get("verified"))
                    verified_type = _normalize_verified_type(raw_vtype, legacy_vflag)
                    host_verified = bool(verified_type) and verified_type != "none"
            except Exception as e:
                logger.warning(f"SPACE DEBUG {space_id} -> syndication lookup failed for @{host_handle}: {e}")

        if not host_name and host_display_name:
            for candidate in _candidate_handles_from_name(host_display_name):
                try:
                    profile = _syndication_profile(candidate)
                except Exception as e:
                    logger.warning(f"SPACE DEBUG {space_id} -> guessed handle @{candidate} lookup failed: {e}")
                    profile = None
                if profile and _names_roughly_match(profile.get("name", ""), host_display_name):
                    host_handle = profile.get("screen_name", candidate)
                    host_name = profile.get("name")
                    host_avatar = profile.get("profile_image_url")
                    raw_vtype = profile.get("verified_type")
                    legacy_vflag = bool(profile.get("verified"))
                    verified_type = _normalize_verified_type(raw_vtype, legacy_vflag)
                    host_verified = bool(verified_type) and verified_type != "none"
                    break

        if not host_name and host_display_name:
            host_name = host_display_name

        raw_og_image = tags.get("og:image")
        final_avatar = host_avatar or _clean_space_avatar(raw_og_image, host_handle or space_id)
        is_live, scheduled_label = _detect_space_state(description)

        result = {
            "title": clean_title or raw_title,
            "host_name": host_name,
            "host_handle": host_handle,
            "host_avatar": final_avatar,
            "host_verified": host_verified,
            "verified_type": verified_type,
            "is_live": is_live,
            "scheduled_start": None,
            "scheduled_label": scheduled_label,
            "description": description,
            "source": "scrape",
        }

    _cache_set("space", space_id, result)
    return jsonify(result)