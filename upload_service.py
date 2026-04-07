from concurrent.futures import ThreadPoolExecutor
import requests
import os, json
from communitynotification import CommunityNotificationSettings, PushSubscription, CategoryNotificationSettings, ChannelNotificationSettings
from pywebpush import webpush, WebPushException


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
    return executor.submit(_send_push_notification, subs, title, body, data)




def _send_push_notification(subs, title, body, data):
    with app.app_context():  # 🔥 important for threads
        for sub in subs:
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
                    vapid_claims={"sub": "mailto:admin@example.com"},
                    ttl=60
                )

            except WebPushException as e:
                print("❌ Push failed:", e)

                if "410" in str(e) or "404" in str(e):
                    db.session.delete(sub)
                    db.session.commit()