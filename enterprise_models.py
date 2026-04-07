from datetime import datetime, timedelta
from instance import db

class EnterpriseRequest(db.Model):
    __tablename__ = "enterprise_requests"
    id = db.Column(db.Integer, primary_key=True)

    reference_code = db.Column(db.String(20), unique=True, nullable=False)

    payment_id = db.Column(db.Integer, db.ForeignKey("community_payments.id"))
    payment = db.relationship("CommunityPayment", backref="enterprise_requests")

    community_id = db.Column(db.Integer, db.ForeignKey("communities.id"), nullable=False)
    community = db.relationship("Community", backref="enterprise_requests")

    company = db.Column(db.String(255), nullable=False)
    website = db.Column(db.String(255))
    fullname = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    stripe_session_id = db.Column(db.String(255), nullable=True, unique=True)
    phone = db.Column(db.String(50))
    requirements = db.Column(db.Text, nullable=False)
    budget = db.Column(db.String(100))

    # 👇 new payment fields
    token = db.Column(db.String(10), nullable=True)       # e.g., "USDT"
    network = db.Column(db.String(50), nullable=True)     # e.g., "Polygon"
    tx = db.Column(db.String(100), nullable=True, unique=False)

    payment_state = db.Column(db.String(20), default="not_started")  # not_started | waiting | paid | expired
    generated_at = db.Column(db.DateTime, nullable=True)             # ⏳ when session started
    paid_at = db.Column(db.DateTime, nullable=True)

    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_expired(self):
        """Check if 30 minutes have passed since session start"""
        if not self.generated_at:
            return False
        return datetime.utcnow() > self.generated_at + timedelta(minutes=30)

    def __repr__(self):
        return f"<EnterpriseRequest {self.reference_code} {self.company}>"
