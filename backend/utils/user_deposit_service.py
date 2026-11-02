"""
User-balance deposit verification.

Native ZEC deposits are matched by MEMO (the user's Gleyo username) against the
Nozy wallet's transaction history. No balance-delta logic: create just saves the
row, verify syncs the wallet, reads /api/transaction/history and matches.
EVM deposits (USDT/USDC) still settle through Defuse.
"""
import os
import re
import time
import logging
import threading
from decimal import Decimal
import requests
from datetime import datetime, timedelta, timezone

from backend.utils.instance import db
from backend.models.models import UserTransaction, UserBalance

from backend.utils.nozy_client import NOZY_API_URL, NOZY_API_KEY, NOZY_WALLET_PASSWORD

logger = logging.getLogger(__name__)

DEFUSE_API_BASE = "https://1click.chaindefuser.com/v0"
DEFUSE_JWT_TOKEN = os.getenv("DEFUSE_JWT_TOKEN")

NOZY_ZEC_DEPOSIT_ADDRESS = os.getenv("WALLET")
ZCASHD_SHIELDED_ADDRESS = os.getenv("ZCASHD_FROM_ADDRESS")
EVM_WALLET_REFUND = os.getenv("EVM_WALLET")

SUCCESS_STATUSES = {"SUCCESS"}
FAILURE_STATUSES = {"REFUNDED", "FAILED", "INCOMPLETE_DEPOSIT"}
LOCKING_STATUSES = {"KNOWN_DEPOSIT_TX", "PROCESSING"}

DEPOSIT_WINDOW_SECONDS = 1800  # 30 min
MIN_ZEC_DEPOSIT = Decimal("0.0001")

ZAT = Decimal(10 ** 8)
ZEC_CLOCK_SKEW = timedelta(seconds=120)
NOZY_SYNC_EVERY_SECONDS = 5

CHAIN_ALIASES = {
    "polygon": "pol", "polygon mainnet": "pol", "matic": "pol",
    "ethereum": "eth",
    "binance": "bsc", "binance smart chain": "bsc",
    "base": "base", "bsc": "bsc", "zec": "zec",
}


# ══════════════════════════ HELPERS ══════════════════════════

def get_asset_id(blockchain, contract_address=None):
    response = requests.get(f"{DEFUSE_API_BASE}/tokens", timeout=20)
    response.raise_for_status()
    tokens = response.json()

    blockchain = CHAIN_ALIASES.get(blockchain.lower(), blockchain.lower())
    if contract_address:
        contract_address = contract_address.lower()

    for token in tokens:
        if token.get("blockchain", "").lower() != blockchain:
            continue
        token_contract = token.get("contractAddress")
        if contract_address is None:
            if token_contract is None:
                return token["assetId"]
        else:
            if token_contract and token_contract.lower() == contract_address:
                return token["assetId"]

    raise RuntimeError(f"No asset found for {blockchain} {contract_address}")


def _get_or_create_balance(user_id):
    bal = UserBalance.query.filter_by(user_id=user_id).first()
    if not bal:
        bal = UserBalance(user_id=user_id, balance=0, total_earned=0, total_withdrawn=0)
        db.session.add(bal)
        db.session.flush()
    return bal


def _wake_poller_safe():
    try:
        from app import wake_evm_poller
        wake_evm_poller()
    except Exception as e:
        logger.warning("Could not wake poller from user_deposit_service: %s", e)


def _extract_tx_hash(tx_list):
    if not tx_list:
        return None
    first = tx_list[0]
    if isinstance(first, str):
        return first
    if isinstance(first, dict):
        return first.get('hash') or first.get('txHash') or first.get('tx_hash')
    return None


def _username_for(user_id):
    """Memo = the user's Gleyo username. Change the import if your User model lives elsewhere."""
    from backend.models.models import Users
    user = db.session.get(Users, user_id)
    if not user or not getattr(user, "username", None):
        raise RuntimeError("User has no username to use as memo")
    return user.username


def _memo_matches(tx_memo, username):
    """True if the username appears in the memo as a whole word (so 'bob' does not match 'bobby')."""
    if not tx_memo or not username:
        return False
    pattern = r"(?<![A-Za-z0-9_])" + re.escape(username.strip()) + r"(?![A-Za-z0-9_])"
    return re.search(pattern, tx_memo, re.IGNORECASE) is not None


# ══════════════════════════ NOZY HISTORY ══════════════════════════

_nozy = {"at": 0.0, "txs": None}
_nozy_lock = threading.Lock()
_FRAC_RE = re.compile(r"\.(\d+)")


def _nozy_headers():
    return {"X-API-Key": NOZY_API_KEY}


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
        logger.warning("[deposit] could not parse timestamp %r", s)
        return None


def _nozy_history(force=False):
    """Sync the wallet, then read history. Cached for a few seconds, one refresh at a time."""
    with _nozy_lock:
        if (not force and _nozy["txs"] is not None
                and time.time() - _nozy["at"] < NOZY_SYNC_EVERY_SECONDS):
            return _nozy["txs"]

        t0 = time.time()
        try:
            sr = requests.post(f"{NOZY_API_URL}/api/sync",
                               json={"password": NOZY_WALLET_PASSWORD},
                               headers=_nozy_headers(), timeout=120)
            logger.info("[deposit] nozy sync -> HTTP %s in %.1fs", sr.status_code, time.time() - t0)
            if sr.status_code != 200:
                logger.warning("[deposit] nozy sync not OK (HTTP %s), still reading history", sr.status_code)
        except Exception as e:
            logger.warning("[deposit] nozy sync failed: %s (still reading history)", e)

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
            })

        _nozy["txs"] = txs
        _nozy["at"] = time.time()
        return txs


def _claimed_txids(exclude_id):
    """txids already used by another user deposit or by a community crypto checkout."""
    used = {r[0] for r in db.session.query(UserTransaction.tx_hash)
            .filter(UserTransaction.tx_hash.isnot(None), UserTransaction.id != exclude_id).all()}
    try:
        from backend.billing.crypto_models import CryptoCheckout
        used |= {r[0] for r in db.session.query(CryptoCheckout.tx_ref)
                 .filter(CryptoCheckout.tx_ref.isnot(None)).all()}
    except Exception as e:
        logger.warning("[deposit] could not read CryptoCheckout claims: %s", e)
    return used


# ══════════════════════════ CREATE ══════════════════════════

def create_zec_deposit(user_id, amount):
    """Native ZEC deposit. User sends ZEC to our wallet WITH their username as memo.

    No balance snapshot, no sync. Just save the row and return.
    """
    if not NOZY_ZEC_DEPOSIT_ADDRESS:
        raise RuntimeError("WALLET env var missing")
    if Decimal(str(amount)) < MIN_ZEC_DEPOSIT:
        raise ValueError(f"Minimum deposit is {MIN_ZEC_DEPOSIT} ZEC")

    memo = _username_for(user_id)

    now = datetime.utcnow()
    tx = UserTransaction(
        user_id=user_id,
        type='in',
        status='pending',
        amount=amount,
        token='ZEC',
        network='Zcash',
        to_address=NOZY_ZEC_DEPOSIT_ADDRESS,
        created_at=now,
        expires_at=now + timedelta(seconds=DEPOSIT_WINDOW_SECONDS),
        remark='Deposit · ZEC',
    )
    # Stored only if you add a `memo` column to UserTransaction; otherwise looked up at verify time.
    if hasattr(UserTransaction, "memo"):
        tx.memo = memo
    db.session.add(tx)
    db.session.commit()
    return tx


def create_evm_deposit(user_id, token, network, amount, refund_address=None,
                       token_contract=None, token_decimals=None):
    """USDT/USDC deposit: Defuse quote + deposit address, settles as ZEC."""
    if not DEFUSE_JWT_TOKEN:
        raise RuntimeError("DEFUSE_JWT_TOKEN missing")
    if not ZCASHD_SHIELDED_ADDRESS:
        raise RuntimeError("ZCASHD_FROM_ADDRESS missing")
    if token_contract is None or token_decimals is None:
        raise RuntimeError(f"No token config for {token}/{network}")

    origin_asset = get_asset_id(network, token_contract)
    destination_asset = get_asset_id("zec")

    amount_smallest = str(int(Decimal(str(amount)) * (10 ** token_decimals)))

    deadline = (
        datetime.now(timezone.utc) + timedelta(minutes=30)
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    payload = {
        "dry": False,
        "swapType": "EXACT_INPUT",
        "slippageTolerance": 100,
        "originAsset": origin_asset,
        "destinationAsset": destination_asset,
        "amount": amount_smallest,
        "depositType": "ORIGIN_CHAIN",
        "refundTo": refund_address or EVM_WALLET_REFUND,
        "refundType": "ORIGIN_CHAIN",
        "recipient": ZCASHD_SHIELDED_ADDRESS,
        "recipientType": "DESTINATION_CHAIN",
        "deadline": deadline,
    }

    quote_resp = requests.post(
        f"{DEFUSE_API_BASE}/quote",
        json=payload,
        headers={"Authorization": f"Bearer {DEFUSE_JWT_TOKEN}",
                 "Content-Type": "application/json"},
        timeout=20,
    )
    if not quote_resp.ok:
        raise RuntimeError(f"Defuse quote failed ({quote_resp.status_code}): {quote_resp.text}")
    data = quote_resp.json()
    quote = data.get("quote", {})

    deposit_address = data.get("depositAddress") or quote.get("depositAddress")
    estimated_zec = quote.get("amountOutFormatted")
    if not deposit_address or estimated_zec is None:
        raise RuntimeError("Malformed Defuse quote response")

    now = datetime.utcnow()
    tx = UserTransaction(
        user_id=user_id,
        type='in',
        status='pending',
        amount=amount,          # origin amount, in origin token, as typed
        token=token,            # origin token, overwritten to 'ZEC' on success
        network=network,
        to_address=deposit_address,
        swap_status='pending',
        swap_zec_amount=float(estimated_zec),
        created_at=now,
        expires_at=now + timedelta(seconds=DEPOSIT_WINDOW_SECONDS),
        remark=f'Deposit · {token} ({network})',
    )
    db.session.add(tx)
    db.session.commit()
    _wake_poller_safe()
    return tx


# ══════════════════════════ VERIFY ══════════════════════════

def verify_user_zec_deposit(tx):
    """Sync wallet, read history, match an incoming tx by memo (username) + time."""
    if tx.status == 'confirmed':
        return {'status': 'paid'}

    try:
        username = getattr(tx, "memo", None) or _username_for(tx.user_id)
        history = _nozy_history()
    except Exception as e:
        logger.warning("[deposit] zec deposit %s: %s", tx.id, e)
        return {'status': 'pending', 'error': str(e)}

    since = tx.created_at - ZEC_CLOCK_SKEW
    claimed = _claimed_txids(tx.id)

    candidates = []
    for t in history:
        if t["type"] != "received" or t["is_change"] or t["zat"] <= 0:
            continue
        if not t["txid"] or t["txid"] in claimed:
            continue
        if t["created"] is None or t["created"] < since:
            continue
        if not _memo_matches(t["memo"], username):
            continue
        candidates.append(t)

    if not candidates:
        return {'status': 'pending'}

    candidates.sort(key=lambda x: x["created"])

    confirmed = [x for x in candidates if x["confirmed"]]
    if not confirmed:
        # payment seen on chain but not confirmed yet
        return {'status': 'pending', 'stage': 'seen', 'tx': candidates[0]["txid"]}

    match = confirmed[0]
    received = match["amount"]
    if received < MIN_ZEC_DEPOSIT:
        logger.warning("[deposit] zec deposit %s: tx %s below minimum (%s)", tx.id, match["txid"], received)
        return {'status': 'pending', 'stage': 'below_minimum'}

    # Lock the row so two verify calls cannot credit the same deposit twice.
    locked = (UserTransaction.query.filter_by(id=tx.id).with_for_update().first())
    if not locked or locked.status == 'confirmed':
        db.session.rollback()
        return {'status': 'paid'}

    # Re-check the txid claim inside the lock.
    clash = UserTransaction.query.filter(
        UserTransaction.id != locked.id, UserTransaction.tx_hash == match["txid"]).first()
    if clash:
        db.session.rollback()
        return {'status': 'pending'}

    credited = float(received)
    locked.status = 'confirmed'
    locked.paid_at = datetime.utcnow()
    locked.tx_hash = match["txid"]
    locked.amount = credited        # credit what actually arrived

    bal = _get_or_create_balance(locked.user_id)
    bal.balance = float(bal.balance or 0) + credited
    bal.total_earned = float(bal.total_earned or 0) + credited
    bal.updated_at = datetime.utcnow()

    db.session.commit()
    logger.info("[deposit] zec deposit %s confirmed: %.8f ZEC, tx %s, memo %s",
                locked.id, credited, match["txid"], username)

    return {'status': 'paid', 'new_balance': float(bal.balance)}


def verify_user_evm_deposit(tx):
    if tx.status == 'confirmed':
        return {'status': 'paid'}
    if tx.status == 'failed':
        return {'status': 'failed'}

    _wake_poller_safe()

    result = _check_defuse_status(tx.to_address)
    defuse_status = result.get('defuse_status')

    if result.get('status') == 'pending' and defuse_status in LOCKING_STATUSES:
        if tx.swap_status != 'locked':
            tx.swap_status = 'locked'
            db.session.commit()
        return {'status': 'pending', 'stage': 'swapping'}

    if result.get('status') == 'failed':
        tx.status = 'failed'
        tx.swap_status = (defuse_status or 'failed').lower()
        db.session.commit()
        logger.warning("[deposit] evm deposit %s failed, Defuse status: %s", tx.id, defuse_status)
        return {'status': 'failed'}

    if result.get('status') != 'match':
        return {'status': result.get('status', 'pending'), 'stage': 'awaiting_deposit'}

    zec_amount = result.get('zec_amount')
    if zec_amount is None:
        return {'status': 'pending', 'error': 'SUCCESS but no amountOutFormatted'}

    locked = (UserTransaction.query.filter_by(id=tx.id).with_for_update().first())
    if not locked or locked.status == 'confirmed':
        db.session.rollback()
        return {'status': 'paid'}

    locked.status = 'confirmed'
    locked.paid_at = datetime.utcnow()
    locked.tx_hash = result['tx_hash']
    locked.swap_status = 'completed'
    locked.swap_zec_amount = zec_amount
    locked.token = 'ZEC'
    locked.amount = zec_amount

    bal = _get_or_create_balance(locked.user_id)
    bal.balance = float(bal.balance or 0) + zec_amount
    bal.total_earned = float(bal.total_earned or 0) + zec_amount
    bal.updated_at = datetime.utcnow()

    db.session.commit()
    logger.info("[deposit] evm deposit %s confirmed, tx %s, ZEC %s", locked.id, result['tx_hash'], zec_amount)

    return {'status': 'paid', 'new_balance': float(bal.balance)}


def _check_defuse_status(deposit_address):
    if not deposit_address:
        return {'status': 'pending', 'error': 'No deposit address'}
    if not DEFUSE_JWT_TOKEN:
        return {'status': 'pending', 'error': 'DEFUSE_JWT_TOKEN missing'}

    try:
        response = requests.get(
            f"{DEFUSE_API_BASE}/status",
            params={'depositAddress': deposit_address},
            headers={"Authorization": f"Bearer {DEFUSE_JWT_TOKEN}"},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()

        swap_state = data.get('status')
        swap_details = data.get('swapDetails') or {}

        if swap_state in SUCCESS_STATUSES:
            origin_tx = _extract_tx_hash(swap_details.get('originChainTxHashes'))
            dest_tx = _extract_tx_hash(swap_details.get('destinationChainTxHashes'))
            tx_hash = origin_tx or dest_tx or deposit_address
            amount_out = swap_details.get('amountOutFormatted')
            return {
                'status': 'match',
                'tx_hash': tx_hash,
                'zec_amount': float(amount_out) if amount_out is not None else None,
            }

        if swap_state in FAILURE_STATUSES:
            return {'status': 'failed', 'defuse_status': swap_state}

        return {'status': 'pending', 'defuse_status': swap_state}

    except Exception as e:
        return {'status': 'pending', 'error': str(e)}