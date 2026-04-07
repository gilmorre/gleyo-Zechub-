# instance/models/community_webhook.py
from instance import db
from datetime import datetime
import secrets

class CommunityWebhook(db.Model):
    __tablename__ = "community_webhooks"

    id = db.Column(db.Integer, primary_key=True)

    # 🔗 Relations
    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False
    )

    created_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # 🌐 Webhook config
    endpoint_url = db.Column(db.String(500), nullable=False)
    secret = db.Column(
        db.String(128),
        nullable=False,
        default=lambda: secrets.token_hex(32)
    )

    is_active = db.Column(db.Boolean, default=True)

    # 🎯 Event toggles (MATCH UI + API)
    on_user_joined = db.Column(db.Boolean, default=False)
    on_quest_completed = db.Column(db.Boolean, default=False)
    on_role_upgraded = db.Column(db.Boolean, default=False)
    on_subscription_expired = db.Column(db.Boolean, default=False)

    # 📊 Meta
    last_triggered_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 🔁 Relationships
    community = db.relationship("Community", backref="webhooks")
    created_by = db.relationship("Users", backref="created_webhooks")

    def __repr__(self):
        return f"<CommunityWebhook {self.endpoint_url}>"



# signature = hmac_sha256(secret, payload)





# import hmac
# import hashlib
# import json
# import requests
# import time

# @app.route("/api/quests/<int:quest_id>/complete", methods=["POST"])
# @login_required
# def complete_quest(quest_id):

#     quest = Quest.query.get_or_404(quest_id)
#     community = quest.community
#     user = current_user

#     # 1️⃣ Save completion
#     completion = QuestCompletion(
#         quest_id=quest.id,
#         user_id=user.id
#     )

#     db.session.add(completion)
#     db.session.commit()  # ✅ EVENT IS FINAL HERE

#     # 2️⃣ EMIT WEBHOOKS
#     emit_webhook(
#         community_id=community.id,
#         event="quest.completed",
#         payload={
#             "community_id": community.id,
#             "quest_id": quest.id,
#             "user_id": user.id,
#             "xp": quest.xp_reward,
#             "completed_at": int(time.time())
#         }
#     )

#     return jsonify({"success": True})




# def emit_webhook(community_id, event, payload):

#     webhooks = CommunityWebhook.query.filter_by(
#         community_id=community_id,
#         event=event,
#         is_active=True
#     ).all()

#     for webhook in webhooks:
#         send_webhook(webhook, payload)
# def send_webhook(webhook, payload):

#     body = json.dumps({
#         "event": webhook.event,
#         "data": payload
#     })

#     signature = hmac.new(
#         webhook.secret.encode(),
#         body.encode(),
#         hashlib.sha256
#     ).hexdigest()

#     headers = {
#         "Content-Type": "application/json",
#         "X-Signature": f"sha256={signature}",
#         "User-Agent": "YourPlatform-Webhooks/1.0"
#     }

#     try:
#         response = requests.post(
#             webhook.url,
#             data=body,
#             headers=headers,
#             timeout=5
#         )
#     except Exception as e:
#         print("Webhook failed:", e)

# const crypto = require("crypto");

# const secret = process.env.WEBHOOK_SECRET;
# const payload = JSON.stringify(req.body);

# const expected =
#   "sha256=" +
#   crypto.createHmac("sha256", secret).update(payload).digest("hex");

# if (req.headers["x-signature"] !== expected) {
#   return res.status(401).send("Invalid");
# }

# // ✅ Quest completed event is trusted
