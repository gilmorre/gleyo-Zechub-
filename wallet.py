from instance import db
import secrets
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
    


class ZecWallet(db.Model):
    __tablename__ = "zec_wallets"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    address = db.Column(
        db.String(255),
        unique=True,
        nullable=False
    )

    wallet_name = db.Column(
        db.String(50),
        nullable=True
    )

    verified = db.Column(
        db.Boolean,
        default=False
    )

    connected_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(UTC)
    )

    last_txid = db.Column(
        db.String(255),
        nullable=True
    )

    is_active = db.Column(
        db.Boolean,
        default=True
    )

    disconnected_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    def __repr__(self):
        return f"<ZecWallet {self.address}>"
    



class ZecAuthSession(db.Model):
    __tablename__ = "zec_auth_sessions"

    id = db.Column(db.Integer, primary_key=True)

    session_id = db.Column(
        db.String(64),
        unique=True,
        nullable=False,
        default=lambda: secrets.token_hex(16)
    )

    verification_code = db.Column(
        db.String(20),
        nullable=False
    )

    deposit_address = db.Column(
        db.String(255),
        nullable=False
    )

    wallet_name = db.Column(
        db.String(50),
        nullable=True
    )

    status = db.Column(
        db.String(20),
        default="pending"
    )

    verified_wallet_address = db.Column(
        db.String(255),
        nullable=True
    )

    txid = db.Column(
        db.String(255),
        nullable=True
    )

    expires_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(UTC)
    )