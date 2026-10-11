"""
backend/communities/community_subscription_models.py   (REPLACE the whole file)

New columns vs. your version:
  cancel_at_period_end  - mirrors Stripe: card user clicked Cancel, still has access until expires_at
  auto_renew_wallet     - wallet payers: renew from wallet balance ~24h before expiry
  renewal_notice_for    - the expires_at we already sent a "low balance" email for (no duplicate emails)

Then run:
    flask db migrate -m "subscription renewals" && flask db upgrade
"""
from datetime import datetime, timedelta
from backend.utils.instance import db

# Card subscriptions: Stripe moves the period forward at renewal but charges the
# invoice about an hour later (and retries failures for days). Don't downgrade a
# card customer at exactly expires_at; wait this long first.
CARD_GRACE = timedelta(hours=48)


class CommunitySubscription(db.Model):
    """One row per community = its CURRENT paid plan.
    No row (or an expired one) means the community is on Free."""
    __tablename__ = "community_subscriptions"

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer,
        db.ForeignKey("communities.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    plan = db.Column(db.String(30), nullable=False)        # standard | plus | enterprise
    interval = db.Column(db.String(10), nullable=False)    # monthly | yearly
    status = db.Column(db.String(20), nullable=False, default="active")
    # active | past_due | canceled (still usable until expires_at) | expired

    amount_cents = db.Column(db.Integer)                   # what was actually paid
    currency = db.Column(db.String(8), default="usd")
    payment_method = db.Column(db.String(20))              # card | wallet

    stripe_subscription_id = db.Column(db.String(80), index=True)
    last_invoice_id = db.Column(db.String(80))             # makes webhook retries / job reruns harmless

    # ---- renewal state (NEW) ----
    cancel_at_period_end = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    auto_renew_wallet = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("false"))
    renewal_notice_for = db.Column(db.DateTime)

    started_at = db.Column(db.DateTime, default=datetime.utcnow)   # first ever payment
    paid_at = db.Column(db.DateTime, nullable=False)               # latest payment
    current_period_start = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    canceled_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    community = db.relationship("Community", back_populates="subscription")

    @property
    def card_auto_renews(self):
        """True while Stripe is going to charge the saved card on the renewal date."""
        return bool(
            self.payment_method == "card"
            and self.stripe_subscription_id
            and not self.cancel_at_period_end
            and self.status in ("active", "past_due")
        )

    @property
    def access_until(self):
        """Last moment the community keeps paid access (expires_at + grace for live card subs)."""
        if self.card_auto_renews:
            return self.expires_at + CARD_GRACE
        return self.expires_at

    @property
    def is_active(self):
        return self.status in ("active", "past_due", "canceled") and self.access_until > datetime.utcnow()
 

class CommunityPayment(db.Model):
    __tablename__ = 'community_payments'

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    plan = db.Column(db.String(50), nullable=False)
    interval = db.Column(db.String(20), nullable=False)
    stripe_session_id = db.Column(db.String(255), unique=True, nullable=True)
    status = db.Column(db.String(30), nullable=False, default='pending')

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    community = db.relationship(
        'Community',
        backref=db.backref(
            'community_payments',
            cascade='all, delete-orphan',
            passive_deletes=True
        )
    )

    enterprise_request = db.relationship(
        'EnterpriseRequest',
        back_populates='payment',
        uselist=False
    )

    def __repr__(self):
        return f"<CommunityPayment {self.plan}/{self.interval} {self.status}>"


class EnterpriseRequest(db.Model):
    __tablename__ = 'enterprise_requests'

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )

    payment_id = db.Column(
        db.Integer,
        db.ForeignKey('community_payments.id', ondelete='SET NULL'),
        nullable=True
    )

    reference_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    interval = db.Column(db.String(20), nullable=False)

    company = db.Column(db.String(255), nullable=False)
    website = db.Column(db.String(255), nullable=False)
    fullname = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50))
    requirements = db.Column(db.Text, nullable=False)
    budget = db.Column(db.String(100))

    status = db.Column(db.String(30), nullable=False, default='new')

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    community = db.relationship(
        'Community',
        backref=db.backref(
            'enterprise_requests',
            cascade='all, delete-orphan',
            passive_deletes=True
        )
    )

    payment = db.relationship(
        'CommunityPayment',
        back_populates='enterprise_request'
    )

    def __repr__(self):
        return f"<EnterpriseRequest {self.reference_code}>"