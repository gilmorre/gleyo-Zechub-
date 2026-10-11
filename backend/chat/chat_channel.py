from backend.utils.instance import db
from datetime import datetime
import uuid
from sqlalchemy import UniqueConstraint


class CommunityChannel(db.Model):
    __tablename__ = "community_channels"

    id = db.Column(db.Integer, primary_key=True)

    uuid = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )

    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("community_categories.id", ondelete="SET NULL"),
        nullable=True
    )


    created_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    name = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(255), nullable=True)

    is_private = db.Column(db.Boolean, default=False)
    is_quest_alert = db.Column(db.Boolean, default=False)

    slowmode_seconds = db.Column(db.Integer, default=0)

    position = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    community = db.relationship("Community", backref="channels")

    category = db.relationship(
        "CommunityCategory",
        back_populates="channels"
    )

    created_by = db.relationship("Users")

    messages = db.relationship(
        "CommunityMessage",
        back_populates="channel",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<CommunityChannel {self.name}>"





class ChannelAllowedRole(db.Model):
    __tablename__ = "channel_allowed_roles"

    id = db.Column(db.Integer, primary_key=True)

    channel_id = db.Column(
        db.Integer,
        db.ForeignKey("community_channels.id", ondelete="CASCADE"),
        nullable=False
    )

    role = db.Column(db.String(20), nullable=False)

    channel = db.relationship(
        "CommunityChannel",
        backref=db.backref("allowed_roles", cascade="all, delete-orphan")
    )


class ChannelReadState(db.Model):
    __tablename__ = "channel_read_states"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey("community_channels.id", ondelete="CASCADE"), nullable=False)
    last_read_message_id = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("Users")
    channel = db.relationship("CommunityChannel")

    __table_args__ = (db.UniqueConstraint("user_id", "channel_id", name="uq_read_user_channel"),)


class MessageMention(db.Model):
    __tablename__ = "message_mentions"

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey("community_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel_id = db.Column(db.Integer, nullable=False)

    user = db.relationship("Users")

    __table_args__ = (
        db.UniqueConstraint("message_id", "user_id", name="uq_mention_msg_user"),
        db.Index("ix_mention_user_channel_msg", "user_id", "channel_id", "message_id"),
    )