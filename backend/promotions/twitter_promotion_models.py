import uuid
from datetime import datetime

from backend.utils.instance import db


class TwitterPromotionRequest(db.Model):
    __tablename__ = "twitter_promotion_requests"

    id = db.Column(db.Integer, primary_key=True)

    uuid = db.Column(
        db.String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
    )

    # ---- who / which community ----
    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # SET NULL so the request is still kept if the user deletes their account
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Snapshots, so the record stays readable even if the user/community changes later
    user_email = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(100), nullable=True)
    community_name = db.Column(db.String(120), nullable=False)
    community_slug = db.Column(db.String(120), nullable=False)
    plan = db.Column(db.String(20), nullable=False)

    # ---- the request itself ----
    type = db.Column(db.String(20), nullable=False)  # sprint | quest | community | other
    sprint_uuid = db.Column(db.String(36), nullable=True)
    sprint_title = db.Column(db.String(255), nullable=True)
    quest = db.Column(db.String(200), nullable=True)
    other = db.Column(db.String(200), nullable=True)
    preferred_date = db.Column(db.Date, nullable=False)
    message = db.Column(db.Text, nullable=True)
    x_handle = db.Column(db.String(15), nullable=True)

    # pending -> sent | email_failed
    # email_failed rows do NOT count toward the 1 week cooldown, so the user can retry.
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    __table_args__ = (
        db.Index("ix_promo_community_created", "community_id", "created_at"),
    )

    def __repr__(self):
        return f"<TwitterPromotionRequest {self.uuid} community={self.community_id}>"