import time
from threading import Thread
from datetime import datetime
from web3 import Web3
from instance import db
from payment_models import Payment
from app import app

# ✅ Target wallet to monitor
WALLET = Web3.to_checksum_address('0xe1bd60600Ddf6342dcdB5012d1c4069E900dC233')

# ✅ WebSocket RPC URLs
RPC_URLS = {
    'BSC': 'wss://young-thrumming-patina.bsc.quiknode.pro/643dd043a67eb96aa6ea0b0a9c893fecff6c4613/',
    'Polygon': 'wss://fragrant-restless-mountain.matic.quiknode.pro/7ae68d09ca77be5cedc60cd6bd512da2b1af39b2/',
    'Base': 'wss://prettiest-side-scion.base-mainnet.quiknode.pro/51d1725466c957952be98a3cd3a36fa2c8219adb/'
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

def run_monitor(network, token):
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
                from_block='latest',  # ✅ fixed here
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
                        continue  # skip this loop
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
                print(f"🔔 Received {amt:.6f} {token} on {network} | TX: {tx_hash}")

                pending = Payment.query.filter_by(
                    token=token,
                    network=network,
                    status='pending'
                ).all()

                match_found = False
                for p in pending:
                    if abs(p.amount - amt) < 0.0001:
                        p.status = 'paid'
                        p.tx = tx_hash
                        p.paid_at = datetime.utcnow()
                        db.session.commit()
                        print(f"✅ Matched and updated payment ID {p.id}")
                        match_found = True
                        break

                if not match_found:
                    print(f"⚠️ No match found for {amt:.6f} {token} on {network}")

            time.sleep(5)


def start_all_monitors():
    print("🚀 Starting all token monitors...")
    for chain in TOKENS:
        for symbol in TOKENS[chain]:
            t = Thread(target=run_monitor, args=(chain, symbol), daemon=True)
            t.name = f"{chain}-{symbol}-monitor"
            t.start()
