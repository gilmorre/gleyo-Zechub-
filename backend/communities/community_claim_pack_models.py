from datetime import datetime
from backend.utils.instance import db


class CommunityExtraClaims(db.Model):
    __tablename__ = "community_extra_claims"

    id = db.Column(db.Integer, primary_key=True)
    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    balance = db.Column(db.Integer, nullable=False, default=0)
    total_purchased = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    community = db.relationship("Community")


class ClaimPackPurchase(db.Model):
    __tablename__ = "claim_pack_purchases"

    id = db.Column(db.Integer, primary_key=True)
    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pack_id = db.Column(db.String(10), nullable=False)
    quests = db.Column(db.Integer, nullable=False)
    amount_cents = db.Column(db.Integer)
    payment_method = db.Column(db.String(20))
    ref = db.Column(db.String(80), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    community = db.relationship("Community")