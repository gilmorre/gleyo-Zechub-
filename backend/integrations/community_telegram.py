from backend.utils.instance import db
from datetime import datetime


class CommunityTelegramGroup(db.Model):
    __tablename__ = 'community_telegram_group'

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id'),   
        nullable=False
    )

    community = db.relationship(
        "Community",
        back_populates="telegram_groups"
    )

    label = db.Column(db.String(100))
    chat_id = db.Column(db.BigInteger)
    chat_title = db.Column(db.String(255))
    chat_type = db.Column(db.String(20))
    connect_code = db.Column(db.String(20))
    bot_is_admin = db.Column(db.Boolean, default=False)
    connected_at = db.Column(db.DateTime, default=datetime.utcnow)