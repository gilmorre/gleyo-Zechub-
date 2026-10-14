"""
backend/billing/crypto_models.py

One row per crypto payment attempt (ZEC with memo, or USDT/USDC via NEAR Intents).
Then run:
    flask db migrate -m "crypto checkouts" && flask db upgrade
"""
from datetime import datetime
from backend.utils.instance import db

FINAL_STATUSES = ("paid", "failed", "underpaid", "late_paid")


class CryptoCheckout(db.Model):
    __tablename__ = "crypto_checkouts"

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer, db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id = db.Column(db.Integer, nullable=False, index=True)

    # ---- what is being bought (server decides the price, never the browser) ----
    purpose = db.Column(db.String(10), nullable=False)       # plan | quests
    plan = db.Column(db.String(30))
    interval = db.Column(db.String(10))
    pack = db.Column(db.String(40))
    mode = db.Column(db.String(10))                          # new | upgrade | switch

    base_cents = db.Column(db.Integer, nullable=False)       # price before discount
    discount_pct = db.Column(db.Integer, nullable=False, default=0)
    charged_cents = db.Column(db.Integer, nullable=False)    # what the buyer actually owes

    # ---- how they pay ----
    pay_token = db.Column(db.String(10), nullable=False)     # ZEC | USDT | USDC
    pay_network = db.Column(db.String(20), nullable=False)   # Zcash | Polygon | BSC | Base
    deposit_address = db.Column(db.String(200), nullable=False)
    memo = db.Column(db.String(64), unique=True)             # ZEC only, matched on-chain
    refund_address = db.Column(db.String(100))               # stablecoins only

    zec_rate = db.Column(db.Numeric(18, 8))                  # USD per ZEC, locked at creation
    expected_amount = db.Column(db.Numeric(30, 8), nullable=False)  # amount the buyer must send, in pay_token
    received_amount = db.Column(db.Numeric(30, 8))
    swap_zec_amount = db.Column(db.Numeric(30, 8))           # stablecoin path: real ZEC out of the swap
    swap_status = db.Column(db.String(30))

    status = db.Column(db.String(12), nullable=False, default="pending", index=True)
    # pending | processing | paid | expired | failed | underpaid | late_paid
    tx_ref = db.Column(db.String(160), unique=True)          # "txid:output" or swap tx -> a payment can never be used twice
    last_checked_at = db.Column(db.DateTime)

    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    paid_at = db.Column(db.DateTime)
    fulfilled_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    community = db.relationship("Community")