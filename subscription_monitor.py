import time
from threading import Thread
from datetime import datetime
from web3 import Web3
from instance import db
from CommunityPayment import CommunityPayment
from enterprise_models import EnterpriseRequest
from app import send_payment_confirmation_email, app



# ✅ Target wallet to monitor
WALLET = Web3.to_checksum_address('0xe1bd60600Ddf6342dcdB5012d1c4069E900dC233')

# ✅ WebSocket RPC URLs
RPC_URLS = {
    'BSC': 'wss://serene-indulgent-bird.bsc.quiknode.pro/ec48add7558518e53ba2a55da5d2df73961b9e65/',
    'Polygon': 'wss://powerful-ancient-market.matic.quiknode.pro/9897e1b70a7e23f186a21df6bb91dc14f9e296bc/',
    'Base': 'wss://compatible-solemn-gadget.base-mainnet.quiknode.pro/048ce280faf3d01c4f8c6a2fc20de3b773af10b3/'
}

# ✅ Supported tokens and their decimals
TOKENS = {
    'BSC': {
        'USDT': {'address': '0x55d398326f99059fF775485246999027B3197955', 'decimals': 18},
        'USDC': {'address': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 'decimals': 18},
    },
    'Polygon': {
        'USDT': {'address': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 'decimals': 6},
        'USDC': {'address': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 'decimals': 6},
    },
    'Base': {
        'USDT': {'address': '0xA7E6f0c0bF25A24C3C87bC59216D0014b1896b71', 'decimals': 6},
        'USDC': {'address': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'decimals': 6},
    },
}

# ✅ ERC20 Transfer event ABI
ABI = [{
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "from", "type": "address"},
        {"indexed": True, "name": "to", "type": "address"},
        {"indexed": False, "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
}]


def run_subscription_monitor(network, token):
    with app.app_context():
        try:
            w3 = Web3(Web3.LegacyWebSocketProvider(RPC_URLS[network]))
        except Exception as e:
            print(f"❌ Failed to connect to {network} for {token}: {e}")
            return

        if not w3.is_connected():
            print(f"❌ Could not connect to {network}")
            return

        print(f"✅ Connected to {network} for {token}")

        token_contract = w3.eth.contract(
            address=Web3.to_checksum_address(TOKENS[network][token]['address']),
            abi=ABI
        )

        try:
            event_filter = token_contract.events.Transfer.create_filter(
                from_block='latest',
                argument_filters={'to': WALLET}
            )
        except Exception as e:
            print(f"❌ Failed to create event filter: {e}")
            return

        while True:
            try:
                events = event_filter.get_new_entries()
            except ValueError as e:
                if 'filter not found' in str(e):
                    print(f"⚠️ Filter expired on {network} - {token}. Recreating it...")
                    try:
                        event_filter = token_contract.events.Transfer.create_filter(
                            from_block='latest',
                            argument_filters={'to': WALLET}
                        )
                        continue
                    except Exception as inner_e:
                        print(f"❌ Failed to recreate filter: {inner_e}")
                        time.sleep(5)
                        continue
                else:
                    print(f"⚠️ Unknown error: {e}")
                    time.sleep(5)
                    continue

            for event in events:
                raw_amt = event['args']['value']
                decimals = TOKENS[network][token]['decimals']
                amt = raw_amt / (10 ** decimals)
                tx_hash = event['transactionHash'].hex()
                print(f"🔔 Subscription Payment {amt:.6f} {token} on {network} | TX: {tx_hash}")

                pending = EnterpriseRequest.query.filter_by(
                    token=token,
                    network=network,
                    payment_state='waiting'
                ).all()

                match_found = False
                for req in pending:
                    # ⏳ Expiry check
                    if req.is_expired():
                        req.payment_state = 'expired'
                        db.session.commit()
                        print(f"❌ Subscription session expired for EnterpriseRequest {req.id}")
                        continue

                    # ✅ Payment match
                    if abs(float(req.budget) - amt) < 0.0001:
                        req.payment_state = 'paid'
                        req.tx = tx_hash
                        req.paid_at = datetime.utcnow()

                        # 🔥 Update related CommunityPayment
                        if req.payment:
                            req.payment.status = "paid"
                            req.payment.paid_at = datetime.utcnow()
                            req.payment.amount = float(req.budget)

                        db.session.commit()
                        print(f"✅ Matched EnterpriseRequest {req.id} + CommunityPayment {req.payment_id}")
                        send_payment_confirmation_email(req)
                        match_found = True
                        break

                if not match_found:
                    print(f"⚠️ No match found for {amt:.6f} {token} on {network}")

            time.sleep(5)


# subscription_models.py
def start_subscription_monitors():
    print("🚀 Starting subscription-related monitors...")
    for chain in TOKENS:
        for symbol in TOKENS[chain]:
            t = Thread(target=run_subscription_monitor, args=(chain, symbol), daemon=True)
            t.name = f"sub-{chain}-{symbol}-monitor"
            t.start()

