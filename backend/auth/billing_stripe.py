import os
import logging
import threading
from html import escape as _esc
from email.message import EmailMessage
from datetime import datetime, timedelta
from backend.utils.utils import send_email

import stripe
from sqlalchemy.exc import IntegrityError
from backend.utils.instance import db

from backend.communities.community_models import Community, CommunityClaimUsage
from backend.communities.CommunityUserRole_models import CommunityUserRole
from backend.communities.community_subscription_models import CommunitySubscription
from backend.communities.community_claim_pack_models import CommunityExtraClaims, ClaimPackPurchase

log = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

PLAN_PRICES = {
    ("standard", "monthly"): ("Standard", 6900,   "month"),
    ("standard", "yearly"):  ("Standard", 79200,  "year"),
    ("plus", "monthly"):     ("Pro",      11000,  "month"),
    ("plus", "yearly"):      ("Pro",      126000, "year"),
}

CLAIM_LIMITS = {
    "free": 200,
    "standard": 1000,
    "plus": 4000,
    "enterprise": None,
}

CLAIM_LIMIT_MESSAGE = "This community has used all of its claims for now. Please check back later."

PACKS = {
    "1": {"quests": 500, "price": 15},
    "2": {"quests": 1000, "price": 29},
    "3": {"quests": 2000, "price": 56},
}

PLAN_NAMES = {"standard": "Standard", "plus": "Pro", "enterprise": "Enterprise"}
PLAN_RANK = {"free": 0, "standard": 1, "plus": 2, "enterprise": 3}
INTERVAL_RANK = {"monthly": 1, "yearly": 2}
PERIOD_DAYS = {"monthly": 30, "yearly": 365}

BILLING_ROLES = {"owner", "admin"}

# Wallet auto-renew fires this long before expires_at (the job file uses the same 24h).
RENEW_AHEAD_HOURS = 24


class BillingError(Exception):
    def __init__(self, message, code=400):
        super().__init__(message)
        self.message = message
        self.code = code


class InsufficientFunds(BillingError):
    """Raised by the wallet-debit hook when the wallet can't cover the amount."""
    def __init__(self, message="Insufficient wallet balance"):
        super().__init__(message, 402)


def user_can_manage_billing(user, community):
    if community.created_by_id == user.id:
        return True
    role = CommunityUserRole.query.filter_by(
        community_id=community.id,
        user_id=user.id,
        banned=False,
    ).first()
    return bool(role and role.role in BILLING_ROLES)


def get_billing_community(community_id, user):
    community = Community.query.get(community_id)
    if not community:
        raise BillingError("Community not found", 404)
    if not user_can_manage_billing(user, community):
        raise BillingError("Not allowed", 403)
    return community


def _d(obj):
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    for name in ("to_dict_recursive", "to_dict"):
        fn = getattr(obj, name, None)
        if callable(fn):
            return fn()
    return dict(obj)


# ---------------------------------------------------------------------------
# Active subscription / expiry
# ---------------------------------------------------------------------------

def get_active_subscription(community):
    sub = community.subscription
    if not sub:
        return None
    if sub.status == "expired":
        return None
    if sub.access_until <= datetime.utcnow():
        # past expiry (+ grace for card subs): expire_subscription_if_due checks Stripe first
        if expire_subscription_if_due(community):
            return None
    return sub


def _stripe_period_end(s):
    """Period end moved onto the subscription items in newer Stripe API versions."""
    items = (s.get("items") or {}).get("data") or []
    ts = (items[0].get("current_period_end") if items else None) or s.get("current_period_end")
    return _ts(ts)


def _stripe_still_paying(community, sub):
    """
    True  -> do NOT downgrade (Stripe says still paying and the row was synced, OR Stripe can't be reached).
    False -> nothing keeping them alive on the Stripe side.
    """
    if not (sub.payment_method == "card" and sub.stripe_subscription_id):
        return False
    try:
        s = _d(stripe.Subscription.retrieve(sub.stripe_subscription_id))
    except Exception as e:
        if getattr(e, "code", None) == "resource_missing":
            return False
        log.exception("stripe lookup failed for %s — not downgrading", sub.stripe_subscription_id)
        return True

    end = _stripe_period_end(s)
    if s.get("status") in ("active", "trialing") and end and end > datetime.utcnow():
        pending = bool(s.get("cancel_at_period_end") or s.get("cancel_at"))
        sub.expires_at = end
        sub.cancel_at_period_end = pending
        sub.status = "canceled" if pending else "active"
        community.is_paid = True
        db.session.commit()
        sync_claims_lock(community)
        _save_expiry_job(community.id, sub.expires_at)
        log.info("synced community %s from stripe: new expiry %s", community.id, end)
        return True
    return False


def expire_subscription_if_due(community):
    """
    Downgrades to Free if access has really run out. Returns True only if it downgraded.
    Card subs: access_until already includes the grace period, and Stripe is asked first.
    """
    sub = community.subscription
    if not sub or sub.status == "expired":
        return False
    if sub.access_until > datetime.utcnow():
        return False
    if _stripe_still_paying(community, sub):
        return False

    sub.status = "expired"
    community.is_paid = False
    db.session.commit()
    sync_claims_lock(community)
    return True


def subscription_payload(community):
    sub = get_active_subscription(community)
    if not sub:
        return None
    return {
        "plan": sub.plan,
        "plan_name": PLAN_NAMES.get(sub.plan, sub.plan),
        "interval": sub.interval,
        "status": sub.status,
        "payment_method": sub.payment_method,
        "card_auto_renews": sub.card_auto_renews,
        "cancel_at_period_end": bool(sub.cancel_at_period_end),
        "auto_renew_wallet": bool(sub.auto_renew_wallet),
        "paid_at": sub.paid_at.isoformat() + "Z",
        "expires_at": sub.expires_at.isoformat() + "Z",
    }


def has_paid_plan(community):
    return get_active_subscription(community) is not None


def quest_packs_for_template():
    best_id = min(PACKS, key=lambda k: PACKS[k]["price"] / PACKS[k]["quests"])
    out = []
    for pack_id, p in PACKS.items():
        rate = round(p["price"] / p["quests"] * 1000, 2)
        out.append({
            "id": pack_id,
            "quests": p["quests"],
            "price": p["price"],
            "rate": int(rate) if rate == int(rate) else rate,
            "best": pack_id == best_id,
        })
    return out


def get_extra_left(community):
    row = CommunityExtraClaims.query.filter_by(community_id=community.id).first()
    return row.balance if row else 0


def get_plan_claim_limit(community):
    sub = get_active_subscription(community)
    plan_name = sub.plan if sub else "free"
    return CLAIM_LIMITS.get(plan_name, CLAIM_LIMITS["free"])


def claims_remaining(community):
    limit = get_plan_claim_limit(community)
    if limit is None:
        return None
    now = datetime.utcnow()
    usage = CommunityClaimUsage.query.filter_by(
        community_id=community.id, year=now.year, month=now.month
    ).first()
    used = usage.claim_count if usage else 0
    return max(limit - used, 0) + get_extra_left(community)


def sync_claims_lock(community):
    remaining = claims_remaining(community)
    locked = remaining is not None and remaining <= 0
    if bool(community.claims_locked) != locked:
        community.claims_locked = locked
        db.session.commit()
    return locked


def claims_open(community):
    if not community.claims_locked:
        return True
    return not sync_claims_lock(community)


def quote_pack(community, pack_id):
    pack = PACKS.get(str(pack_id))
    if not pack:
        raise BillingError("Unknown pack")
    sub = get_active_subscription(community)
    if not sub:
        raise BillingError("Extra quests are available on paid plans.", 403)
    if sub.plan == "enterprise":
        raise BillingError("Your plan already has unlimited claimed quests.")
    return {
        "pack_id": str(pack_id),
        "quests": pack["quests"],
        "amount_cents": pack["price"] * 100,
    }


def _locked_extra_row(community_id):
    row = (CommunityExtraClaims.query
           .filter_by(community_id=community_id).with_for_update().first())
    if row:
        return row
    row = CommunityExtraClaims(community_id=community_id, balance=0, total_purchased=0)
    db.session.add(row)
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        row = (CommunityExtraClaims.query
               .filter_by(community_id=community_id).with_for_update().first())
    return row


def _locked_usage_row(community_id, year, month):
    q = CommunityClaimUsage.query.filter_by(community_id=community_id, year=year, month=month)
    row = q.with_for_update().first()
    if row:
        return row
    row = CommunityClaimUsage(community_id=community_id, year=year, month=month, claim_count=0)
    db.session.add(row)
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        row = q.with_for_update().first()
    return row


def credit_pack(community_id, pack_id, *, amount_cents, payment_method, ref):
    pack = PACKS.get(str(pack_id))
    if not pack:
        log.error("unknown pack %s for community %s ref %s", pack_id, community_id, ref)
        return None
    cid = int(community_id)

    extra = _locked_extra_row(cid)
    existing = ClaimPackPurchase.query.filter_by(ref=ref).first()
    if existing:
        db.session.rollback()
        return existing

    extra.balance += pack["quests"]
    extra.total_purchased += pack["quests"]
    purchase = ClaimPackPurchase(
        community_id=cid,
        pack_id=str(pack_id),
        quests=pack["quests"],
        amount_cents=amount_cents,
        payment_method=payment_method,
        ref=ref,
    )
    db.session.add(purchase)
    db.session.commit()

    community = Community.query.get(cid)
    if community:
        sync_claims_lock(community)
    return purchase


def consume_claim(community, amount=1, commit=True):
    """
    Spend `amount` claims for this community.
      - enterprise  -> unlimited, nothing is counted
      - others      -> monthly plan quota first, then extra pack balance
      - when plan quota AND extra are both gone -> extra wiped to 0 and
        community.claims_locked = True
    Raises BillingError(403) when the community has no claims left.
    commit=False lets the caller commit everything in one transaction.
    """
    if not claims_open(community):
        raise BillingError(CLAIM_LIMIT_MESSAGE, 403)

    limit = get_plan_claim_limit(community)

    if limit is None:
        return {"from_plan": 0, "from_extra": 0, "unlimited": True}

    now = datetime.utcnow()
    usage = _locked_usage_row(community.id, now.year, now.month)

    room = max(limit - usage.claim_count, 0)
    from_plan = min(room, amount)
    from_extra = amount - from_plan

    extra = None
    if from_extra:
        extra = _locked_extra_row(community.id)
        if extra.balance < from_extra:
            db.session.rollback()
            community.claims_locked = True
            db.session.commit()
            raise BillingError(CLAIM_LIMIT_MESSAGE, 403)
        extra.balance -= from_extra
        extra_left = extra.balance
    else:
        extra_left = get_extra_left(community)

    usage.claim_count += from_plan
    plan_left = room - from_plan

    if plan_left + extra_left <= 0:
        if extra is not None:
            extra.balance = 0
        community.claims_locked = True
    else:
        community.claims_locked = False

    if commit:
        db.session.commit()
    else:
        db.session.flush()

    return {"from_plan": from_plan, "from_extra": from_extra}


# ---------------------------------------------------------------------------
# Quotes
# ---------------------------------------------------------------------------

def _fmt_date(dt):
    return dt.strftime("%b %d, %Y")


def _quote_renewal(sub, full):
    """Same plan + same interval: early renewal. Wallet payers only; stacks onto the current expiry."""
    if sub.card_auto_renews:
        raise BillingError(
            f"Your card renews automatically on {_fmt_date(sub.expires_at)}. "
            "There's no need to renew early."
        )
    # Cap: at most ONE extra period paid ahead (no paying years in advance).
    period = timedelta(days=PERIOD_DAYS[sub.interval])
    if sub.expires_at - datetime.utcnow() >= period:
        raise BillingError(
            "You've already paid a full period ahead. "
            f"You can renew again closer to {_fmt_date(sub.expires_at)}."
        )
    return {"mode": "renew", "amount_cents": full, "full_cents": full, "from_plan": sub.plan}


def quote_plan(community, plan, interval):
    cfg = PLAN_PRICES.get((plan, interval))
    if not cfg:
        raise BillingError("Unknown plan")
    full = cfg[1]

    sub = get_active_subscription(community)
    if not sub:
        return {"mode": "new", "amount_cents": full, "full_cents": full, "from_plan": None}

    if sub.plan == plan and sub.interval == interval:
        return _quote_renewal(sub, full)

    if PLAN_RANK.get(plan, 0) < PLAN_RANK.get(sub.plan, 0):
        raise BillingError(
            "You can't switch to a lower plan while your current plan is active. "
            "You can pick it when your current plan expires."
        )

    if INTERVAL_RANK.get(interval, 0) < INTERVAL_RANK.get(sub.interval, 0):
        raise BillingError(
            "Your yearly plan is already paid for. "
            "You can switch to monthly when it expires."
        )

    # same interval, higher plan -> flat price difference
    if PLAN_RANK[plan] > PLAN_RANK.get(sub.plan, 0) and sub.interval == interval:
        if sub.status == "past_due":
            raise BillingError("Your last payment failed. Please fix your payment method first.")
        current = PLAN_PRICES.get((sub.plan, sub.interval))
        diff = full - (current[1] if current else 0)
        if diff <= 0:
            raise BillingError("Nothing to pay for this change.")
        return {"mode": "upgrade", "amount_cents": diff, "full_cents": full, "from_plan": sub.plan}

    # longer interval (monthly -> yearly), same or higher plan -> credit the unused time
    if INTERVAL_RANK.get(interval, 0) > INTERVAL_RANK.get(sub.interval, 0):
        if sub.status == "past_due":
            raise BillingError("Your last payment failed. Please fix your payment method first.")
        current = PLAN_PRICES.get((sub.plan, sub.interval))
        period_s = PERIOD_DAYS[sub.interval] * 86400
        left_s = max((sub.expires_at - datetime.utcnow()).total_seconds(), 0)
        credit = round(current[1] * left_s / period_s) if current else 0
        credit = max(min(credit, full - 50), 0)      # Stripe minimum charge is $0.50
        return {
            "mode": "switch",
            "amount_cents": full - credit,
            "full_cents": full,
            "credit_cents": credit,
            "from_plan": sub.plan,
        }

    return {"mode": "new", "amount_cents": full, "full_cents": full, "from_plan": sub.plan}

# ---------------------------------------------------------------------------
# Hooks registered by app.py
# ---------------------------------------------------------------------------

_expiry_scheduler = None


def set_expiry_scheduler(fn):
    """fn(community_id, expires_at) -> saves/moves the expiry + wallet-renewal jobs."""
    global _expiry_scheduler
    _expiry_scheduler = fn


def _save_expiry_job(community_id, expires_at):
    """Save/move the persistent jobs. Never breaks a payment."""
    try:
        if _expiry_scheduler is not None:
            _expiry_scheduler(community_id, expires_at)
        else:
            log.error("expiry scheduler not registered in app.py — jobs for community %s NOT saved", community_id)
    except Exception:
        log.exception("could not save plan expiry job for community %s", community_id)


_wallet_debit = None


def set_wallet_debit(fn):
    """
    fn(community, amount_cents, ref) -> debits the community wallet for a USD amount.
    Must raise InsufficientFunds when the balance can't cover it, and must be
    idempotent on `ref` (same ref twice = only one debit). Register it in app.py,
    built on the SAME debit code your /billing/pay-with-wallet route uses.
    """
    global _wallet_debit
    _wallet_debit = fn


def debit_wallet(community, amount_cents, ref):
    if _wallet_debit is None:
        raise BillingError("Wallet debit hook is not registered in app.py", 500)
    return _wallet_debit(community, amount_cents, ref)


# ---------------------------------------------------------------------------
# Activation / upgrade
# ---------------------------------------------------------------------------

def activate_plan(community_id, plan, interval, *, paid_at=None, period_start=None,
                  period_end=None, amount_cents=None, payment_method="card",
                  stripe_subscription_id=None, invoice_id=None, invoice_url=None):
    community = Community.query.get(int(community_id))
    if not community:
        return None

    now = paid_at or datetime.utcnow()
    sub = community.subscription

    if sub and invoice_id and sub.last_invoice_id == invoice_id:
        return sub

    is_new = sub is None
    prev_method = sub.payment_method if sub else None
    prev_stripe_id = sub.stripe_subscription_id if sub else None
    prev_cancel_pending = bool(sub and sub.cancel_at_period_end)

    if period_end is None:
        base = now
        if sub and sub.plan == plan and sub.interval == interval and sub.expires_at > now:
            base = sub.expires_at          # early renewal stacks onto the current expiry
        period_end = base + timedelta(days=PERIOD_DAYS[interval])

    if not sub:
        sub = CommunitySubscription(community_id=community.id, started_at=now)
        db.session.add(sub)

    sub.plan = plan
    sub.interval = interval
    sub.status = "active"
    sub.paid_at = now
    sub.current_period_start = period_start or now
    sub.expires_at = period_end
    sub.canceled_at = None
    sub.payment_method = payment_method
    sub.renewal_notice_for = None
    if amount_cents is not None:
        sub.amount_cents = amount_cents
    if invoice_id:
        sub.last_invoice_id = invoice_id

    if payment_method == "card":
        if stripe_subscription_id:
            if stripe_subscription_id != prev_stripe_id:
                sub.cancel_at_period_end = False       # brand-new Stripe subscription
            sub.stripe_subscription_id = stripe_subscription_id
        if sub.cancel_at_period_end:                   # cancel is pending on Stripe: keep showing "Ending"
            sub.status = "canceled"
            sub.canceled_at = now
    else:
        # Paid from the wallet: Stripe is no longer in charge of this subscription.
        sub.stripe_subscription_id = None
        sub.cancel_at_period_end = False
        if is_new or prev_method == "card":
            sub.auto_renew_wallet = True               # default ON for wallet payers; they can switch it off

    community.is_paid = True
    db.session.commit()
    sync_claims_lock(community)

    # Wallet payment over a card sub that was still going to bill them -> stop Stripe, or they'd pay twice.
    if payment_method == "wallet" and prev_stripe_id and not prev_cancel_pending:
        try:
            stripe.Subscription.cancel(prev_stripe_id)
        except Exception:
            log.exception("could not cancel stripe subscription %s after wallet payment", prev_stripe_id)

    # 💾 every renewal moves the expiry job AND the wallet-renewal job to the new date
    _save_expiry_job(community.id, sub.expires_at)

    _queue_receipt(community, sub, amount_cents, invoice_id, invoice_url)
    return sub


def apply_upgrade(community_id, plan, interval, *, amount_cents, payment_method, ref):
    cid = int(community_id)
    sub = (CommunitySubscription.query
           .filter_by(community_id=cid).with_for_update().first())
    community = Community.query.get(cid)
    if not sub or not community:
        return None

    if sub.last_invoice_id == ref:
        return sub
    if sub.interval == interval and PLAN_RANK.get(sub.plan, 0) >= PLAN_RANK.get(plan, 0):
        return sub

    if sub.expires_at <= datetime.utcnow():
        log.error("upgrade paid but subscription expired: community=%s ref=%s", cid, ref)
        return None

    old_plan = sub.plan
    sub.plan = plan
    sub.interval = interval
    sub.paid_at = datetime.utcnow()
    sub.last_invoice_id = ref
    cfg = PLAN_PRICES.get((plan, interval))
    if cfg:
        sub.amount_cents = cfg[1]
    community.is_paid = True
    db.session.commit()
    sync_claims_lock(community)

    _save_expiry_job(community.id, sub.expires_at)

    if sub.stripe_subscription_id and sub.status == "active":
        try:
            _switch_stripe_price(sub.stripe_subscription_id, plan, interval)
        except Exception:
            log.exception("could not move stripe subscription %s to %s/%s",
                          sub.stripe_subscription_id, plan, interval)

    _queue_receipt(community, sub, amount_cents, ref, None,
                   method="Wallet balance" if payment_method == "wallet" else "Card",
                   upgrade_from=old_plan)
    return sub


def _switch_stripe_price(stripe_sub_id, plan, interval):
    s = stripe.Subscription.retrieve(stripe_sub_id)
    if s["status"] not in ("active", "trialing", "past_due"):
        return
    item_id = s["items"]["data"][0]["id"]
    stripe.Subscription.modify(
        stripe_sub_id,
        items=[{"id": item_id, "price": get_price_id(plan, interval)}],
        proration_behavior="none",
        metadata={"plan": plan, "interval": interval},
    )


# ---------------------------------------------------------------------------
# Card: cancel / resume.   Wallet: auto-renew toggle + the 24h-before renewal
# ---------------------------------------------------------------------------

def cancel_card_subscription(community):
    """Don't cancel now — they've paid for the period. Stripe stops renewing at period end."""
    sub = get_active_subscription(community)
    if not sub or sub.payment_method != "card" or not sub.stripe_subscription_id:
        raise BillingError("There's no card subscription to cancel.")
    if sub.cancel_at_period_end:
        raise BillingError("Your subscription is already set to end.")
    try:
        stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
    except Exception:
        log.exception("stripe cancel failed for %s", sub.stripe_subscription_id)
        raise BillingError("Couldn't cancel right now. Please try again.", 502)

    sub.cancel_at_period_end = True
    sub.status = "canceled"                 # usable until expires_at
    sub.canceled_at = datetime.utcnow()
    db.session.commit()
    _save_expiry_job(community.id, sub.expires_at)   # card_auto_renews is now False -> no grace
    return sub


def resume_card_subscription(community):
    sub = get_active_subscription(community)
    if (not sub or sub.payment_method != "card" or not sub.stripe_subscription_id
            or not sub.cancel_at_period_end or sub.expires_at <= datetime.utcnow()):
        raise BillingError("There's nothing to resume.")
    try:
        stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=False)
    except Exception:
        log.exception("stripe resume failed for %s", sub.stripe_subscription_id)
        raise BillingError("Couldn't resume this subscription. Please pick a plan again.", 502)

    sub.cancel_at_period_end = False
    sub.status = "active"
    sub.canceled_at = None
    db.session.commit()
    _save_expiry_job(community.id, sub.expires_at)
    return sub


def set_wallet_auto_renew(community, enabled):
    sub = get_active_subscription(community)
    if not sub:
        raise BillingError("You don't have an active plan.")
    if sub.card_auto_renews:
        raise BillingError("Your plan renews automatically on your card.")
    if (sub.plan, sub.interval) not in PLAN_PRICES:
        raise BillingError("This plan can't be renewed from the wallet.")
    sub.auto_renew_wallet = bool(enabled)
    db.session.commit()
    _save_expiry_job(community.id, sub.expires_at)   # adds / removes the wallet-renewal job
    return sub


def renew_plan_with_wallet(community_id, notify=True):
    """
    Called by the job ~24h before expiry. Returns:
      "renewed" | "low_balance" | "skipped"
    """
    cid = int(community_id)
    sub = (CommunitySubscription.query
           .filter_by(community_id=cid).with_for_update().first())
    community = Community.query.get(cid)
    now = datetime.utcnow()

    if not sub or not community or sub.status == "expired" or sub.expires_at <= now:
        db.session.rollback()
        return "skipped"
    if not sub.auto_renew_wallet or sub.card_auto_renews:
        db.session.rollback()
        return "skipped"
    if sub.expires_at - now > timedelta(hours=RENEW_AHEAD_HOURS, minutes=30):
        db.session.rollback()          # already renewed (expiry moved out) or fired too early
        return "skipped"

    cfg = PLAN_PRICES.get((sub.plan, sub.interval))
    if not cfg:
        db.session.rollback()
        return "skipped"

    amount = cfg[1]
    plan, interval = sub.plan, sub.interval
    ref = f"wallet-renew-{cid}-{sub.expires_at:%Y%m%d%H%M}"   # one renewal per period
    if sub.last_invoice_id == ref:
        db.session.rollback()
        return "skipped"

    try:
        debit_wallet(community, amount, ref)
    except InsufficientFunds:
        db.session.rollback()
        if notify:
            _notify_low_balance(cid, amount)
        return "low_balance"

    # success -> stacks onto expires_at, moves both jobs, queues the receipt email
    activate_plan(cid, plan, interval, amount_cents=amount, payment_method="wallet", invoice_id=ref)
    return "renewed"


def _build_low_balance_message(d):
    text = (
        "Hey,\n\n"
        f"We tried to renew the {d['plan_name']} plan for {d['community_name']} using your wallet "
        f"balance, but the balance was too low to cover the {d['amount']} renewal.\n\n"
        f"Please top up before {d['expires_on']} so your plan keeps running. If it expires, "
        "your community drops to the Free plan.\n\n"
        f"Top up here: {d['link']}\n\n"
        "We'll try once more a couple of hours before your plan expires.\n\nGleyo"
    )
    html = (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">'
        '<h2 style="margin:0 0 10px;font-size:20px;color:#111827">Your wallet balance is too low</h2>'
        f'<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.5">We tried to renew the '
        f'<b>{_esc(d["plan_name"])}</b> plan for <b>{_esc(d["community_name"])}</b> using your wallet balance, '
        f'but it was too low to cover the <b>{_esc(d["amount"])}</b> renewal.</p>'
        f'<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.5">Top up before '
        f'<b>{_esc(d["expires_on"])}</b> so your plan keeps running. If it expires, your community drops to the Free plan.</p>'
        f'<p style="margin:18px 0"><a href="{_esc(d["link"], quote=True)}" '
        'style="background:#4285f4;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-size:14px">'
        'Top up wallet</a></p>'
        '<p style="margin:0;color:#6b7280;font-size:13px">We\'ll try once more a couple of hours before your plan expires.</p>'
        '<p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Gleyo</p></div>'
    )
    msg = EmailMessage()
    msg["From"] = "Gleyo <noreply@gleyo.app>"
    msg["To"] = d["to"]
    msg["Subject"] = f'Action needed: top up before your {d["plan_name"]} plan expires'
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    return msg


def _send_low_balance(d):
    try:
        send_email(_build_low_balance_message(d))
    except Exception:
        log.exception("low balance email failed")


def _notify_low_balance(community_id, amount_cents):
    """One email per period (renewal_notice_for remembers which expires_at we already warned about)."""
    try:
        community = Community.query.get(community_id)
        sub = community.subscription if community else None
        if not sub or sub.renewal_notice_for == sub.expires_at:
            return
        to = getattr(getattr(community, "creator", None), "email", None)
        if not to:
            return
        d = {
            "to": to,
            "community_name": community.name,
            "plan_name": PLAN_NAMES.get(sub.plan, sub.plan),
            "amount": _money(amount_cents),
            "expires_on": _fmt_date(sub.expires_at),
            "link": f"https://gleyo.app/community/{community.slug}/settings/subscription",
        }
        sub.renewal_notice_for = sub.expires_at
        db.session.commit()
        threading.Thread(target=_send_low_balance, args=(d,), daemon=True).start()
    except Exception:
        db.session.rollback()
        log.exception("could not queue low balance email")


# ---------------------------------------------------------------------------
# Receipts
# ---------------------------------------------------------------------------

def _money(cents, currency="usd"):
    cur = (currency or "usd").lower()
    return f"${cents / 100:,.2f}" if cur == "usd" else f"{cents / 100:,.2f} {cur.upper()}"


def _build_receipt_message(d):
    rows = [
        ("Community", d["community_name"]),
        ("Plan", f'{d["plan_name"]} ({d["interval_label"]})'),
    ]
    if d.get("upgrade_from"):
        rows.append(("Upgraded from", d["upgrade_from"]))
    if d.get("amount"):
        rows.append(("Amount paid", d["amount"]))
    rows += [
        ("Paid on", d["paid_on"]),
        ("Access until", d["expires_on"]),
        ("Payment method", d["method"]),
    ]
    if d.get("reference"):
        rows.append(("Reference", d["reference"]))

    text = "Thanks for your payment. Here is your Gleyo receipt.\n\n"
    text += "\n".join(f"{k}: {v}" for k, v in rows)
    if d.get("invoice_url"):
        text += f'\n\nView invoice: {d["invoice_url"]}'
    text += "\n\nGleyo"

    row_html = "".join(
        f'<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">{_esc(k)}</td>'
        f'<td style="padding:8px 0;text-align:right;font-size:14px;color:#111827">{_esc(str(v))}</td></tr>'
        for k, v in rows
    )
    link_html = (
        f'<p style="margin:20px 0 0"><a href="{_esc(d["invoice_url"], quote=True)}" '
        f'style="color:#4285f4;font-size:14px">View invoice</a></p>'
        if d.get("invoice_url") else ""
    )
    html = (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">'
        '<h2 style="margin:0 0 6px;font-size:20px;color:#111827">Payment receipt</h2>'
        '<p style="margin:0 0 18px;color:#6b7280;font-size:14px">Thanks for your payment. Here are the details.</p>'
        f'<table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb">{row_html}</table>'
        f'{link_html}'
        '<p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Gleyo</p></div>'
    )

    msg = EmailMessage()
    msg["From"] = "Gleyo <noreply@gleyo.app>"
    msg["To"] = d["to"]
    msg["Subject"] = f'Your Gleyo receipt: {d["plan_name"]} plan'
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    return msg


def _send_receipt(d):
    try:
        send_email(_build_receipt_message(d))
    except Exception:
        log.exception("receipt email failed")


def _queue_receipt(community, sub, amount_cents, invoice_id, invoice_url,
                   method=None, upgrade_from=None):
    try:
        creator = getattr(community, "creator", None)
        to = getattr(creator, "email", None)
        if not to:
            return
        d = {
            "to": to,
            "community_name": community.name,
            "plan_name": PLAN_NAMES.get(sub.plan, sub.plan),
            "interval_label": "Yearly" if sub.interval == "yearly" else "Monthly",
            "amount": _money(amount_cents, getattr(sub, "currency", "usd")) if amount_cents else None,
            "paid_on": sub.paid_at.strftime("%b %d, %Y"),
            "expires_on": sub.expires_at.strftime("%b %d, %Y"),
            "method": method or ("Wallet balance" if sub.payment_method == "wallet" else "Card"),
            "reference": invoice_id,
            "invoice_url": invoice_url,
            "upgrade_from": PLAN_NAMES.get(upgrade_from, upgrade_from) if upgrade_from else None,
        }
        threading.Thread(target=_send_receipt, args=(d,), daemon=True).start()
    except Exception:
        log.exception("could not queue receipt email")


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

def get_price_id(plan, interval):
    cfg = PLAN_PRICES.get((plan, interval))
    if not cfg:
        raise BillingError("Unknown plan")
    name, amount, stripe_interval = cfg
    key = f"gleyo_{plan}_{interval}"

    found = stripe.Price.list(lookup_keys=[key], active=True, limit=1)
    if found.data:
        return found.data[0].id

    price = stripe.Price.create(
        unit_amount=amount,
        currency="usd",
        recurring={"interval": stripe_interval},
        lookup_key=key,
        product_data={"name": f"{name} Plan"},
    )
    return price.id


def ensure_customer(community):
    saved = getattr(community, "stripe_customer_id", None)
    if saved:
        return saved

    found = stripe.Customer.search(
        query=f"metadata['community_id']:'{community.id}'", limit=1
    )
    if found.data:
        customer_id = found.data[0].id
    else:
        customer_id = stripe.Customer.create(
            name=community.name,
            metadata={"community_id": str(community.id)},
        ).id

    if hasattr(Community, "stripe_customer_id"):
        community.stripe_customer_id = customer_id
        db.session.commit()
    return customer_id


def create_plan_payment(community, plan, interval):
    quote = quote_plan(community, plan, interval)
    if quote["mode"] == "renew":
        raise BillingError("To renew early, pay with your wallet balance.")
    if quote["mode"] == "upgrade":
        secret = create_upgrade_secret(community, plan, interval, quote)
    else:  # "new" and "switch" both create a fresh Stripe subscription
        secret = create_subscription_secret(
            community, plan, interval, credit_cents=quote.get("credit_cents", 0)
        )
    return {"client_secret": secret, "amount_cents": quote["amount_cents"], "mode": quote["mode"]}


def create_subscription_secret(community, plan, interval, credit_cents=0):
    price_id = get_price_id(plan, interval)
    customer_id = ensure_customer(community)

    for old in stripe.Subscription.list(customer=customer_id, status="incomplete", limit=20).auto_paging_iter():
        stripe.Subscription.cancel(old.id)

    kwargs = {}
    if credit_cents > 0:
        # one-time discount on the FIRST invoice = credit for the unused time
        coupon = stripe.Coupon.create(
            amount_off=credit_cents,
            currency="usd",
            duration="once",
            max_redemptions=1,
            name="Unused time credit",
        )
        kwargs["discounts"] = [{"coupon": coupon.id}]

    sub = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": price_id}],
        payment_behavior="default_incomplete",
        payment_settings={"save_default_payment_method": "on_subscription"},
        expand=["latest_invoice.confirmation_secret"],
        metadata={
            "source": "elements",
            "community_id": str(community.id),
            "plan": plan,
            "interval": interval,
        },
        **kwargs,
    )
    return sub.latest_invoice.confirmation_secret.client_secret

def create_upgrade_secret(community, plan, interval, quote):
    if quote["amount_cents"] <= 0:
        raise BillingError("Nothing to pay for this change.")
    intent = stripe.PaymentIntent.create(
        amount=quote["amount_cents"],
        currency="usd",
        customer=ensure_customer(community),
        automatic_payment_methods={"enabled": True},
        metadata={
            "source": "elements",
            "type": "upgrade",
            "plan": plan,
            "interval": interval,
            "from_plan": quote["from_plan"] or "",
            "community_id": str(community.id),
        },
    )
    return intent.client_secret


def create_pack_payment(community, pack_id):
    quote = quote_pack(community, pack_id)
    intent = stripe.PaymentIntent.create(
        amount=quote["amount_cents"],
        currency="usd",
        customer=ensure_customer(community),
        automatic_payment_methods={"enabled": True},
        metadata={
            "source": "elements",
            "type": "pack",
            "pack": quote["pack_id"],
            "community_id": str(community.id),
        },
    )
    return {
        "client_secret": intent.client_secret,
        "amount_cents": quote["amount_cents"],
        "mode": "pack",
    }


def is_ready(community, kind, plan=None, interval=None, payment_intent=None, mode=None):
    if kind == "quests":
        if not payment_intent:
            return False
        try:
            pi = _d(stripe.PaymentIntent.retrieve(payment_intent))
            md = pi.get("metadata") or {}
            if md.get("type") != "pack" or md.get("community_id") != str(community.id):
                return False
            if pi.get("status") != "succeeded":
                return False
            _fulfill_pack(pi)
            return ClaimPackPurchase.query.filter_by(ref=pi["id"]).first() is not None
        except Exception:
            log.exception("pack status check failed")
            return False

    if mode == "upgrade":
        if not payment_intent:
            return False
        try:
            pi = _d(stripe.PaymentIntent.retrieve(payment_intent))
            md = pi.get("metadata") or {}
            if md.get("type") != "upgrade" or md.get("community_id") != str(community.id):
                return False
            if pi.get("status") != "succeeded":
                return False
            _fulfill_upgrade(pi)
            db.session.refresh(community)
            sub = get_active_subscription(community)
            return bool(sub and sub.plan == plan and sub.interval == interval)
        except Exception:
            log.exception("upgrade status check failed")
            return False

    sub = get_active_subscription(community)
    if sub and sub.plan == plan and sub.interval == interval:
        return True
    try:
        return sync_plan_from_stripe(community, plan, interval)
    except Exception:
        log.exception("sync_plan_from_stripe failed")
        return False


def sync_plan_from_stripe(community, plan, interval):
    customer_id = ensure_customer(community)
    subs = stripe.Subscription.list(
        customer=customer_id, status="active", limit=10, expand=["data.latest_invoice"]
    )
    for s in subs.auto_paging_iter():
        md = _d(s.metadata)
        if md.get("source") != "elements" or md.get("community_id") != str(community.id):
            continue
        if md.get("plan") != plan or md.get("interval") != interval:
            continue
        inv = _d(s.latest_invoice)
        if inv and inv.get("status") == "paid":
            _apply_paid_invoice(inv, sub_id=s.id)
            db.session.refresh(community)
            return get_active_subscription(community) is not None
    return False


def _sub_id_from_invoice(invoice):
    invoice = _d(invoice)
    return invoice.get("subscription") or (
        (invoice.get("parent") or {}).get("subscription_details") or {}
    ).get("subscription")


def _ts(unix):
    return datetime.utcfromtimestamp(unix) if unix else None


def _fulfill_upgrade(pi):
    md = pi.get("metadata") or {}
    if md.get("source") != "elements" or md.get("type") != "upgrade":
        return None
    row = apply_upgrade(
        md["community_id"], md["plan"], md["interval"],
        amount_cents=pi.get("amount_received") or pi.get("amount"),
        payment_method="card",
        ref=pi["id"],
    )
    if row and md.get("fulfilled") != "1":
        try:
            stripe.PaymentIntent.modify(pi["id"], metadata={"fulfilled": "1"})
        except Exception:
            log.exception("could not mark upgrade intent fulfilled")
    return row


def _fulfill_pack(pi):
    md = pi.get("metadata") or {}
    if md.get("source") != "elements" or md.get("type") != "pack":
        return None
    row = credit_pack(
        md["community_id"], md.get("pack"),
        amount_cents=pi.get("amount_received") or pi.get("amount"),
        payment_method="card",
        ref=pi["id"],
    )
    if row and md.get("fulfilled") != "1":
        try:
            stripe.PaymentIntent.modify(pi["id"], metadata={"fulfilled": "1"})
        except Exception:
            log.exception("could not mark pack intent fulfilled")
    return row


def _apply_paid_invoice(invoice, sub_id=None):
    invoice = _d(invoice)
    sub_id = sub_id or _sub_id_from_invoice(invoice)
    if not sub_id:
        return None
    md = _d(stripe.Subscription.retrieve(sub_id).metadata)
    if md.get("source") != "elements":
        return None

    line = ((invoice.get("lines") or {}).get("data") or [{}])[0]
    period = line.get("period") or {}

    community = Community.query.get(int(md["community_id"]))
    old_stripe_sub = None
    if community and community.subscription:
        old_stripe_sub = community.subscription.stripe_subscription_id

    row = activate_plan(
        md["community_id"], md["plan"], md["interval"],
        paid_at=datetime.utcnow(),
        period_start=_ts(period.get("start")),
        period_end=_ts(period.get("end")),
        amount_cents=invoice.get("amount_paid"),
        payment_method="card",
        stripe_subscription_id=sub_id,
        invoice_id=invoice["id"],
        invoice_url=invoice.get("hosted_invoice_url"),
    )

    if old_stripe_sub and old_stripe_sub != sub_id:
        try:
            stripe.Subscription.cancel(old_stripe_sub)
        except Exception:
            pass
    return row


def handle_elements_event(event):
    etype = event["type"]
    obj = _d(event["data"]["object"])

    if etype == "invoice.paid":
        _apply_paid_invoice(obj)

    elif etype == "payment_intent.succeeded":
        md = obj.get("metadata") or {}
        if md.get("source") != "elements":
            return
        if md.get("type") == "upgrade":
            _fulfill_upgrade(obj)
            return
        if md.get("type") == "pack":
            _fulfill_pack(obj)
            return

    elif etype == "invoice.payment_failed":
        sub_id = _sub_id_from_invoice(obj)
        if sub_id:
            row = CommunitySubscription.query.filter_by(stripe_subscription_id=sub_id).first()
            if row and row.status == "active":
                row.status = "past_due"
                db.session.commit()

    elif etype == "customer.subscription.updated":
        # Fires the moment the user clicks Cancel / Resume, so the page flips to "Ending" / "Active" immediately.
        row = CommunitySubscription.query.filter_by(stripe_subscription_id=obj.get("id")).first()
        if row and row.payment_method == "card" and row.status != "expired":
            pending = bool(obj.get("cancel_at_period_end") or obj.get("cancel_at"))
            row.cancel_at_period_end = pending
            if pending and row.status in ("active", "past_due"):
                row.status = "canceled"
                row.canceled_at = row.canceled_at or datetime.utcnow()
            elif not pending and row.status == "canceled" and obj.get("status") in ("active", "trialing"):
                row.status = "active"
                row.canceled_at = None
            db.session.commit()
            _save_expiry_job(row.community_id, row.expires_at)

    elif etype == "customer.subscription.deleted":
        # Fires at the END of the period (or when we cancel an old sub). Wallet-paid rows are ignored.
        row = CommunitySubscription.query.filter_by(stripe_subscription_id=obj["id"]).first()
        if row and row.payment_method == "card":
            row.status = "canceled"
            row.cancel_at_period_end = True
            row.canceled_at = row.canceled_at or datetime.utcnow()
            db.session.commit()