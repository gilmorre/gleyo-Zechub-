import os
import secrets
import uuid

import requests
from dotenv import load_dotenv
from flask import Blueprint, redirect, url_for, session, request, flash
from flask_login import login_user, current_user
from requests_oauthlib import OAuth2Session
from supabase import create_client
from werkzeug.utils import secure_filename

from backend.models.models import Users
from backend.utils.utils import create_user_session
from backend.utils.instance import db

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO = "https://www.googleapis.com/oauth2/v1/userinfo"
SCOPE = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

NO_ACCOUNT_MSG = "No account found with this email."

google_bp = Blueprint("google_bp", __name__)


def _oauth(state=None, token=None):
    return OAuth2Session(
        client_id=GOOGLE_CLIENT_ID,
        state=state,
        token=token,
        scope=SCOPE,
        redirect_uri=GOOGLE_REDIRECT_URI,
        auto_refresh_kwargs={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
        },
        auto_refresh_url=TOKEN_URL,
        token_updater=lambda t: session.__setitem__("google_token", t),
    )


def upload_google_avatar(user, picture_url):
    try:
        r = requests.get(picture_url, timeout=10)
        r.raise_for_status()

        ext = secure_filename(picture_url.split("?")[0]).rsplit(".", 1)[-1].lower()
        if ext not in {"png", "jpg", "jpeg", "webp"}:
            ext = "jpg"

        storage_name = f"users/{user.id}/avatar/{uuid.uuid4()}.{ext}"

        supabase.storage.from_("uploads").upload(
            storage_name,
            r.content,
            {
                "content-type": r.headers.get("content-type", "image/jpeg"),
                "cache-control": "3600",
            },
        )

        return supabase.storage.from_("uploads").get_public_url(storage_name)
    except Exception as e:
        print("Failed to upload Google avatar:", e)
        return None


@google_bp.route("/google-login")
def login_goggle():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard"))

    state = secrets.token_urlsafe(16)
    session["google_state"] = state

    google = _oauth(state=state)
    auth_url, _ = google.authorization_url(
        AUTH_URL,
        access_type="offline",
        prompt="select_account",
    )

    return redirect(auth_url)


@google_bp.route("/google-callback")
def callback():
    if "error" in request.args:
        flash("Google sign-in was cancelled.", "error")
        return redirect(url_for("login"))

    saved_state = session.pop("google_state", None)
    google = _oauth(state=saved_state)

    try:
        google.fetch_token(
            TOKEN_URL,
            client_secret=GOOGLE_CLIENT_SECRET,
            authorization_response=request.url,
        )
        resp = google.get(USERINFO)
    except Exception as e:
        print("Google token error:", e)
        flash("Google sign-in failed. Please try again.", "error")
        return redirect(url_for("login"))

    if not resp.ok:
        flash("Couldn't fetch your Google profile.", "error")
        return redirect(url_for("login"))

    profile = resp.json()
    email = (profile.get("email") or "").strip().lower()
    picture = profile.get("picture")

    if not email:
        flash("Google didn't return an email address.", "error")
        return redirect(url_for("login"))

    user = Users.query.filter_by(email=email).first()

    if not user:
        flash(NO_ACCOUNT_MSG, "no_account")
        return redirect(url_for("login"))

    if user.deletion_requested_at:
        session.clear()
        flash("This account is scheduled for deletion and cannot be accessed.", "error")
        return redirect(url_for("login"))

    if picture and not user.profile_pic:
        avatar_url = upload_google_avatar(user, picture)
        if avatar_url:
            user.profile_pic = avatar_url
            db.session.commit()

    login_user(user, remember=True)
    create_user_session(user)

    session["user_id"] = user.id
    session["username"] = user.username
    session["email"] = user.email
    session["profile_pic"] = user.profile_pic
    session["google_connected"] = True

    flash(f"Logged in via Google as {user.username}", "success")
    next_url = session.pop("next", None)
    return redirect(next_url or url_for("dashboard"))