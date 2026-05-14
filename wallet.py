from instance import db
from datetime import datetime, UTC


class Wallet(db.Model):
    __tablename__ = "wallets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    address = db.Column(db.String(100), unique=True, nullable=False)
    chain = db.Column(db.String(20), default="ethereum")

    connected_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(UTC)
    )

    nonce = db.Column(db.String(255), nullable=True)

    last_signature = db.Column(db.Text, nullable=True)

    token_holdings = db.Column(db.JSON, nullable=True)

    nonce_created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    is_active = db.Column(db.Boolean, default=True)

    disconnected_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    def __repr__(self):
        return f"<Wallet {self.address} ({self.chain})>"


class SolanaWallet(db.Model):
    __tablename__ = "solana_wallets"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    address = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    wallet_name = db.Column(
        db.String(20),
        default="solflare"
    )

    connected_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(UTC)
    )

    nonce = db.Column(db.String(255), nullable=True)

    nonce_created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    last_signature = db.Column(db.Text, nullable=True)

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    disconnected_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    def __repr__(self):
        return f"<SolanaWallet {self.address} ({self.wallet_name})>"