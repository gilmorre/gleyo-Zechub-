"""
User-balance deposit verification — same Nozy/Defuse mechanics as
backend/utils/nozy_client.py and the EVM payment verifier, but targeting
UserTransaction / UserBalance instead of Payment / CommunityWallet.
"""
import os
from decimal import Decimal
import requests
from datetime import datetime, timedelta, timezone

from backend.utils.instance import db
from backend.models.models import UserTransaction, UserBalance

from backend.utils.nozy_client import NOZY_API_URL, NOZY_API_KEY, NOZY_WALLET_PASSWORD, fetch_nozy_balance

DEFUSE_API_BASE = "https://1click.chaindefuser.com/v0"
DEFUSE_JWT_TOKEN = os.getenv("DEFUSE_JWT_TOKEN")

# Native ZEC deposits: same env var pay.py's save_payment() uses for the
# is_zec branch (payment_address = os.getenv("WALLET")) — the wallet
# users send ZEC to directly. No Defuse call involved for this path.
NOZY_ZEC_DEPOSIT_ADDRESS = os.getenv("WALLET")

# EVM->ZEC swap settlement: same address nozy_client's Defuse recipient
# uses (ZCASHD_FROM_ADDRESS) — NOT the same as NOZY_ZEC_DEPOSIT_ADDRESS.
ZCASHD_SHIELDED_ADDRESS = os.getenv("ZCASHD_FROM_ADDRESS")

EVM_WALLET_REFUND = os.getenv("EVM_WALLET")

SUCCESS_STATUSES = {"SUCCESS"}
FAILURE_STATUSES = {"REFUNDED", "FAILED", "INCOMPLETE_DEPOSIT"}
LOCKING_STATUSES = {"KNOWN_DEPOSIT_TX", "PROCESSING"}

DEPOSIT_WINDOW_SECONDS = 1800  # 30 min, matches pay.js's assumed expiry

# Copied directly from the working community-payment module (create_near_intent_deposit)
# so this file has no fragile cross-module import for the Defuse asset lookup.
CHAIN_ALIASES = {
    "polygon": "pol",
    "polygon mainnet": "pol",
    "matic": "pol",

    "ethereum": "eth",

    "binance": "bsc",
    "binance smart chain": "bsc",

    "base": "base",
    "bsc": "bsc",
    "zec": "zec",
}


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
        print(f"⚠️ Could not wake poller from user_deposit_service: {e}")


def _extract_tx_hash(tx_list):
    if not tx_list:
        return None
    first = tx_list[0]
    if isinstance(first, str):
        return first
    if isinstance(first, dict):
        return first.get('hash') or first.get('txHash') or first.get('tx_hash')
    return None


# ══════════════════════════ CREATE ══════════════════════════

def create_zec_deposit(user_id, amount):
    """Native ZEC deposit — user sends ZEC directly to our Nozy wallet address.

    Mirrors save_payment's is_zec branch exactly: no Defuse call, address
    comes straight from the WALLET env var.
    """
    if not NOZY_ZEC_DEPOSIT_ADDRESS:
        raise RuntimeError("WALLET env var missing")

    balance_before = fetch_nozy_balance()

    now = datetime.utcnow()
    tx = UserTransaction(
        user_id=user_id,
        type='in',
        status='pending',
        amount=amount,
        token='ZEC',
        network='Zcash',
        to_address=NOZY_ZEC_DEPOSIT_ADDRESS,
        balance_before=balance_before,
        created_at=now,
        expires_at=now + timedelta(seconds=DEPOSIT_WINDOW_SECONDS),
        remark='Deposit · ZEC',
    )
    db.session.add(tx)
    db.session.commit()
    return tx


def create_evm_deposit(user_id, token, network, amount, refund_address=None,
                        token_contract=None, token_decimals=None):
    """USDT/USDC deposit — get a Defuse quote + deposit address, settles as ZEC.

    token_contract / token_decimals must be resolved by the caller (route)
    the same way save_payment resolves them via its TOKENS config lookup —
    this function doesn't guess at that mapping.
    """
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
        headers={
            "Authorization": f"Bearer {DEFUSE_JWT_TOKEN}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    quote_resp.raise_for_status()
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
        token=token,            # origin token — overwritten to 'ZEC' on success
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
    return tx


# ══════════════════════════ VERIFY ══════════════════════════

def verify_user_zec_deposit(tx):
    """Mirrors nozy_client.verify_zec_payment, targeting UserTransaction/UserBalance."""
    try:
        sync_resp = requests.post(
            f"{NOZY_API_URL}/api/sync",
            json={"password": NOZY_WALLET_PASSWORD},
            headers={"X-API-Key": NOZY_API_KEY},
            timeout=120,
        )
        current_balance = float(sync_resp.json().get('balance_zec', 0))
    except Exception as e:
        return {'status': 'pending', 'error': f'Sync failed: {str(e)}'}

    balance_increase = round(current_balance - float(tx.balance_before or 0), 8)

    FEE_TOLERANCE = min(float(tx.amount) * 0.05, 0.0001)
    required_minimum = max(float(tx.amount) - FEE_TOLERANCE, 0.00000001)

    if balance_increase < required_minimum:
        print(f"⏳ User deposit {tx.id} pending — increase: {balance_increase:.8f}, "
              f"required: {required_minimum:.8f}")
        return {'status': 'pending'}

    tx.status = 'confirmed'
    tx.paid_at = datetime.utcnow()
    tx.tx_hash = f"nozy-balance-delta-{current_balance}"

    bal = _get_or_create_balance(tx.user_id)
    bal.balance = float(bal.balance or 0) + balance_increase
    bal.total_earned = float(bal.total_earned or 0) + balance_increase
    bal.updated_at = datetime.utcnow()

    db.session.commit()
    print(f"✅ User deposit {tx.id} confirmed — credited {balance_increase:.8f} ZEC "
          f"to user {tx.user_id}")

    return {'status': 'paid', 'new_balance': float(bal.balance)}


def verify_user_evm_deposit(tx):
    """Mirrors evm_payment_verifier.verify_evm_payment, targeting UserTransaction/UserBalance."""

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
        print(f"❌ User deposit {tx.id} failed — Defuse status: {defuse_status}")
        return {'status': 'failed'}

    if result.get('status') != 'match':
        return {'status': result.get('status', 'pending'), 'stage': 'awaiting_deposit'}

    zec_amount = result.get('zec_amount')
    if zec_amount is None:
        return {'status': 'pending', 'error': 'SUCCESS but no amountOutFormatted'}

    tx.status = 'confirmed'
    tx.paid_at = datetime.utcnow()
    tx.tx_hash = result['tx_hash']
    tx.swap_status = 'completed'
    tx.swap_zec_amount = zec_amount
    tx.token = 'ZEC'
    tx.amount = zec_amount

    bal = _get_or_create_balance(tx.user_id)
    bal.balance = float(bal.balance or 0) + zec_amount
    bal.total_earned = float(bal.total_earned or 0) + zec_amount
    bal.updated_at = datetime.utcnow()

    db.session.commit()
    print(f"✅ User deposit {tx.id} confirmed — tx: {result['tx_hash']}, ZEC: {zec_amount}")

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