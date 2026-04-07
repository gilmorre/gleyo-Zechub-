from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from flask import Blueprint, jsonify, session
from instance import db
from useryoutube import UserYouTube
from flask import request
from task_models import Task  
def is_ajax():
    return request.headers.get("X-Requested-With") == "XMLHttpRequest"
bp = Blueprint("youtube", __name__)

def extract_channel_id(channel_url: str) -> str:
    """
    Extracts the channelId from different YouTube URL formats.
    Supports /channel/UCxxxx and @handle (for handles you might need to resolve via YouTube API).
    """
    import re
    if "/channel/" in channel_url:
        return channel_url.split("/channel/")[-1].split("/")[0]
    if "@" in channel_url:
        # TODO: Use YouTube API 'channels.list' with forUsername/handle to resolve → UCxxxx
        return None
    return None


@bp.route("/check_youtube/<int:task_id>", methods=["POST"])
def check_youtube(task_id):
    user_id = session.get("user_id")
    if not user_id:
        return jsonify(success=False, error="Login required")

    yt_conn = (
        UserYouTube.query.filter_by(user_id=user_id, action="connected")
        .order_by(UserYouTube.timestamp.desc())
        .first()
    )
    if not yt_conn:
        return jsonify(success=False, error="Connect your YouTube first")

    task = Task.query.get(task_id)
    if not task or not task.config or "link" not in task.config:
        return jsonify(success=False, error="Invalid YouTube task")

    channel_id = extract_channel_id(task.config["link"])
    if not channel_id:
        return jsonify(success=False, error="Unsupported YouTube link format")

    creds = Credentials(
        token=yt_conn.access_token,
        refresh_token=yt_conn.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id="YOUR_CLIENT_ID",
        client_secret="YOUR_CLIENT_SECRET",
    )

    try:
        youtube = build("youtube", "v3", credentials=creds)
        subs = youtube.subscriptions().list(
            part="snippet",
            mine=True,
            forChannelId=channel_id
        ).execute()

        if subs.get("items"):
            return jsonify(success=True)
        else:
            return jsonify(success=False, error="Subscribe to the channel to claim this task")

    except Exception as e:
        print("YouTube check error:", e)
        return jsonify(success=False, error="YouTube check failed")