# backend/utils/nozy_client.py

import os
import threading
import requests

NOZY_API_URL = os.environ.get("NOZY_API_URL", "http://127.0.0.1:3000")
NOZY_API_KEY = os.environ.get("NOZY_API_KEY")
NOZY_WALLET_PASSWORD = os.getenv("NOZY_WALLET_PASSWORD")

_nozy_lock = threading.Lock()


def _nozy_sync():
    """Sync Nozy wallet state before attempting a send. Returns (success, error)."""
    try:
        sync_resp = requests.post(
            f"{NOZY_API_URL}/api/sync",
            json={"password": NOZY_WALLET_PASSWORD},
            headers={"X-API-Key": NOZY_API_KEY},
            timeout=120
        )
        if sync_resp.status_code != 200:
            return False, f"Sync failed: HTTP {sync_resp.status_code}"

        data = sync_resp.json()
        if 'balance_zec' not in data:
            return False, "Sync response missing balance_zec"

        return True, None
    except Exception as e:
        return False, f"Sync failed: {str(e)}"


def _nozy_send(address, amount_zec, memo=None):
    """Send ZEC via Nozy API."""
    if not _nozy_lock.acquire(blocking=False):
        return None, "Another withdrawal is already in progress, please wait"
    try:
        payload = {
            "recipient": address,
            "amount": float(amount_zec), 
            "password": NOZY_WALLET_PASSWORD,
        }
        if memo:
            payload["memo"] = memo
        print("=== SENDING TO NOZY ===")
        print(payload)
        response = requests.post(
            f"{NOZY_API_URL}/api/transaction/send",
            json=payload,
            headers={"X-API-Key": NOZY_API_KEY},
            timeout=180
        )
        print("STATUS:", response.status_code)
        print("BODY:", response.text)
        if response.status_code != 200:
            return None, f"Nozy API error: {response.status_code}"
        data = response.json()
        print("PARSED:", data)
        if not data.get("success"):
            return None, data.get("message", "Unknown error")
        txid = data.get("txid")
        if not txid:
            return None, "No txid returned"
        return txid, None
    except Exception as e:
        print("NOZY ERROR:", str(e))
        return None, str(e)
    finally:
        _nozy_lock.release()