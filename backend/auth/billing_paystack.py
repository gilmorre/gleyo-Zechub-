import os
import hmac
import hashlib
import uuid
import logging
import threading
import requests
from urllib.parse import quote as _urlquote
from html import escape as _esc
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from backend.utils.utils import send_email

from sqlalchemy.exc import IntegrityError
from backend.utils.instance import db

from backend.communities.community_models import Community, CommunityClaimUsage
from backend.communities.CommunityUserRole_models import CommunityUserRole
from backend.communities.community_subscription_models import CommunitySubscription
from backend.communities.community_claim_pack_models import CommunityExtraClaims, ClaimPackPurchase

log = logging.getLogger(__name__)

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY")
PAYSTACK_CURRENCY = (os.getenv("PAYSTACK_CURRENCY") or "USD").upper()
PAYSTACK_BASE = "https://api.paystack.co"

PLAN_PRICES = {
    ("standard", "monthly"): ("Standard", 6900,   "monthly"),
    ("standard", "yearly"):  ("Standard", 79200,  "annually"),
    ("plus", "monthly"):     ("Pro",      11000,  "monthly"),
    ("plus", "yearly"):      ("Pro",      126000, "annually"),
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

RENEW_AHEAD_HOURS = 24


class BillingError(Exception):
    def __init__(self, message, code=400):
        super().__init__(message)
        self.message = message
        self.code = code


class InsufficientFunds(BillingError):
    def __init__(self, message="Insufficient wallet balance"):
        super().__init__(message, 402)


class PaystackError(BillingError):
    pass


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


def _iso(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _iso_out(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S") + "+00:00"


def _api(method, path, params=None, body=None):
    try:
        r = requests.request(
            method,
            PAYSTACK_BASE + path,
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            params=params,
            json=body,
            timeout=20,
        )
        payload = r.json()
    except Exception:
        log.exception("paystack %s %s unreachable", method, path)
        raise BillingError("Couldn't reach the payment provider. Please try again.", 502)
    if r.status_code >= 400 or not payload.get("status"):
        log.error("paystack %s %s failed (%s): %s", method, path, r.status_code, payload)
        raise PaystackError(
            payload.get("message") or "Payment provider error",
            r.status_code if r.status_code >= 400 else 400,
        )
    return payload


def verify_webhook_signature(raw_body, signature):
    if not signature or not PAYSTACK_SECRET_KEY:
        return False
    digest = hmac.new(PAYSTACK_SECRET_KEY.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(digest, signature)


_plan_codes = {}


def get_plan_code(plan, interval):
    cfg = PLAN_PRICES.get((plan, interval))
    if not cfg:
        raise BillingError("Unknown plan")
    _, amount, paystack_interval = cfg
    plan_name = f"gleyo_{plan}_{interval}_{PAYSTACK_CURRENCY.lower()}_{amount}"
    if plan_name in _plan_codes:
        return _plan_codes[plan_name]

    page = 1
    while page <= 10:
        rows = _api("GET", "/plan", params={"perPage": 100, "page": page})["data"]
        for p in rows:
            if p.get("name") == plan_name and not p.get("is_deleted") and not p.get("is_archived"):
                _plan_codes[plan_name] = p["plan_code"]
                return p["plan_code"]
        if len(rows) < 100:
            break
        page += 1

    created = _api("POST", "/plan", body={
        "name": plan_name,
        "amount": amount,
        "interval": paystack_interval,
        "currency": PAYSTACK_CURRENCY,
    })["data"]
    _plan_codes[plan_name] = created["plan_code"]
    return created["plan_code"]


def _toggle_subscription(code, enable):
    detail = _api("GET", f"/subscription/{code}")["data"]
    _api(
        "POST",
        "/subscription/enable" if enable else "/subscription/disable",
        body={"code": code, "token": detail.get("email_token")},
    )


def _disable_subscription(code):
    try:
        _toggle_subscription(code, False)
        return True
    except BillingError:
        log.exception("could not disable paystack subscription %s", code)
        return False


def get_active_subscription(community):
    sub = community.subscription
    if not sub:
        return None
    if sub.status == "expired":
        return None
    if sub.access_until <= datetime.utcnow():
        if expire_subscription_if_due(community):
            return None
    return sub


def _provider_still_paying(community, sub):
    if not (sub.payment_method == "card" and sub.stripe_subscription_id):
        return False
    try:
        s = _d(_api("GET", f"/subscription/{sub.stripe_subscription_id}")["data"])
    except BillingError as e:
        if e.code == 404:
            return False
        log.exception("paystack lookup failed for %s, not downgrading", sub.stripe_subscription_id)
        return True

    end = _iso(s.get("next_payment_date"))
    if s.get("status") == "active" and end and end > datetime.utcnow():
        sub.expires_at = end
        sub.cancel_at_period_end = False
        sub.status = "active"
        community.is_paid = True
        db.session.commit()
        sync_claims_lock(community)
        _save_expiry_job(community.id, sub.expires_at)
        log.info("synced community %s from paystack: new expiry %s", community.id, end)
        return True
    return False


def expire_subscription_if_due(community):
    sub = community.subscription
    if not sub or sub.status == "expired":
        return False
    if sub.access_until > datetime.utcnow():
        return False
    if _provider_still_paying(community, sub):
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


def _fmt_date(dt):
    return dt.strftime("%b %d, %Y")


def _quote_renewal(sub, full):
    if sub.card_auto_renews:
        raise BillingError(
            f"Your card renews automatically on {_fmt_date(sub.expires_at)}. "
            "There's no need to renew early."
        )
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

    if PLAN_RANK[plan] > PLAN_RANK.get(sub.plan, 0) and sub.interval == interval:
        if sub.status == "past_due":
            raise BillingError("Your last payment failed. Please fix your payment method first.")
        current = PLAN_PRICES.get((sub.plan, sub.interval))
        diff = full - (current[1] if current else 0)
        if diff <= 0:
            raise BillingError("Nothing to pay for this change.")
        return {"mode": "upgrade", "amount_cents": diff, "full_cents": full, "from_plan": sub.plan}

    if INTERVAL_RANK.get(interval, 0) > INTERVAL_RANK.get(sub.interval, 0):
        if sub.status == "past_due":
            raise BillingError("Your last payment failed. Please fix your payment method first.")
        current = PLAN_PRICES.get((sub.plan, sub.interval))
        period_s = PERIOD_DAYS[sub.interval] * 86400
        left_s = max((sub.expires_at - datetime.utcnow()).total_seconds(), 0)
        credit = round(current[1] * left_s / period_s) if current else 0
        credit = max(min(credit, full - 50), 0)
        return {
            "mode": "switch",
            "amount_cents": full - credit,
            "full_cents": full,
            "credit_cents": credit,
            "from_plan": sub.plan,
        }

    return {"mode": "new", "amount_cents": full, "full_cents": full, "from_plan": sub.plan}


_expiry_scheduler = None


def set_expiry_scheduler(fn):
    global _expiry_scheduler
    _expiry_scheduler = fn


def _save_expiry_job(community_id, expires_at):
    try:
        if _expiry_scheduler is not None:
            _expiry_scheduler(community_id, expires_at)
        else:
            log.error("expiry scheduler not registered in app.py, jobs for community %s NOT saved", community_id)
    except Exception:
        log.exception("could not save plan expiry job for community %s", community_id)


_wallet_debit = None


def set_wallet_debit(fn):
    global _wallet_debit
    _wallet_debit = fn


def debit_wallet(community, amount_cents, ref):
    if _wallet_debit is None:
        raise BillingError("Wallet debit hook is not registered in app.py", 500)
    return _wallet_debit(community, amount_cents, ref)


def _start_recurring(sub, plan, interval, auth):
    old = sub.stripe_subscription_id
    old_pending = bool(sub.cancel_at_period_end)
    customer_code = (auth or {}).get("customer_code")
    authorization_code = (auth or {}).get("authorization_code")

    created = None
    if customer_code and authorization_code and sub.expires_at > datetime.utcnow():
        try:
            created = _api("POST", "/subscription", body={
                "customer": customer_code,
                "plan": get_plan_code(plan, interval),
                "authorization": authorization_code,
                "start_date": _iso_out(sub.expires_at),
            })["data"]
        except BillingError:
            log.exception("could not create paystack subscription for community %s", sub.community_id)
    else:
        log.warning("no reusable card for community %s, auto-renew not started", sub.community_id)

    if created and created.get("subscription_code"):
        new_code = created["subscription_code"]
        sub.stripe_subscription_id = new_code
        sub.cancel_at_period_end = False
        sub.status = "active"
        sub.canceled_at = None
        db.session.commit()
        if old and old != new_code and not old_pending:
            _disable_subscription(old)
        return True

    if old and not old_pending:
        _disable_subscription(old)
        sub.stripe_subscription_id = None
        db.session.commit()
    return False


def _move_recurring(sub, plan, interval):
    old = sub.stripe_subscription_id
    try:
        detail = _d(_api("GET", f"/subscription/{old}")["data"])
        auth = {
            "customer_code": _d(detail.get("customer")).get("customer_code"),
            "authorization_code": _d(detail.get("authorization")).get("authorization_code"),
        }
    except BillingError:
        log.exception("could not read paystack subscription %s", old)
        auth = {}
    return _start_recurring(sub, plan, interval, auth)


def activate_plan(community_id, plan, interval, *, paid_at=None, period_start=None,
                  period_end=None, amount_cents=None, payment_method="card",
                  stripe_subscription_id=None, invoice_id=None, invoice_url=None,
                  paystack_auth=None):
    community = Community.query.get(int(community_id))
    if not community:
        return None

    now = paid_at or datetime.utcnow()
    sub = (CommunitySubscription.query
           .filter_by(community_id=community.id).with_for_update().first())

    if sub and invoice_id and sub.last_invoice_id == invoice_id:
        db.session.rollback()
        return sub

    is_new = sub is None
    prev_method = sub.payment_method if sub else None
    prev_stripe_id = sub.stripe_subscription_id if sub else None
    prev_cancel_pending = bool(sub and sub.cancel_at_period_end)

    if period_end is None:
        base = now
        if sub and sub.plan == plan and sub.interval == interval and sub.expires_at > now:
            base = sub.expires_at
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
                sub.cancel_at_period_end = False
            sub.stripe_subscription_id = stripe_subscription_id
        if sub.cancel_at_period_end:
            sub.status = "canceled"
            sub.canceled_at = now
    else:
        sub.stripe_subscription_id = None
        sub.cancel_at_period_end = False
        if is_new or prev_method == "card":
            sub.auto_renew_wallet = True

    community.is_paid = True
    db.session.commit()
    sync_claims_lock(community)

    if payment_method == "wallet" and prev_stripe_id and not prev_cancel_pending:
        _disable_subscription(prev_stripe_id)

    if payment_method == "card" and paystack_auth is not None and not stripe_subscription_id:
        _start_recurring(sub, plan, interval, paystack_auth)

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
        db.session.rollback()
        return sub
    if sub.interval == interval and PLAN_RANK.get(sub.plan, 0) >= PLAN_RANK.get(plan, 0):
        db.session.rollback()
        return sub

    if sub.expires_at <= datetime.utcnow():
        db.session.rollback()
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

    if sub.stripe_subscription_id and sub.status == "active":
        _move_recurring(sub, plan, interval)

    _save_expiry_job(community.id, sub.expires_at)

    _queue_receipt(community, sub, amount_cents, ref, None,
                   method="Wallet balance" if payment_method == "wallet" else "Card",
                   upgrade_from=old_plan)
    return sub


def cancel_card_subscription(community):
    sub = get_active_subscription(community)
    if not sub or sub.payment_method != "card" or not sub.stripe_subscription_id:
        raise BillingError("There's no card subscription to cancel.")
    if sub.cancel_at_period_end:
        raise BillingError("Your subscription is already set to end.")
    try:
        _toggle_subscription(sub.stripe_subscription_id, False)
    except BillingError:
        log.exception("paystack cancel failed for %s", sub.stripe_subscription_id)
        raise BillingError("Couldn't cancel right now. Please try again.", 502)

    sub.cancel_at_period_end = True
    sub.status = "canceled"
    sub.canceled_at = datetime.utcnow()
    db.session.commit()
    _save_expiry_job(community.id, sub.expires_at)
    return sub


def resume_card_subscription(community):
    sub = get_active_subscription(community)
    if (not sub or sub.payment_method != "card" or not sub.stripe_subscription_id
            or not sub.cancel_at_period_end or sub.expires_at <= datetime.utcnow()):
        raise BillingError("There's nothing to resume.")
    try:
        _toggle_subscription(sub.stripe_subscription_id, True)
    except BillingError:
        log.exception("paystack resume failed for %s", sub.stripe_subscription_id)
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
    _save_expiry_job(community.id, sub.expires_at)
    return sub


def renew_plan_with_wallet(community_id, notify=True):
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
        db.session.rollback()
        return "skipped"

    cfg = PLAN_PRICES.get((sub.plan, sub.interval))
    if not cfg:
        db.session.rollback()
        return "skipped"

    amount = cfg[1]
    plan, interval = sub.plan, sub.interval
    ref = f"wallet-renew-{cid}-{sub.expires_at:%Y%m%d%H%M}"
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


def _initialize(email, amount_cents, metadata):
    if not email:
        raise BillingError("Your account needs an email address to pay by card.")
    if amount_cents <= 0:
        raise BillingError("Nothing to pay for this change.")
    data = _api("POST", "/transaction/initialize", body={
        "email": email,
        "amount": int(amount_cents),
        "currency": PAYSTACK_CURRENCY,
        "reference": f"gleyo_{uuid.uuid4().hex}",
        "channels": ["card"],
        "metadata": metadata,
    })["data"]
    return {
        "access_code": data["access_code"],
        "reference": data["reference"],
        "authorization_url": data["authorization_url"],
        "public_key": PAYSTACK_PUBLIC_KEY,
        "amount_cents": int(amount_cents),
    }


def create_plan_payment(community, plan, interval, email):
    quote = quote_plan(community, plan, interval)
    if quote["mode"] == "renew":
        raise BillingError("To renew early, pay with your wallet balance.")
    result = _initialize(email, quote["amount_cents"], {
        "source": "gleyo",
        "type": "upgrade" if quote["mode"] == "upgrade" else "plan",
        "community_id": str(community.id),
        "plan": plan,
        "interval": interval,
        "from_plan": quote["from_plan"] or "",
    })
    result["mode"] = quote["mode"]
    return result


def create_pack_payment(community, pack_id, email):
    quote = quote_pack(community, pack_id)
    result = _initialize(email, quote["amount_cents"], {
        "source": "gleyo",
        "type": "pack",
        "pack": quote["pack_id"],
        "community_id": str(community.id),
    })
    result["mode"] = "pack"
    return result


def _auth_from_tx(tx):
    a = _d(tx.get("authorization"))
    c = _d(tx.get("customer"))
    return {
        "customer_code": c.get("customer_code"),
        "authorization_code": a.get("authorization_code") if a.get("reusable") else None,
    }


def fulfill_transaction(tx):
    tx = _d(tx)
    md = tx.get("metadata")
    if tx.get("status") != "success" or not isinstance(md, dict) or md.get("source") != "gleyo":
        return None
    if (tx.get("currency") or "").upper() != PAYSTACK_CURRENCY:
        log.error("currency mismatch on %s: %s", tx.get("reference"), tx.get("currency"))
        return None

    kind = md.get("type")
    ref = tx["reference"]
    amount = tx.get("amount")
    cid = int(md["community_id"])

    if kind == "pack":
        return credit_pack(cid, md.get("pack"), amount_cents=amount, payment_method="card", ref=ref)

    if kind == "upgrade":
        return apply_upgrade(
            cid, md["plan"], md["interval"],
            amount_cents=amount, payment_method="card", ref=ref,
        )

    if kind == "plan":
        return activate_plan(
            cid, md["plan"], md["interval"],
            paid_at=datetime.utcnow(),
            amount_cents=amount,
            payment_method="card",
            invoice_id=ref,
            paystack_auth=_auth_from_tx(tx),
        )
    return None


def is_ready(community, kind, plan=None, interval=None, reference=None, mode=None):
    if not reference:
        return False
    try:
        tx = _d(_api("GET", f"/transaction/verify/{_urlquote(reference, safe='')}")["data"])
        md = tx.get("metadata")
        if not isinstance(md, dict) or md.get("source") != "gleyo":
            return False
        if str(md.get("community_id")) != str(community.id):
            return False
        if tx.get("status") != "success":
            return False
        if (kind == "quests") != (md.get("type") == "pack"):
            return False

        fulfill_transaction(tx)

        if kind == "quests":
            return ClaimPackPurchase.query.filter_by(ref=reference).first() is not None

        db.session.refresh(community)
        sub = get_active_subscription(community)
        return bool(sub and sub.plan == plan and sub.interval == interval)
    except Exception:
        log.exception("payment status check failed")
        return False


def _apply_invoice(obj):
    sub_code = _d(obj.get("subscription")).get("subscription_code")
    if not sub_code:
        return None
    row = CommunitySubscription.query.filter_by(stripe_subscription_id=sub_code).first()
    if not row or row.payment_method != "card":
        return None

    ref = _d(obj.get("transaction")).get("reference") or obj.get("invoice_code")
    if not ref:
        return None

    now = datetime.utcnow()
    period_end = _iso(obj.get("period_end"))
    if not period_end or period_end <= now:
        period_end = None

    return activate_plan(
        row.community_id, row.plan, row.interval,
        paid_at=now,
        period_start=_iso(obj.get("period_start")),
        period_end=period_end,
        amount_cents=obj.get("amount"),
        payment_method="card",
        stripe_subscription_id=sub_code,
        invoice_id=ref,
    )


def handle_paystack_event(event):
    etype = event.get("event")
    obj = _d(event.get("data"))

    if etype == "charge.success":
        md = obj.get("metadata")
        if isinstance(md, dict) and md.get("source") == "gleyo":
            fulfill_transaction(obj)

    elif etype == "invoice.update":
        if obj.get("paid") or obj.get("status") == "success":
            _apply_invoice(obj)

    elif etype == "invoice.payment_failed":
        sub_code = _d(obj.get("subscription")).get("subscription_code")
        if sub_code:
            row = CommunitySubscription.query.filter_by(stripe_subscription_id=sub_code).first()
            if row and row.status == "active":
                row.status = "past_due"
                db.session.commit()

    elif etype == "subscription.not_renew":
        row = CommunitySubscription.query.filter_by(stripe_subscription_id=obj.get("subscription_code")).first()
        if row and row.payment_method == "card" and row.status != "expired":
            row.cancel_at_period_end = True
            if row.status in ("active", "past_due"):
                row.status = "canceled"
                row.canceled_at = row.canceled_at or datetime.utcnow()
            db.session.commit()
            _save_expiry_job(row.community_id, row.expires_at)

    elif etype == "subscription.disable":
        row = CommunitySubscription.query.filter_by(stripe_subscription_id=obj.get("subscription_code")).first()
        if row and row.payment_method == "card":
            row.status = "canceled"
            row.cancel_at_period_end = True
            row.canceled_at = row.canceled_at or datetime.utcnow()
            db.session.commit()