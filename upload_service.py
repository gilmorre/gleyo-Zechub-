from concurrent.futures import ThreadPoolExecutor
import requests
import os, json
from communitynotification import CommunityNotificationSettings, PushSubscription, CategoryNotificationSettings, ChannelNotificationSettings
from pywebpush import webpush, WebPushException
from instance import db
from flask import current_app

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")


executor = ThreadPoolExecutor(max_workers=10)


def _upload_single(file_bytes, storage_name, content_type):
    print("🚀 Upload started:", storage_name)

    url = f"{SUPABASE_URL}/storage/v1/object/uploads/{storage_name}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type
    }

    res = requests.post(
        url,
        headers=headers,
        data=file_bytes,
        timeout=10   
    )

    if res.status_code >= 300:
        print("❌ Upload failed:", res.text)
        raise Exception(res.text)

    print("✅ Upload finished:", storage_name)

    return f"{SUPABASE_URL}/storage/v1/object/public/uploads/{storage_name}"


def upload_async(file_bytes, storage_name, content_type):
    return executor.submit(_upload_single, file_bytes, storage_name, content_type)


def send_push_notification_async(subs, title, body, data):
    app = current_app._get_current_object()

    def task():
        with app.app_context():
            _send_push_notification(subs, title, body, data)

    return executor.submit(task)


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
                    vapid_claims={"sub": "mailto:admin@gleyo.app"},
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

    return executor.submit(task)
