from instance import db
from datetime import datetime

class Wallet(db.Model):
    __tablename__ = "wallets"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    address = db.Column(db.String(100), unique=True, nullable=False)  # wallet address
    chain = db.Column(db.String(20), default="ethereum")              # ethereum, solana, polygon etc
    connected_at = db.Column(db.DateTime, default=datetime.utcnow)

    nonce = db.Column(db.String(255), nullable=True)

    last_signature = db.Column(db.Text, nullable=True)

    token_holdings = db.Column(db.JSON, nullable=True)


    nonce_created_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    disconnected_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self):
        return f"<Wallet {self.address} ({self.chain})>"
