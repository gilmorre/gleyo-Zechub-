import requests
import os, json, time
from backend.communities.communitynotification import CommunityNotificationSettings, PushSubscription, CategoryNotificationSettings, ChannelNotificationSettings
from backend.communities.community_models import Community
from backend.communities.CommunityUserRole_models import CommunityUserRole
from backend.models.models import Users
from backend.utils.image_utils import compress_image
from pywebpush import webpush, WebPushException
from backend.utils.instance import db
from flask import current_app
from concurrent.futures import ThreadPoolExecutor
import resend
from email.message import EmailMessage
import smtplib


# -------START------
# Generated with:
# npx web-push generate-vapid-keys
# Public key goes in the frontend service worker setup,
# private key stays server-side and must be kept secret.
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
# -------END-------
SUPABASE_URL = os.getenv("SUPABASE_URL")
EMAIL_USER = os.getenv("SMTP_USERNAME")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY

# Separate pools so a slow push-notification batch (which loops through
# every subscriber synchronously inside one worker) can't starve or queue
# behind avatar/file uploads, and vice versa.
upload_executor = ThreadPoolExecutor(max_workers=5)
push_executor = ThreadPoolExecutor(max_workers=5)
email_executor = ThreadPoolExecutor(max_workers=5)


def _upload_single(file_bytes, storage_name, content_type, max_retries=5):
    print("🚀 Upload started:", storage_name)

    url = f"{SUPABASE_URL}/storage/v1/object/uploads/{storage_name}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type
    }

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            res = requests.post(
                url,
                headers=headers,
                data=file_bytes,
                timeout=30
            )

            if res.status_code >= 300:
                print(f"❌ Upload failed (attempt {attempt}):", res.text)
                last_error = Exception(res.text)
                # Backoff before retrying — a bare retry with no delay just
                # re-hits the same transient network/server issue immediately.
                time.sleep(min(2 ** attempt, 15))
                continue

            print("✅ Upload finished:", storage_name)
            return f"{SUPABASE_URL}/storage/v1/object/public/uploads/{storage_name}"

        except requests.exceptions.Timeout as e:
            print(f"⏱️ Upload timed out (attempt {attempt}):", e)
            last_error = e
            time.sleep(min(2 ** attempt, 15))
            continue

        except requests.exceptions.ConnectionError as e:
            # Covers ConnectionResetError ("connection aborted") — usually a
            # transient network blip or the remote host closing the socket
            # mid-request. A short backoff gives it time to clear before
            # hammering the same request again.
            print(f"🔌 Connection error (attempt {attempt}):", e)
            last_error = e
            time.sleep(min(2 ** attempt, 15))
            continue

        except Exception as e:
            print(f"💥 Upload error (attempt {attempt}):", e)
            last_error = e
            time.sleep(min(2 ** attempt, 15))
            continue

    raise last_error


def _prepare_upload(file_bytes, storage_name, content_type, max_dimension=800):
    """
    If this is an image upload, resize/compress it before sending — cuts
    upload time significantly (large originals can shrink 10x+ with no
    visible quality loss) with zero changes needed in the calling route.
    Non-image uploads (or anything that fails to parse as an image) pass
    through unchanged.

    max_dimension defaults to 800 here as a general-purpose size suitable
    for most in-app images (avatars, thumbnails, banners). Callers with
    stricter size needs (e.g. a tiny avatar) can still pre-resize before
    calling upload_async if they want a smaller default.
    """
    if not content_type or not content_type.startswith("image/"):
        return file_bytes, storage_name, content_type

    compressed_bytes, new_content_type = compress_image(file_bytes, max_dimension=max_dimension, quality=85)

    if new_content_type is None:
        # compression failed — use original bytes/name/type unchanged
        return file_bytes, storage_name, content_type

    # compress_image always returns JPEG on success — swap the extension
    # on storage_name to match, so the stored file and its content_type
    # stay consistent (avoids a .png filename holding jpeg bytes).
    base_name = storage_name.rsplit(".", 1)[0]
    new_storage_name = f"{base_name}.jpg"

    return compressed_bytes, new_storage_name, new_content_type


def send_mass_email(msg):
    html_content = None
    text_content = None

    for part in msg.iter_parts():
        if part.get_content_type() == "text/html":
            html_content = part.get_content()
        elif part.get_content_type() == "text/plain":
            text_content = part.get_content()

    params = {
        "from": "Gleyo <noreply@gleyo.app>",
        "to": [msg["To"]],
        "subject": msg["Subject"],
    }
    if html_content:
        params["html"] = html_content
    if text_content:
        params["text"] = text_content

    if RESEND_API_KEY:
        try:
            resend.Emails.send(params)
            print("EMAIL SENT SUCCESSFULLY (Resend)")
            return
        except Exception as e:
            print("RESEND FAILED:", e, "— falling back to SMTP")
    else:
        print("No RESEND_API_KEY set — using SMTP")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        print("EMAIL SENT SUCCESSFULLY (SMTP fallback)")
    except Exception as e:
        print("SMTP FALLBACK FAILED:", e)



def upload_async(file_bytes, storage_name, content_type):
    prepared_bytes, prepared_name, prepared_type = _prepare_upload(file_bytes, storage_name, content_type)
    return upload_executor.submit(_upload_single, prepared_bytes, prepared_name, prepared_type)


def send_push_notification_async(subs, title, body, data):
    app = current_app._get_current_object()

    def task():
        with app.app_context():
            _send_push_notification(subs, title, body, data)

    return push_executor.submit(task)


def _send_discord_message(channel_id, content):
    from flask import current_app
    import requests, os

    token = current_app.config.get("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("❌ No Discord bot token configured")
        return False

    url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
    headers = {"Authorization": f"Bot {token}"}
    data = {"content": content}

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=10)

        if resp.status_code not in (200, 201):
            print(f"❌ Discord message failed: {resp.text}")
            return False

        print("✅ Discord message sent!")
        return True

    except Exception as e:
        print("❌ Discord error:", e)
        return False



def _send_push_notification(subs, title, body, data):
    app = current_app._get_current_object()

    print("🚀 PUSH TASK STARTED")
    print("🔔 Total subscriptions:", len(subs))

    with app.app_context():
        for i, sub in enumerate(subs, start=1):

            payload = {
                "title": str(title),
                "body": str(body),
                "url": str(data.get("url", "")),
                "type": str(data.get("type", "")),
                "community_slug": str(data.get("community_slug", "")),
                "channel_uuid": str(data.get("channel_uuid", "")),
            }


            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=json.dumps(payload),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": EMAIL_USER},
                    ttl=86400
                )

                print("✅ Push sent successfully")

            except WebPushException as e:

                if hasattr(e, "response") and e.response is not None:
                    try:
                        status = e.response.status_code
                        print("❌ Status code:", status)
                        print("❌ Response body:", e.response.text)

                        if status in (404, 410):
                            try:
                                sub_in_session = db.session.merge(sub)
                                db.session.delete(sub_in_session)
                                db.session.commit()
                                print("✅ Dead sub removed")
                            except Exception as db_err:
                                print("❌ Failed to delete sub:", db_err)
                                db.session.rollback()

                    except Exception as inner_err:
                        print("⚠️ Could not read error response:", inner_err)
                else:
                    # No response at all — network/timeout issue, don't delete
                    print("⚠️ No response object — likely a network error, skipping delete")

            except Exception as e:
                print("💥 Unexpected error:", repr(e))

        print("\n🏁 PUSH TASK FINISHED\n")




def send_discord_message_async(channel_id, content):

    app = current_app._get_current_object()

    def task():
        with app.app_context():
            _send_discord_message(channel_id, content)

    return push_executor.submit(task)




def get_community_member_emails(community_id, exclude_roles=("admin",)):
    """
    Returns [(email, username), ...] for every member of the community
    who does NOT hold one of exclude_roles.

    ⚠️ ADJUST THIS: if plain members live in a separate membership table
    (e.g. CommunityMember) rather than always having a CommunityUserRole
    row, swap the join below to that table instead.
    """
    rows = (
        db.session.query(Users.email, Users.username)
        .join(CommunityUserRole, CommunityUserRole.user_id == Users.id)
        .filter(CommunityUserRole.community_id == community_id)
        .filter(~CommunityUserRole.role.in_(exclude_roles))
        .filter(Users.email.isnot(None))
        .distinct()
        .all()
    )
    return rows

def build_quest_email(to_email, username, community_name, quest_name, quest_url):
    msg = EmailMessage()
    msg["Subject"] = f"🎉 New quest in {community_name}: {quest_name}"
    msg["From"] = "Gleyo <noreply@gleyo.app>"
    msg["To"] = to_email

    text_content = (
        f"Hey {username},\n\n"
        f"A new quest just went live in {community_name}: {quest_name}.\n"
        f"Check it out: {quest_url}\n\n"
        f"— Gleyo"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>New Quest</title>
    <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Lora:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
        table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
        a {{ text-decoration: none; }}

        body {{
            font-family: 'Lora', Georgia, serif;
            background-color: #0b0b12;
            margin: 0;
            padding: 0;
        }}

        .email-wrapper {{
            background-color: #0b0b12;
            padding: 48px 16px;
        }}

        .email-card {{
            background-color: #222236;
            border: 1px solid #2f2f4a;
            border-radius: 14px;
            max-width: 520px;
            margin: 0 auto;
            overflow: hidden;
        }}

        .header {{
            background-color: #0b0b12;
            padding: 32px 44px 28px;
            border-bottom: 1px solid #2f2f4a;
        }}

        .logo {{
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }}

        .logo-mark {{
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #6366f1, #4338ca);
            border-radius: 9px;
            display: inline-block;
        }}

        .logo-name {{
            font-family: 'Bricolage Grotesque', Arial, sans-serif;
            font-size: 17px;
            font-weight: 600;
            color: #e5e7eb;
            letter-spacing: 0.3px;
        }}

        .body-content {{
            padding: 44px 44px 36px;
        }}

        .eyebrow {{
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 11px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: #6366f1;
            margin-bottom: 14px;
        }}

        h1 {{
            font-family: 'Bricolage Grotesque', Arial, sans-serif;
            font-size: 27px;
            font-weight: 600;
            color: #e5e7eb;
            line-height: 1.3;
            margin-bottom: 18px;
            letter-spacing: -0.2px;
        }}

        .intro {{
            font-family: 'Lora', Georgia, serif;
            font-size: 15px;
            color: #bbbfc7;
            line-height: 1.7;
            margin-bottom: 30px;
        }}

        .intro strong {{ color: #e5e7eb; }}

        .cta-wrap {{
            text-align: center;
            margin-bottom: 32px;
        }}

        .cta-btn {{
            display: inline-block;
            padding: 13px 32px;
            background: #6366f1;
            color: #ffffff !important;
            font-family: 'Bricolage Grotesque', Arial, sans-serif;
            font-size: 14.5px;
            font-weight: 600;
            border-radius: 10px;
            letter-spacing: 0.2px;
        }}

        .quest-box {{
            border: 1px solid #2f2f4a;
            border-radius: 12px;
            padding: 18px 22px;
            margin-bottom: 30px;
            background: #222236e3;
        }}

        .quest-box-label {{
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 10.5px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #6366f1;
            margin-bottom: 8px;
        }}

        .quest-box-name {{
            font-family: 'Bricolage Grotesque', Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #e5e7eb;
        }}

        .separator {{
            height: 1px;
            background: #2f2f4a;
            margin: 0 0 28px;
        }}

        .signature {{
            font-family: 'Lora', Georgia, serif;
            font-size: 14px;
            color: #bbbfc7;
            font-style: italic;
        }}

        .footer {{
            background: #0b0b12;
            padding: 24px 44px;
            border-top: 1px solid #2f2f4a;
        }}

        .footer-text {{
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 11px;
            color: #6a6a80;
            line-height: 1.7;
            text-align: center;
        }}

        @media only screen and (max-width: 540px) {{
            .body-content {{ padding: 32px 26px 28px !important; }}
            .header {{ padding: 26px 26px 22px !important; }}
            .footer {{ padding: 20px 26px !important; }}
            h1 {{ font-size: 22px !important; }}
        }}
    </style>
    </head>
    <body>
    <div class="email-wrapper">
    <div class="email-card">

        <div class="header">
            <div class="logo">
                <div class="logo-mark"></div>
                <span class="logo-name">Gleyo</span>
            </div>
        </div>

        <div class="body-content">
            <p class="eyebrow">New Quest Live</p>
            <h1>A new quest just<br>dropped.</h1>
            <p class="intro">
                Hey {username} — <strong>{community_name}</strong> just published a new quest. Complete it before it's gone.
            </p>

            <div class="quest-box">
                <p class="quest-box-label">Quest</p>
                <p class="quest-box-name">{quest_name}</p>
            </div>

            <div class="cta-wrap">
                <a href="{quest_url}" class="cta-btn">View Quest</a>
            </div>

            <div class="separator"></div>

            <p class="signature">— Gleyo</p>
        </div>

        <div class="footer">
            <p class="footer-text">
                You're receiving this because you're a member of {community_name} community on Gleyo.
            </p>
        </div>

    </div>
    </div>
    </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")
    return msg

def _send_quest_emails(community, quest, subquest):
    app = current_app._get_current_object()

    with app.app_context():
        members = get_community_member_emails(community.id, exclude_roles=("admin",))
        print(f"📧 Sending quest emails to {len(members)} members")

        quest_url = f"https://gleyo.app/{community.slug}/quest/{quest.uuid}/{subquest.uuid}"

        sent, failed = 0, 0

        for i, (email, username) in enumerate(members, start=1):
            try:
                msg = build_quest_email(
                    email, username or "there", community.name, subquest.name, quest_url
                )
                send_mass_email(msg)
                sent += 1
            except Exception as e:
                failed += 1
                print(f"❌ Failed to email {email}: {e}")

            # Basic pacing — check your Resend plan's rate limit and tune
            # this. Resend's default is roughly 10 req/sec on most plans;
            # this keeps you well under that without needing a full queue.
            if i % 8 == 0:
                time.sleep(1)

        print(f"🏁 QUEST EMAIL BATCH FINISHED — sent={sent} failed={failed}")


def send_quest_emails_async(community, quest, subquest):
    pass
    # app = current_app._get_current_object()

    # def task():
    #     with app.app_context():
    #         _send_quest_emails(community, quest, subquest)

    # return email_executor.submit(task)