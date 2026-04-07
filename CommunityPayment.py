# community_models.py
from datetime import datetime
from instance import db

class CommunityPayment(db.Model):
    __tablename__ = "community_payments"
    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(db.Integer, db.ForeignKey("communities.id"), nullable=False)
    community = db.relationship("Community", back_populates="community_payments")

    plan = db.Column(db.String(50), nullable=False)
    interval = db.Column(db.String(50), nullable=False)

    stripe_session_id = db.Column(db.String(255), nullable=True, unique=True)  # ✅ nullable now

    status = db.Column(db.String(50), default="pending")
    amount = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime)

    def __repr__(self):
        return f"<CommunityPayment {self.community_id} {self.plan} {self.status}>"