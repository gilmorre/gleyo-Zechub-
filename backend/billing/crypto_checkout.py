"""
backend/billing/crypto_checkout.py

Create + verify + fulfil crypto payments for plans and extra-quest packs.

  ZEC          -> buyer sends to our shielded WALLET address with a unique memo. 8% off.
                  The memo contains the community slug, e.g. GLY-capus-voice-A1B2C3D4
  USDT / USDC  -> NEAR Intents deposit address, swapped to ZEC for us. Full price.

Flow:
  * the buyer creates a payment, sends the funds, then presses "I've paid, please check"
  * that button calls POST /billing/verify-plan-payment (one check, no browser polling)
  * a background job (poll_pending_checkouts) also watches open payments, so a payment is
    still credited if the buyer closes the page

Rules this file enforces:
  * the SERVER computes every price (the browser never sends an amount)
  * the ZEC rate is locked at creation
  * a payment is matched by memo (ZEC) or by its own deposit address (swap), never by balance delta
  * external calls happen WITHOUT a DB lock; the result is applied under a row lock with a re-check,
    so the poller and the button can't both fulfil
  * fulfilment is idempotent on ref "crypto-<checkout id>", so even if two workers race, the buyer
    is only credited once
  * one buyer has ONE live checkout per community: starting a different coin/network/purchase
    closes the old unfinished one, starting the same one again brings the old one back

Env:
    ZEC_DETECTION_READY=true      (default true here; set false to refuse ZEC checkouts)
    WALLET=<shielded address>
    NOZY_NOTES_PATH=/api/notes    (change if your Nozy build uses another path)
"""
import base64
import logging
import os
import re
import secrets
import time
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP

import requests
from web3 import Web3

from backend.utils.instance import db
from backend.billing import near_intents
from backend.auth import billing_paystack as bs
from backend.auth.billing_paystack import BillingError
from backend.billing.crypto_models import CryptoCheckout, FINAL_STATUSES
from backend.utils.nozy_client import _nozy_sync, NOZY_API_URL, NOZY_API_KEY

logger = logging.getLogger(__name__)

ZEC_DISCOUNT_PCT = 8
CHECKOUT_MINUTES = 30
MAX_OPEN_PER_COMMUNITY = 3
ZEC_MIN_CONFIRMATIONS = 3
ZEC_AMOUNT_TOLERANCE = Decimal("0.995")      # accept >= 99.5% of the expected ZEC (network fee wiggle room)
STABLE_TOLERANCE = Decimal("0.99")           # accept >= 99% of the expected stablecoin amount
MIN_CHECK_GAP_SECONDS = 8                    # default gap between checks of the same checkout
BUTTON_CHECK_GAP_SECONDS = 3                 # gap used by the "I've paid" button (double-click guard)
LATE_WINDOW = timedelta(hours=24)            # keep watching expired ZEC memos this long -> 'late_paid'
ZEC_ADDRESS = os.getenv("WALLET")

# ZEC checkouts are refused while this is false.
ZEC_DETECTION_READY = os.getenv("ZEC_DETECTION_READY", "true").strip().lower() == "true"

NOZY_NOTES_PATH = os.getenv("NOZY_NOTES_PATH", "/api/notes")
NOZY_SYNC_EVERY_SECONDS = 20


class FulfilmentError(Exception):
    """Payment was received but the purchase could not be applied. A human must look at it."""


# =====================================================================
# ADAPTERS
# =====================================================================
def quote_plan_usd_cents(community, plan, interval):
    """
    Return (amount_cents, mode) for this community buying plan/interval.
    mode is new | upgrade | switch | renew.
    Uses the same maths as the Stripe route (no Stripe call) and raises BillingError for
    blocked changes (lower plan, yearly -> monthly, etc).
    """
    q = bs.quote_plan(community, plan, interval)
    return q["amount_cents"], q["mode"]


def pack_price_cents(community, pack_id):
    """Price of an extra-quest pack in cents. Raises BillingError if unknown / not allowed."""
    return bs.quote_pack(community, pack_id)["amount_cents"]


def fulfill_purchase(c: CryptoCheckout):
    """
    Give the buyer what they paid for, using the same functions the Stripe and wallet paths use.
    NOTE: those functions commit internally, so this is NOT one big transaction. That is why every
    call below is idempotent on ref and why _mark_paid_and_fulfil sets status="paid" only AFTER
    this returns.
    Raises FulfilmentError if nothing could be applied.
    """
    ref = f"crypto-{c.id}"
    cid = c.community_id

    if c.purpose == "quests":
        row = bs.credit_pack(cid, c.pack, amount_cents=c.charged_cents,
                             payment_method="crypto", ref=ref)
        if row is None:
            raise FulfilmentError(f"credit_pack returned nothing for checkout {c.id}")
        return

    if c.mode == "upgrade":
        row = bs.apply_upgrade(cid, c.plan, c.interval, amount_cents=c.charged_cents,
                               payment_method="crypto", ref=ref)
        if row is None:
            raise FulfilmentError(f"apply_upgrade returned nothing for checkout {c.id}")
        return

    # new | switch | renew
    community = bs.Community.query.get(int(cid))
    old_sub = community.subscription if community else None
    prev_method = old_sub.payment_method if old_sub else None
    prev_stripe_id = old_sub.stripe_subscription_id if old_sub else None
    prev_cancel_pending = bool(old_sub and old_sub.cancel_at_period_end)
    was_new = old_sub is None

    sub = bs.activate_plan(cid, c.plan, c.interval, amount_cents=c.charged_cents,
                           payment_method="crypto", invoice_id=ref)
    if sub is None:
        raise FulfilmentError(f"activate_plan returned nothing for checkout {c.id}")

    # activate_plan treats every non-card method like a wallet payment. Crypto is not a wallet:
    # there is no balance to auto-renew from, so don't switch that on by default.
    if was_new or prev_method == "card":
        sub.auto_renew_wallet = False
        db.session.commit()
        bs._save_expiry_job(cid, sub.expires_at)   # removes the wallet-renewal job it just added

    # activate_plan only cancels the old Stripe subscription for "wallet". Do it for crypto too,
    # otherwise a card subscriber who pays with crypto would still be billed on the card.
    if prev_stripe_id and not prev_cancel_pending:
        try:
            bs.stripe.Subscription.cancel(prev_stripe_id)
        except Exception:
            logger.exception("could not cancel stripe subscription %s after crypto payment", prev_stripe_id)


# =====================================================================
# NOZY: incoming shielded notes (with memos)
# =====================================================================
_nozy_last_sync = {"at": 0.0}


def _first(d, *keys, default=None):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return default


def _clean_memo(raw):
    """Shielded memos are padded with NUL bytes. Strip those and whitespace."""
    return str(raw or "").replace("\x00", "").strip()


def fetch_incoming_notes():
    """
    Return recent incoming shielded notes for our WALLET as a list of dicts:
      {"txid": str, "index": int, "amount_zat": int, "memo": str, "confirmations": int}

    Talks to Nozy: syncs the wallet (at most every NOZY_SYNC_EVERY_SECONDS), then reads the
    received notes from NOZY_NOTES_PATH. Field names are read flexibly; if your Nozy build
    returns different names, print resp.text once and adjust the keys below.
    """
    if time.time() - _nozy_last_sync["at"] > NOZY_SYNC_EVERY_SECONDS:
        ok, err = _nozy_sync()
        if not ok:
            raise RuntimeError(err)
        _nozy_last_sync["at"] = time.time()

    resp = requests.get(
        f"{NOZY_API_URL}{NOZY_NOTES_PATH}",
        headers={"X-API-Key": NOZY_API_KEY},
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Nozy notes error: HTTP {resp.status_code}")

    raw = resp.json()
    items = raw if isinstance(raw, list) else _first(raw, "notes", "transactions", "received", default=[])

    out = []
    for i, n in enumerate(items):
        direction = str(_first(n, "direction", "type", default="incoming")).lower()
        if direction in ("sent", "outgoing", "send"):
            continue

        zat = _first(n, "amount_zat", "amount_zatoshi", "value", "zatoshis")
        if zat is None:
            zec = _first(n, "amount_zec", "amount")
            if zec is None:
                continue
            zat = int(round(float(zec) * 100_000_000))

        out.append({
            "txid": str(_first(n, "txid", "tx_id", "tx_hash", default="")),
            "index": int(_first(n, "index", "output_index", "action_index", default=i)),
            "amount_zat": int(zat),
            "memo": _clean_memo(_first(n, "memo", "memo_text", default="")),
            "confirmations": int(_first(n, "confirmations", default=0)),
        })
    return out


# =====================================================================
# ZEC price (server side, cached, never returns 0)
# =====================================================================
_rate = {"v": None, "at": 0.0}


def get_zec_usd_rate():
    if _rate["v"] and time.time() - _rate["at"] < 60:
        return _rate["v"]
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
                         params={"ids": "zcash", "vs_currencies": "usd"}, timeout=10)
        price = r.json().get("zcash", {}).get("usd")
        if price and price > 0:
            _rate.update(v=Decimal(str(price)), at=time.time())
            return _rate["v"]
    except Exception:
        logger.exception("zec rate fetch failed")
    # stale is better than nothing for up to 10 minutes, but never invent a price
    if _rate["v"] and time.time() - _rate["at"] < 600:
        return _rate["v"]
    return None


# =====================================================================
# CREATE
# =====================================================================
def _err(msg):
    return BillingError(msg)


def _make_memo(community):
    """GLY-<community-slug>-<8 random hex>. The random part keeps every memo unique."""
    base = getattr(community, "slug", None) or re.sub(
        r"[^a-z0-9]+", "-", (getattr(community, "name", "") or "").lower()
    ).strip("-")
    base = (base or "community")[:30]
    return f"GLY-{base}-{secrets.token_hex(4).upper()}"          # max ~43 chars, column is 64


def _same_payment(row, user, purpose, plan, interval, pack, token, network, charged_cents):
    return (row.user_id == user.id and row.purpose == purpose and row.plan == plan
            and row.interval == interval and row.pack == pack
            and row.pay_token == token and row.pay_network == network
            and row.charged_cents == charged_cents)


def create_checkout(community, user, data):
    purpose = data.get("type")
    token = (data.get("token") or "").upper()
    network = data.get("network") or ("Zcash" if token == "ZEC" else "")
    if purpose not in ("plan", "quests"):
        raise _err("Invalid purchase.")
    if token == "ZEC":
        network = "Zcash"
        if not ZEC_DETECTION_READY:
            raise _err("ZEC payments are not available right now.")
    elif not near_intents.supported(token, network):
        raise _err("That token/network isn't supported.")

    if purpose == "plan":
        plan, interval, pack = data.get("plan"), data.get("interval"), None
        base_cents, mode = quote_plan_usd_cents(community, plan, interval)
    else:
        plan = interval = mode = None
        pack = str(data.get("pack") or "")
        base_cents = pack_price_cents(community, pack)

    discount = ZEC_DISCOUNT_PCT if token == "ZEC" else 0
    charged_cents = int((Decimal(base_cents) * (100 - discount) / 100).quantize(Decimal("1"), ROUND_HALF_UP))
    if charged_cents <= 0:
        raise _err("Nothing to pay for this change.")

    now = datetime.utcnow()

    # Every checkout of this community that is still inside its deadline.
    # "expired" + a future deadline only happens when WE closed it because the buyer picked
    # something else, so it can be brought back.
    live_rows = CryptoCheckout.query.filter(
        CryptoCheckout.community_id == community.id,
        CryptoCheckout.status.in_(("pending", "processing", "expired")),
        CryptoCheckout.expires_at > now,
    ).all()

    # 1) the exact same payment (same coin, network, purchase, price) -> bring the old one back
    match = next((r for r in live_rows
                  if _same_payment(r, user, purpose, plan, interval, pack, token, network, charged_cents)), None)
    if match:
        if match.status == "expired":
            match.status = "pending"
        # close this buyer's other unfinished payments ("processing" = money seen, never closed)
        for r in live_rows:
            if r.id != match.id and r.user_id == user.id and r.status == "pending":
                r.status = "expired"
        db.session.commit()
        return match

    # 2) something different -> close this buyer's unfinished payments, then create a new one.
    #    expires_at is left alone on purpose: the poller keeps watching them, so funds already
    #    sent to the old address/memo are still credited.
    for r in live_rows:
        if r.user_id == user.id and r.status == "pending":
            r.status = "expired"
    db.session.commit()

    still_open = [r for r in live_rows if r.status in ("pending", "processing")]
    if len(still_open) >= MAX_OPEN_PER_COMMUNITY:
        raise _err("There are several unfinished crypto payments for this community. Please wait for them to expire.")

    refund = None
    memo = None
    rate = None
    swap_est = None

    if token == "ZEC":
        if not ZEC_ADDRESS:
            raise _err("ZEC payments are not available right now.")
        rate = get_zec_usd_rate()
        if not rate:
            raise _err("Couldn't fetch the ZEC price. Please try again.")
        expected = (Decimal(charged_cents) / 100 / rate).quantize(Decimal("0.00000001"), ROUND_CEILING)
        address = ZEC_ADDRESS
        memo = _make_memo(community)
    else:
        refund = (data.get("refund_address") or "").strip()
        if not Web3.is_address(refund):
            raise _err("Enter a valid refund address on that network.")
        refund = Web3.to_checksum_address(refund)
        expected = (Decimal(charged_cents) / 100).quantize(Decimal("0.01"), ROUND_CEILING)  # stablecoins ~ $1
        try:
            q = near_intents.create_deposit(token, network, expected, refund, minutes=CHECKOUT_MINUTES)
        except near_intents.NearIntentsError as e:
            logger.error("near intents quote failed: %s", e)
            raise _err("Couldn't create a deposit address. Please try again.")
        address, swap_est = q["deposit_address"], q["est_zec"]

    c = CryptoCheckout(
        community_id=community.id, user_id=user.id, purpose=purpose, plan=plan, interval=interval,
        pack=pack, mode=mode, base_cents=base_cents, discount_pct=discount, charged_cents=charged_cents,
        pay_token=token, pay_network=network, deposit_address=address, memo=memo, refund_address=refund,
        zec_rate=rate, expected_amount=expected, swap_zec_amount=swap_est,
        swap_status="pending" if token != "ZEC" else None,
        status="pending", expires_at=now + timedelta(minutes=CHECKOUT_MINUTES), created_at=now,
    )
    db.session.add(c)
    db.session.commit()
    _wake_poller_safe()
    return c


# =====================================================================
# VERIFY  (safe to call from the button route AND the background poller)
# =====================================================================
_notes = {"at": 0.0, "data": []}


def _notes_cached():
    """One Nozy call per few seconds shared by every checkout in a poll cycle."""
    if time.time() - _notes["at"] > 6:
        _notes.update(data=fetch_incoming_notes() or [], at=time.time())
    return _notes["data"]


def _check_zec(c):
    try:
        notes = _notes_cached()
    except Exception as e:
        logger.warning("nozy notes fetch failed: %s", e)
        return {"kind": "error", "error": str(e)}
    want = (c.memo or "").strip()
    if not want:
        return {"kind": "none"}
    for n in notes:
        if _clean_memo(n.get("memo")) != want:
            continue
        ref = f"{n['txid']}:{n['index']}"
        used = CryptoCheckout.query.filter(CryptoCheckout.tx_ref == ref, CryptoCheckout.id != c.id).first()
        if used:
            continue
        if n.get("confirmations", 0) < ZEC_MIN_CONFIRMATIONS:
            return {"kind": "seen", "ref": ref}
        return {"kind": "zec", "ref": ref, "amount": Decimal(n["amount_zat"]) / Decimal(10 ** 8)}
    return {"kind": "none"}


def _check_swap(c):
    try:
        return {"kind": "swap", **near_intents.get_status(c.deposit_address)}
    except Exception as e:
        logger.warning("near intents status failed for checkout %s: %s", c.id, e)
        return {"kind": "error", "error": str(e)}


def verify_checkout(checkout_id, force=False, min_gap=None):
    """
    Check one checkout against Nozy / NEAR and apply the result.
      force=True   always check (background poller)
      min_gap      seconds that must pass since the last check (default MIN_CHECK_GAP_SECONDS)
    """
    c = db.session.get(CryptoCheckout, checkout_id)
    if not c or c.status in FINAL_STATUSES:
        return c

    now = datetime.utcnow()
    expired_for_long = now > c.expires_at + (LATE_WINDOW if c.pay_token == "ZEC" else timedelta(0))
    if expired_for_long and c.status == "expired":
        return c

    gap = MIN_CHECK_GAP_SECONDS if min_gap is None else min_gap
    if not force and c.last_checked_at and (now - c.last_checked_at).total_seconds() < gap:
        return c

    c.last_checked_at = now
    db.session.commit()

    ext = _check_zec(c) if c.pay_token == "ZEC" else _check_swap(c)   # no DB lock held during HTTP
    _apply(c.id, ext)
    return db.session.get(CryptoCheckout, checkout_id)


def verify_for_button(checkout_id):
    """Used by POST /billing/verify-plan-payment: one real check, only a tiny double-click guard."""
    return verify_checkout(checkout_id, force=False, min_gap=BUTTON_CHECK_GAP_SECONDS)


def _apply(checkout_id, ext):
    c = (CryptoCheckout.query.filter_by(id=checkout_id).with_for_update().first())
    if not c or c.status in FINAL_STATUSES:
        db.session.rollback()
        return

    now = datetime.utcnow()
    past_deadline = now > c.expires_at
    kind = ext.get("kind")

    # ---------------- ZEC (memo match) ----------------
    if kind == "zec":
        c.received_amount = ext["amount"]
        c.tx_ref = ext["ref"]
        if past_deadline:
            c.status = "late_paid"            # rate expired -> a human decides (refund / honour)
            logger.warning("crypto checkout %s paid after expiry (%s)", c.id, ext["ref"])
        elif ext["amount"] < c.expected_amount * ZEC_AMOUNT_TOLERANCE:
            c.status = "underpaid"
            logger.warning("crypto checkout %s underpaid: %s < %s", c.id, ext["amount"], c.expected_amount)
        else:
            _mark_paid_and_fulfil(c, now)
        db.session.commit()
        return

    if kind == "seen":
        # money seen on-chain: from now on this checkout is never closed by a newer one
        if c.status in ("pending", "expired") and not past_deadline:
            c.status = "processing"
        db.session.commit()
        return

    # ---------------- swap (USDT / USDC) ----------------
    if kind == "swap":
        phase = ext.get("phase")
        if phase == "processing":
            c.swap_status = "processing"
            if c.status in ("pending", "expired") and not past_deadline:
                c.status = "processing"
        elif phase == "failed":
            c.status = "failed"
            c.swap_status = (ext.get("state") or "failed").lower()
        elif phase == "success":
            amt_in, amt_out = ext.get("amount_in"), ext.get("amount_out")
            c.swap_status = "completed"
            c.tx_ref = ext.get("tx_hash")
            c.swap_zec_amount = amt_out
            c.received_amount = amt_in
            # money already arrived and swapped, so honour it even a bit after the deadline
            if amt_in is not None and amt_in < c.expected_amount * STABLE_TOLERANCE:
                c.status = "underpaid"
            else:
                _mark_paid_and_fulfil(c, now)
        db.session.commit()
        _expire_if_due(c)
        return

    # nothing seen / provider error
    db.session.rollback()
    _expire_if_due(db.session.get(CryptoCheckout, checkout_id))


def _expire_if_due(c):
    if c and c.status == "pending" and datetime.utcnow() > c.expires_at:
        c.status = "expired"
        db.session.commit()


def _mark_paid_and_fulfil(c, now):
    # Fulfil FIRST. The billing functions commit internally, so if status="paid" were set before
    # and one of them hit an idempotent early-exit rollback, the "paid" flag would be lost.
    # Expiry job + receipt email are handled inside activate_plan / apply_upgrade.
    try:
        fulfill_purchase(c)
    except FulfilmentError:
        logger.error("PAID BUT NOT FULFILLED: crypto checkout %s (community %s) needs manual review",
                     c.id, c.community_id, exc_info=True)
        c.status = "failed"
        return
    c.status = "paid"
    c.paid_at = now
    c.fulfilled_at = now


# =====================================================================
# Helpers for the routes
# =====================================================================
def _b64url(s):
    return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")


def checkout_payload(c):
    amount = f"{c.expected_amount:.8f}".rstrip("0").rstrip(".") if c.pay_token == "ZEC" else f"{c.expected_amount:.2f}"
    if c.pay_token == "ZEC":
        qr = f"zcash:{c.deposit_address}?amount={amount}&memo={_b64url(c.memo)}"   # ZIP-321
    else:
        qr = c.deposit_address
    return {
        "id": c.id,
        "status": c.status,
        "token": c.pay_token,
        "network": c.pay_network,
        "address": c.deposit_address,
        "memo": c.memo,
        "amount": amount,
        "usd": c.charged_cents / 100,
        "base_usd": c.base_cents / 100,
        "discount_pct": c.discount_pct,
        "qr": qr,
        "expires_at": int(c.expires_at.timestamp()),
        "server_time": int(datetime.utcnow().timestamp()),
    }


def _wake_poller_safe():
    try:
        from app import wake_evm_poller
        wake_evm_poller()
    except Exception:
        logger.exception("could not wake poller")


def poll_pending_checkouts():
    """
    Called by the background job (no HTTP route involved). Returns how many checkouts still
    need watching. Watches:
      * pending / processing checkouts
      * expired ZEC memos for LATE_WINDOW (a late payment becomes 'late_paid')
      * checkouts we closed ourselves (expired but still before their deadline), so money sent
        to an older address after the buyer switched coin is still credited
    """
    now = datetime.utcnow()
    rows = CryptoCheckout.query.filter(
        db.or_(
            CryptoCheckout.status.in_(("pending", "processing")),
            db.and_(CryptoCheckout.status == "expired", CryptoCheckout.pay_token == "ZEC",
                    CryptoCheckout.created_at > now - LATE_WINDOW),
            db.and_(CryptoCheckout.status == "expired", CryptoCheckout.expires_at > now),
        )
    ).all()
    for c in rows:
        try:
            verify_checkout(c.id, force=True)
        except Exception:
            logger.exception("background verify failed for crypto checkout %s", c.id)
            db.session.rollback()
    return len(rows)