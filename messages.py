from flask import Blueprint, request, jsonify
from datetime import datetime
from instance import db
from community_models import Community
from community_request import CommunityRequest
from CommunityRequestMessage import CommunityRequestMessage

messages_bp = Blueprint("messages", __name__)

@messages_bp.route("/api/send_message", methods=["POST"])
def send_message():
    try:
        data = request.get_json()

        sender_id = data.get("sender_community_id")
        recipient_id = data.get("recipient_community_id")
        message = data.get("message", "").strip()
        message_type = data.get("message_type", "text")

        if not sender_id or not recipient_id or not message:
            return jsonify({"error": "Missing required fields"}), 400

        # Find or create CommunityRequest
        request_entry = (
            CommunityRequest.query
            .filter_by(from_community_id=sender_id, to_community_id=recipient_id)
            .first()
        )

        # If not found, create a new community request
        if not request_entry:
            request_entry = CommunityRequest(
                from_community_id=sender_id,
                to_community_id=recipient_id,
                from_community_name=None,  # Optional
                to_community_name=None,
                status="pending",
                has_ever_shown=False
            )
            db.session.add(request_entry)
            db.session.flush()  # Get new ID before adding message

        # Create message entry
        new_message = CommunityRequestMessage(
            request_id=request_entry.id,
            sender_community_id=sender_id,
            recipient_community_id=recipient_id,
            message=message,
            message_type=message_type,
            created_at=datetime.utcnow()
        )

        db.session.add(new_message)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": {
                "id": new_message.id,
                "sender_id": sender_id,
                "recipient_id": recipient_id,
                "message": message,
                "message_type": message_type,
                "created_at": new_message.created_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error saving message: {e}")
        return jsonify({"error": "Internal Server Error"}), 500
