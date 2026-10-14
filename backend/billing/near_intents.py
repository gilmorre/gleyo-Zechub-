"""
backend/billing/near_intents.py

Everything that talks to NEAR Intents (1Click / Defuse): USDT/USDC on Polygon, BSC, Base
-> swapped to ZEC and sent to our shielded address. No DB access in here.
"""
import os
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import requests

API = "https://1click.chaindefuser.com/v0"
JWT = os.getenv("DEFUSE_JWT_TOKEN")
ZEC_RECIPIENT = os.getenv("ZCASHD_FROM_ADDRESS")
EVM_REFUND_FALLBACK = os.getenv("EVM_WALLET")

# token -> network -> contract + decimals
STABLE_TOKENS = {
    "USDT": {
        "Polygon": {"address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "decimals": 6},
        "BSC":     {"address": "0x55d398326f99059fF775485246999027B3197955", "decimals": 18},
    },
    "USDC": {
        "Base":    {"address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "decimals": 6},
        "Polygon": {"address": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", "decimals": 6},
        "BSC":     {"address": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "decimals": 18},
    },
}

CHAIN_ALIASES = {"polygon": "pol", "bsc": "bsc", "base": "base", "zec": "zec"}

SUCCESS = {"SUCCESS"}
FAILED = {"REFUNDED", "FAILED", "INCOMPLETE_DEPOSIT"}
PROCESSING = {"KNOWN_DEPOSIT_TX", "PROCESSING"}

_cache = {"at": 0.0, "data": None}
_CACHE_SECONDS = 600


class NearIntentsError(RuntimeError):
    pass


def supported(token, network):
    return network in STABLE_TOKENS.get(token, {})


def _headers():
    if not JWT:
        raise NearIntentsError("DEFUSE_JWT_TOKEN missing")
    return {"Authorization": f"Bearer {JWT}", "Content-Type": "application/json"}


def _tokens():
    """The token list barely changes, so cache it instead of fetching on every checkout."""
    if _cache["data"] and time.time() - _cache["at"] < _CACHE_SECONDS:
        return _cache["data"]
    r = requests.get(f"{API}/tokens", timeout=20)
    r.raise_for_status()
    _cache.update(at=time.time(), data=r.json())
    return _cache["data"]


def get_asset_id(blockchain, contract=None):
    chain = CHAIN_ALIASES.get(blockchain.lower(), blockchain.lower())
    contract = contract.lower() if contract else None
    for t in _tokens():
        if (t.get("blockchain") or "").lower() != chain:
            continue
        tc = t.get("contractAddress")
        if contract is None and tc is None:
            return t["assetId"]
        if contract and tc and tc.lower() == contract:
            return t["assetId"]
    raise NearIntentsError(f"No asset found for {blockchain} {contract}")


def create_deposit(token, network, amount: Decimal, refund_address, minutes=30):
    """Ask for a quote and a unique deposit address. Returns deposit_address + estimated ZEC out."""
    cfg = STABLE_TOKENS.get(token, {}).get(network)
    if not cfg:
        raise NearIntentsError("Unsupported token/network")
    if not ZEC_RECIPIENT:
        raise NearIntentsError("ZCASHD_FROM_ADDRESS missing")

    smallest = str(int((amount * (Decimal(10) ** cfg["decimals"])).to_integral_value()))
    deadline = (datetime.now(timezone.utc) + timedelta(minutes=minutes)) \
        .replace(microsecond=0).isoformat().replace("+00:00", "Z")

    payload = {
        "dry": False,
        "swapType": "EXACT_INPUT",
        "slippageTolerance": 100,
        "originAsset": get_asset_id(network, cfg["address"]),
        "destinationAsset": get_asset_id("zec"),
        "amount": smallest,
        "depositType": "ORIGIN_CHAIN",
        "refundTo": refund_address or EVM_REFUND_FALLBACK,
        "refundType": "ORIGIN_CHAIN",
        "recipient": ZEC_RECIPIENT,
        "recipientType": "DESTINATION_CHAIN",
        "deadline": deadline,
    }
    r = requests.post(f"{API}/quote", json=payload, headers=_headers(), timeout=20)
    if not r.ok:
        raise NearIntentsError(f"Quote failed ({r.status_code}): {r.text[:300]}")
    data = r.json()
    quote = data.get("quote", {})
    address = data.get("depositAddress") or quote.get("depositAddress")
    est = quote.get("amountOutFormatted")
    if not address or est is None:
        raise NearIntentsError("Malformed quote response")
    return {"deposit_address": address, "est_zec": Decimal(str(est))}


def _first_hash(lst):
    if not lst:
        return None
    first = lst[0]
    if isinstance(first, str):
        return first
    return first.get("hash") or first.get("txHash") if isinstance(first, dict) else None


def get_status(deposit_address):
    """
    Normalised result:
      {"phase": "waiting" | "processing" | "success" | "failed" | "error", ...}
    On success also: amount_in (what the buyer really sent, in token units), amount_out (ZEC), tx_hash.
    """
    try:
        r = requests.get(f"{API}/status", params={"depositAddress": deposit_address},
                         headers=_headers(), timeout=20)
        r.raise_for_status()
        d = r.json()
    except Exception as e:  # network / auth problems must never mark a payment failed
        return {"phase": "error", "error": str(e)}

    state = d.get("status")
    sd = d.get("swapDetails") or {}

    if state in SUCCESS:
        amt_in = sd.get("amountInFormatted")   # verify this field name against a real response
        amt_out = sd.get("amountOutFormatted")
        return {
            "phase": "success",
            "amount_in": Decimal(str(amt_in)) if amt_in is not None else None,
            "amount_out": Decimal(str(amt_out)) if amt_out is not None else None,
            "tx_hash": _first_hash(sd.get("originChainTxHashes"))
                       or _first_hash(sd.get("destinationChainTxHashes"))
                       or deposit_address,
        }
    if state in FAILED:
        return {"phase": "failed", "state": state}
    if state in PROCESSING:
        return {"phase": "processing", "state": state}
    return {"phase": "waiting", "state": state}