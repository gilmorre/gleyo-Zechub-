# discordOauth.py
# ---------------------------------------------------------------------------
# Tiny helper module that does ONLY the Discord OAuth heavy-lifting.
#
#  ▸ build_auth_url(state)         → full https://discord.com/api/oauth2/authorize?...
#  ▸ exchange_code(code)           → JSON with access_token, expires_in, refresh_token…
#  ▸ fetch_current_user(token)     → JSON for the logged-in Discord account
#
# Put your DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / REDIRECT_URI
# in environment variables before you run app.py, e.g.
#   export DISCORD_CLIENT_ID="1383809370877464636"
#   export DISCORD_CLIENT_SECRET="a0XJ1Kl_dQ8h3idiRQzEgZTeH-ptbLEF"
#   export DISCORD_REDIRECT_URI="http://localhost:8000/callback"
# ---------------------------------------------------------------------------

import os
import urllib.parse
import requests

# ----- config pulled from env-vars -----------------------------------------
CLIENT_ID = "1383809370877464636"
CLIENT_SECRET = "a0XJ1Kl_dQ8h3idiRQzEgZTeH-ptbLEF"
REDIRECT_URI = "http://localhost:8000/callback"
SCOPE         = "identify email"

_AUTH_URL  = "https://discord.com/api/oauth2/authorize"
_TOKEN_URL = "https://discord.com/api/oauth2/token"
_ME_URL    = "https://discord.com/api/users/@me"


# ----- public helpers -------------------------------------------------------
def build_auth_url(state: str) -> str:
    """Return the Discord /authorize URL you should redirect the user to."""
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "state": state,
        "prompt": "consent",
    }
    return f"{_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_code(code: str) -> dict:
    """
    Swap the ?code=... you get from Discord for an access token.
    Raises requests.HTTPError on failure so you can .catch() it in app.py
    """
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    r = requests.post(
        _TOKEN_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()        # has keys: access_token, expires_in, refresh_token, scope, token_type


def fetch_current_user(access_token: str) -> dict:
    """
    Call /users/@me with the Bearer token and return Discord account JSON.
    """
    r = requests.get(
        _ME_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()        # keys: id, username, discriminator, avatar, email (if scope includes email)