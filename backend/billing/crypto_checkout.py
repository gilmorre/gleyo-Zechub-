import base64
import logging
import os
import re
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_CEILING, ROUND_HALF_UP
from email.message import EmailMessage

import requests
from web3 import Web3

from backend.utils.instance import db
from backend.utils.utils import send_email
from backend.billing import near_intents
from backend.auth import billing_paystack as bs
from backend.auth.billing_paystack import BillingError
from backend.billing.crypto_models import CryptoCheckout, FINAL_STATUSES
from backend.utils.nozy_client import NOZY_API_URL, NOZY_API_KEY, NOZY_WALLET_PASSWORD

logger = logging.getLogger(__name__)

ZEC_DISCOUNT_PCT = 8
CHECKOUT_MINUTES = 30
MAX_OPEN_PER_COMMUNITY = 3
ZEC_AMOUNT_TOLERANCE = Decimal("0.995")
STABLE_TOLERANCE = Decimal("0.99")
MIN_CHECK_GAP_SECONDS = 8
BUTTON_CHECK_GAP_SECONDS = 3
LATE_WINDOW = timedelta(hours=24)
ZEC_CLOCK_SKEW = timedelta(seconds=120)
ZEC_ADDRESS = os.getenv("WALLET")
ADMIN_ALERT_EMAIL = os.getenv("ADMIN_ALERT_EMAIL")

ZEC_DETECTION_READY = os.getenv("ZEC_DETECTION_READY", "true").strip().lower() == "true"

NOZY_SYNC_EVERY_SECONDS = 5
ZAT = Decimal(10 ** 8)

# ZEC amounts are rounded UP to this step and shown with ZEC_DP decimals.
ZEC_DP = 3
ZEC_STEP = Decimal(1).scaleb(-ZEC_DP)  # Decimal("0.001")


def _dbg(msg, *args):
    logger.info("[crypto] " + msg, *args)


def _dec(v):
    return v if isinstance(v, Decimal) else Decimal(str(v))


def _zec_up(v):
    return _dec(v).quantize(ZEC_STEP, ROUND_CEILING)


# kept so any old imports of the previous name keep working
_zec_2dp_up = _zec_up


class FulfilmentError(Exception):
    pass


def _alert_admin(c, reason):
    body = (
        f"Crypto checkout {c.id} needs manual review.\n\n"
        f"Reason: {reason}\n"
        f"Status: {c.status}\n"
        f"Community: {c.community_id}\n"
        f"User: {c.user_id}\n"
        f"Purpose: {c.purpose} plan={c.plan} interval={c.interval} pack={c.pack} mode={c.mode}\n"
        f"Token: {c.pay_token} ({c.pay_network})\n"
        f"Expected: {c.expected_amount}\n"
        f"Received: {c.received_amount}\n"
        f"Charged USD: {c.charged_cents / 100:.2f}\n"
        f"Tx ref: {c.tx_ref}\n"
        f"Memo: {c.memo}\n"
        f"Deposit address: {c.deposit_address}\n"
        f"Expires at: {c.expires_at}\n"
        f"Paid at: {c.paid_at}\n"
    )
    subject = f"Crypto payment needs review: checkout {c.id} ({reason})"
    logger.error("[crypto] ALERT checkout %s: %s", c.id, reason)
    if not ADMIN_ALERT_EMAIL:
        logger.error("[crypto] ADMIN_ALERT_EMAIL not set, alert for checkout %s not emailed", c.id)
        return

    def _send():
        try:
            msg = EmailMessage()
            msg["From"] = "Gleyo <noreply@gleyo.app>"
            msg["To"] = ADMIN_ALERT_EMAIL
            msg["Subject"] = subject
            msg.set_content(body)
            send_email(msg)
        except Exception:
            logger.exception("crypto alert email failed for checkout %s", c.id)

    threading.Thread(target=_send, daemon=True).start()


def quote_plan_usd_cents(community, plan, interval):
    q = bs.quote_plan(community, plan, interval)
    return q["amount_cents"], q["mode"]


def pack_price_cents(community, pack_id):
    return bs.quote_pack(community, pack_id)["amount_cents"]


def fulfill_purchase(c: CryptoCheckout):
    ref = f"crypto-{c.id}"
    cid = c.community_id
    _dbg("fulfil start checkout=%s purpose=%s plan=%s interval=%s pack=%s mode=%s cents=%s ref=%s",
         c.id, c.purpose, c.plan, c.interval, c.pack, c.mode, c.charged_cents, ref)

    if c.purpose == "quests":
        row = bs.credit_pack(cid, c.pack, amount_cents=c.charged_cents,
                             payment_method="crypto", ref=ref)
        if row is None:
            raise FulfilmentError(f"credit_pack returned nothing for checkout {c.id}")
        _dbg("fulfil done (quests) checkout=%s", c.id)
        return

    if c.mode == "upgrade":
        row = bs.apply_upgrade(cid, c.plan, c.interval, amount_cents=c.charged_cents,
                               payment_method="crypto", ref=ref)
        if row is None:
            raise FulfilmentError(f"apply_upgrade returned nothing for checkout {c.id}")
        _dbg("fulfil done (upgrade) checkout=%s", c.id)
        return

    sub = bs.activate_plan(cid, c.plan, c.interval, amount_cents=c.charged_cents,
                           payment_method="crypto", invoice_id=ref)
    if sub is None:
        raise FulfilmentError(f"activate_plan returned nothing for checkout {c.id}")
    _dbg("fulfil done (plan) checkout=%s", c.id)


_nozy = {"at": 0.0, "txs": None}

_FRAC_RE = re.compile(r"\.(\d+)")


def _parse_ts(s):
    if not s:
        return None
    try:
        s = str(s).strip().replace("Z", "+00:00")
        s = _FRAC_RE.sub(lambda m: "." + (m.group(1) + "000000")[:6], s, count=1)
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        logger.warning("[crypto] could not parse timestamp %r", s)
        return None


def _nozy_headers():
    return {"X-API-Key": NOZY_API_KEY}


def _nozy_history(force=False):
    if not force and _nozy["txs"] is not None and time.time() - _nozy["at"] < NOZY_SYNC_EVERY_SECONDS:
        _dbg("nozy: using cached history (%s txs, age %.1fs)", len(_nozy["txs"]), time.time() - _nozy["at"])
        return _nozy["txs"]

    t0 = time.time()
    try:
        sr = requests.post(f"{NOZY_API_URL}/api/sync",
                           json={"password": NOZY_WALLET_PASSWORD},
                           headers=_nozy_headers(), timeout=120)
        _dbg("nozy: POST /api/sync -> HTTP %s in %.1fs body=%s",
             sr.status_code, time.time() - t0, (sr.text or "")[:300])
        if sr.status_code != 200:
            logger.warning("[crypto] nozy sync not OK (HTTP %s), will still read history", sr.status_code)
    except Exception as e:
        logger.warning("[crypto] nozy sync request failed: %s (will still read history)", e)

    try:
        hr = requests.get(f"{NOZY_API_URL}/api/transaction/history",
                          headers=_nozy_headers(), timeout=30)
    except Exception as e:
        raise RuntimeError(f"Nozy history failed: {e}")
    if hr.status_code != 200:
        raise RuntimeError(f"Nozy history failed: HTTP {hr.status_code} {(hr.text or '')[:200]}")
    try:
        raw = hr.json().get("transactions") or []
    except Exception:
        raise RuntimeError("Nozy history returned invalid JSON")

    txs = []
    for t in raw:
        try:
            zat = int(t.get("amount_zatoshis") or 0)
        except Exception:
            zat = 0
        ttype = str(t.get("type") or t.get("transaction_type") or "").lower()
        try:
            confs = int(t.get("confirmations") or 0)
        except Exception:
            confs = 0
        status = str(t.get("status") or "").lower()
        txs.append({
            "txid": t.get("txid"),
            "type": ttype,
            "zat": zat,
            "amount": Decimal(zat) / ZAT,
            "is_change": bool(t.get("is_change")),
            "memo": (t.get("memo") or "") or "",
            "status": status,
            "confirmations": confs,
            "confirmed": status == "confirmed" or confs >= 1,
            "created": _parse_ts(t.get("created_at")),
            "block_height": t.get("block_height"),
        })

    _dbg("nozy: history has %s txs (%s received)", len(txs), sum(1 for x in txs if x["type"] == "received"))
    _nozy.update(txs=txs, at=time.time())
    return txs


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
            _dbg("zec rate fetched: %s", price)
            return _rate["v"]
    except Exception:
        logger.exception("zec rate fetch failed")
    if _rate["v"] and time.time() - _rate["at"] < 600:
        _dbg("zec rate: using stale cached value %s", _rate["v"])
        return _rate["v"]
    return None


def _err(msg):
    return BillingError(msg)


def _make_memo(community):
    base = getattr(community, "slug", None) or re.sub(
        r"[^a-z0-9]+", "-", (getattr(community, "name", "") or "").lower()
    ).strip("-")
    base = (base or "community")[:30]
    return f"GLY-{base}-{secrets.token_hex(4).upper()}"


def _same_payment(row, user, purpose, plan, interval, pack, token, network, charged_cents):
    return (row.user_id == user.id and row.purpose == purpose and row.plan == plan
            and row.interval == interval and row.pack == pack
            and row.pay_token == token and row.pay_network == network
            and row.charged_cents == charged_cents)


def create_checkout(community, user, data):
    purpose = data.get("type")
    token = (data.get("token") or "").upper()
    network = data.get("network") or ("Zcash" if token == "ZEC" else "")
    _dbg("create_checkout community=%s user=%s purpose=%s token=%s network=%s",
         community.id, user.id, purpose, token, network)
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
    _dbg("pricing base_cents=%s discount=%s%% charged_cents=%s mode=%s", base_cents, discount, charged_cents, mode)
    if charged_cents <= 0:
        raise _err("Nothing to pay for this change.")

    now = datetime.utcnow()

    live_rows = CryptoCheckout.query.filter(
        CryptoCheckout.community_id == community.id,
        CryptoCheckout.status.in_(("pending", "processing", "expired")),
        CryptoCheckout.expires_at > now,
    ).all()

    match = next((r for r in live_rows
                  if _same_payment(r, user, purpose, plan, interval, pack, token, network, charged_cents)), None)
    if match:
        _dbg("reusing existing checkout %s (status %s) with locked amount=%s rate=%s",
             match.id, match.status, match.expected_amount, match.zec_rate)
        if match.status == "expired":
            match.status = "pending"
        for r in live_rows:
            if r.id != match.id and r.user_id == user.id and r.status == "pending":
                r.status = "expired"
        db.session.commit()
        return match

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
        raw_zec = Decimal(charged_cents) / 100 / rate
        expected = _zec_up(raw_zec)
        address = ZEC_ADDRESS
        memo = _make_memo(community)
        _dbg("ZEC price LOCKED: usd=%s rate=%s raw_zec=%s expected(%sdp up)=%s memo=%s",
             Decimal(charged_cents) / 100, rate, raw_zec, ZEC_DP, expected, memo)
    else:
        refund = (data.get("refund_address") or "").strip()
        if not Web3.is_address(refund):
            raise _err("Enter a valid refund address on that network.")
        refund = Web3.to_checksum_address(refund)
        expected = (Decimal(charged_cents) / 100).quantize(Decimal("0.01"), ROUND_CEILING)
        try:
            q = near_intents.create_deposit(token, network, expected, refund, minutes=CHECKOUT_MINUTES)
        except near_intents.NearIntentsError as e:
            logger.error("near intents quote failed: %s", e)
            raise _err("Couldn't create a deposit address. Please try again.")
        address, swap_est = q["deposit_address"], q["est_zec"]
        _dbg("swap checkout: %s/%s expected=%s deposit=%s est_zec=%s refund=%s quote_raw=%s",
             token, network, expected, address, swap_est, refund, q)

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
    _dbg("checkout CREATED id=%s token=%s expected=%s rate=%s expires_at=%s",
         c.id, token, expected, rate, c.expires_at)
    _wake_poller_safe()
    return c


def _claimed_txids(exclude_id):
    rows = CryptoCheckout.query.filter(
        CryptoCheckout.pay_token == "ZEC",
        CryptoCheckout.id != exclude_id,
        CryptoCheckout.tx_ref.isnot(None),
    ).all()
    return {r.tx_ref for r in rows if r.tx_ref}


def _open_zec_ids():
    now = datetime.utcnow()
    rows = CryptoCheckout.query.filter(
        CryptoCheckout.pay_token == "ZEC",
        db.or_(
            CryptoCheckout.status.in_(("pending", "processing")),
            db.and_(CryptoCheckout.status == "expired", CryptoCheckout.created_at > now - LATE_WINDOW),
        ),
    ).with_entities(CryptoCheckout.id).all()
    return {r[0] for r in rows}


def _check_zec(c):
    try:
        txs = _nozy_history()
    except Exception as e:
        logger.warning("[crypto] zec checkout %s: history failed: %s", c.id, e)
        return {"kind": "error", "error": str(e)}

    expected = _dec(c.expected_amount)
    since = c.created_at - ZEC_CLOCK_SKEW
    claimed = _claimed_txids(c.id)
    threshold = expected * ZEC_AMOUNT_TOLERANCE
    memoless_ok = _open_zec_ids() == {c.id}
    _dbg("zec checkout %s: looking for received tx since %s, locked expected=%s threshold=%s, claimed_by_others=%s memoless_ok=%s",
         c.id, since, expected, threshold, len(claimed), memoless_ok)

    candidates = []
    for t in txs:
        short = (t["txid"] or "")[:12]
        if t["type"] != "received":
            _dbg("  skip tx %s: type=%s", short, t["type"])
            continue
        if t["is_change"]:
            _dbg("  skip tx %s: change output", short)
            continue
        if t["zat"] <= 0:
            _dbg("  skip tx %s: zero amount", short)
            continue
        if t["txid"] in claimed:
            _dbg("  skip tx %s: already claimed by another checkout", short)
            continue
        if t["created"] is None:
            _dbg("  skip tx %s: no usable created_at", short)
            continue
        if t["created"] < since:
            _dbg("  skip tx %s: older than checkout (%s < %s)", short, t["created"], since)
            continue
        memo = t["memo"]
        if memo.startswith("GLY-") and c.memo and c.memo not in memo:
            _dbg("  skip tx %s: memo %r belongs to another checkout", short, memo[:40])
            continue
        memo_match = bool(c.memo and c.memo in memo)
        if not memo_match and not memoless_ok:
            _dbg("  skip tx %s: no memo match and other ZEC checkouts are open", short)
            continue
        _dbg("  CANDIDATE tx %s: amount=%s confirmed=%s confs=%s status=%s memo_match=%s created=%s",
             short, t["amount"], t["confirmed"], t["confirmations"], t["status"], memo_match, t["created"])
        candidates.append({**t, "memo_match": memo_match})

    if not candidates:
        _dbg("zec checkout %s: no matching received tx yet", c.id)
        return {"kind": "none"}

    candidates.sort(key=lambda x: (not x["memo_match"], x["created"]))

    enough_confirmed = [x for x in candidates if x["confirmed"] and x["amount"] >= threshold]
    if enough_confirmed:
        t = enough_confirmed[0]
        _dbg("zec checkout %s: PAID by tx %s amount=%s (locked expected=%s)", c.id, t["txid"], t["amount"], expected)
        return {"kind": "zec", "ref": t["txid"], "amount": t["amount"]}

    enough_pending = [x for x in candidates if not x["confirmed"] and x["amount"] >= threshold]
    if enough_pending:
        t = enough_pending[0]
        _dbg("zec checkout %s: payment SEEN but unconfirmed tx %s amount=%s", c.id, t["txid"], t["amount"])
        return {"kind": "seen", "ref": t["txid"], "amount": t["amount"]}

    confirmed_low = [x for x in candidates if x["confirmed"]]
    if confirmed_low:
        t = max(confirmed_low, key=lambda x: x["amount"])
        _dbg("zec checkout %s: PARTIAL tx %s amount=%s < threshold %s", c.id, t["txid"], t["amount"], threshold)
        return {"kind": "partial", "ref": t["txid"], "amount": t["amount"]}

    t = candidates[0]
    _dbg("zec checkout %s: only unconfirmed low-amount tx %s amount=%s", c.id, t["txid"], t["amount"])
    return {"kind": "seen", "ref": t["txid"], "amount": t["amount"]}


def _check_swap(c):
    try:
        st = near_intents.get_status(c.deposit_address)
        _dbg("swap checkout %s: near-intents status for %s -> %s", c.id, c.deposit_address, st)
        return {"kind": "swap", **st}
    except Exception as e:
        logger.warning("[crypto] near intents status failed for checkout %s: %s", c.id, e)
        return {"kind": "error", "error": str(e)}


def verify_checkout(checkout_id, force=False, min_gap=None):
    c = db.session.get(CryptoCheckout, checkout_id)
    if not c:
        _dbg("verify: checkout %s not found", checkout_id)
        return c
    if c.status in FINAL_STATUSES:
        _dbg("verify: checkout %s already final (%s)", c.id, c.status)
        return c

    now = datetime.utcnow()
    expired_for_long = now > c.expires_at + (LATE_WINDOW if c.pay_token == "ZEC" else timedelta(0))
    if expired_for_long and c.status == "expired":
        _dbg("verify: checkout %s expired beyond late window, ignoring", c.id)
        return c

    gap = MIN_CHECK_GAP_SECONDS if min_gap is None else min_gap
    if not force and c.last_checked_at and (now - c.last_checked_at).total_seconds() < gap:
        _dbg("verify: checkout %s checked %.1fs ago (< %ss), skipping",
             c.id, (now - c.last_checked_at).total_seconds(), gap)
        return c

    _dbg("verify: checkout %s token=%s status=%s force=%s", c.id, c.pay_token, c.status, force)
    c.last_checked_at = now
    db.session.commit()

    ext = _check_zec(c) if c.pay_token == "ZEC" else _check_swap(c)
    _dbg("verify: checkout %s external result kind=%s detail=%s", c.id, ext.get("kind"), ext)
    _apply(c.id, ext)
    c2 = db.session.get(CryptoCheckout, checkout_id)
    _dbg("verify: checkout %s status now %s", checkout_id, c2.status if c2 else None)
    return c2


def verify_for_button(checkout_id):
    return verify_checkout(checkout_id, force=False, min_gap=BUTTON_CHECK_GAP_SECONDS)


def _apply(checkout_id, ext):
    c = (CryptoCheckout.query.filter_by(id=checkout_id).with_for_update().first())
    if not c or c.status in FINAL_STATUSES:
        _dbg("apply: checkout %s missing or already final, nothing to do", checkout_id)
        db.session.rollback()
        return

    now = datetime.utcnow()
    past_deadline = now > c.expires_at
    kind = ext.get("kind")
    _dbg("apply: checkout %s kind=%s status=%s past_deadline=%s", c.id, kind, c.status, past_deadline)

    if kind == "zec":
        clash = CryptoCheckout.query.filter(
            CryptoCheckout.id != c.id, CryptoCheckout.tx_ref == ext["ref"]).first()
        if clash:
            logger.warning("[crypto] tx %s already claimed by checkout %s, ignoring for %s",
                           ext["ref"], clash.id, c.id)
            db.session.rollback()
            return
        alert = None
        c.received_amount = ext["amount"]
        c.tx_ref = ext["ref"]
        if past_deadline:
            c.status = "late_paid"
            c.paid_at = now
            alert = "paid after the checkout expired, nothing was applied"
            logger.warning("[crypto] checkout %s paid after expiry (%s)", c.id, ext["ref"])
        else:
            if not _mark_paid_and_fulfil(c, now):
                alert = "payment received but the purchase could not be applied"
            c.received_amount = ext["amount"]
            c.tx_ref = ext["ref"]
        db.session.commit()
        _dbg("apply: checkout %s -> %s", c.id, c.status)
        if alert:
            _alert_admin(c, alert)
        return

    if kind == "partial":
        alert = None
        c.received_amount = ext["amount"]
        if past_deadline:
            c.status = "underpaid"
            c.tx_ref = ext["ref"]
            c.paid_at = now
            alert = "underpaid and the checkout expired, nothing was applied"
            logger.warning("[crypto] checkout %s underpaid: %s < %s", c.id, ext["amount"], c.expected_amount)
        elif c.status in ("pending", "expired"):
            c.status = "processing"
        db.session.commit()
        _dbg("apply: checkout %s -> %s (partial)", c.id, c.status)
        if alert:
            _alert_admin(c, alert)
        return

    if kind == "seen":
        if c.status in ("pending", "expired") and not past_deadline:
            c.status = "processing"
        db.session.commit()
        _dbg("apply: checkout %s -> %s (seen)", c.id, c.status)
        return

    if kind == "swap":
        phase = ext.get("phase")
        alert = None
        _dbg("apply: swap checkout %s phase=%s state=%s amount_in=%s amount_out=%s tx=%s",
             c.id, phase, ext.get("state"), ext.get("amount_in"), ext.get("amount_out"), ext.get("tx_hash"))
        if phase == "processing":
            c.swap_status = "processing"
            if c.status in ("pending", "expired") and not past_deadline:
                c.status = "processing"
        elif phase == "failed":
            c.status = "failed"
            c.swap_status = (ext.get("state") or "failed").lower()
            logger.warning("[crypto] swap FAILED for checkout %s state=%s", c.id, ext.get("state"))
        elif phase == "success":
            amt_in, amt_out = ext.get("amount_in"), ext.get("amount_out")
            tx_hash = ext.get("tx_hash")
            c.swap_status = "completed"
            c.tx_ref = tx_hash
            c.swap_zec_amount = amt_out
            c.received_amount = amt_in
            if amt_in is not None and _dec(amt_in) < _dec(c.expected_amount) * STABLE_TOLERANCE:
                c.status = "underpaid"
                alert = "swap completed but the amount received was too low, nothing was applied"
                logger.warning("[crypto] swap underpaid checkout %s: in=%s expected=%s",
                               c.id, amt_in, c.expected_amount)
            else:
                if not _mark_paid_and_fulfil(c, now):
                    alert = "payment received but the purchase could not be applied"
                c.swap_status = "completed"
                c.tx_ref = tx_hash
                c.swap_zec_amount = amt_out
                c.received_amount = amt_in
        else:
            _dbg("apply: swap checkout %s has no actionable phase (%r) - waiting for deposit", c.id, phase)
        db.session.commit()
        _dbg("apply: checkout %s -> %s (swap)", c.id, c.status)
        if alert:
            _alert_admin(c, alert)
        _expire_if_due(c)
        return

    _dbg("apply: checkout %s nothing to apply (kind=%s error=%s)", c.id, kind, ext.get("error"))
    db.session.rollback()
    _expire_if_due(db.session.get(CryptoCheckout, checkout_id))


def _expire_if_due(c):
    if c and c.status == "pending" and datetime.utcnow() > c.expires_at:
        c.status = "expired"
        db.session.commit()
        _dbg("checkout %s marked expired", c.id)


def _mark_paid_and_fulfil(c, now):
    try:
        fulfill_purchase(c)
    except FulfilmentError:
        logger.error("PAID BUT NOT FULFILLED: crypto checkout %s (community %s) needs manual review",
                     c.id, c.community_id, exc_info=True)
        c.status = "failed"
        return False
    c.status = "paid"
    c.paid_at = now
    c.fulfilled_at = now
    _dbg("checkout %s PAID and FULFILLED", c.id)
    return True


def _b64url(s):
    return base64.urlsafe_b64encode(s.encode()).decode().rstrip("=")


def checkout_payload(c):
    if c.pay_token == "ZEC":
        amount = f"{_zec_up(c.expected_amount):.{ZEC_DP}f}"
    else:
        amount = f"{_dec(c.expected_amount):.2f}"

    if c.pay_token == "ZEC":
        qr = f"zcash:{c.deposit_address}?amount={amount}&memo={_b64url(c.memo)}"
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
    now = datetime.utcnow()
    rows = CryptoCheckout.query.filter(
        db.or_(
            CryptoCheckout.status.in_(("pending", "processing")),
            db.and_(CryptoCheckout.status == "expired", CryptoCheckout.pay_token == "ZEC",
                    CryptoCheckout.created_at > now - LATE_WINDOW),
            db.and_(CryptoCheckout.status == "expired", CryptoCheckout.expires_at > now),
        )
    ).all()
    _dbg("poller: %s open checkouts", len(rows))
    for c in rows:
        try:
            verify_checkout(c.id, force=True)
        except Exception:
            logger.exception("background verify failed for crypto checkout %s", c.id)
            db.session.rollback()
    return len(rows)