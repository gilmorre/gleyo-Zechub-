from flask import Blueprint, request, session
from eth_account.messages import encode_defunct
from web3 import Web3
from instance import db
from wallet import Wallet
from models import Users
import secrets
from datetime import datetime
from flask_login import current_user

wallet_bp = Blueprint("wallet_bp", __name__, url_prefix="/wallet")

# GET nonce for signing
@wallet_bp.route("/connect", methods=["GET"])
def wallet_connect():
    # fallback: auto assign a dummy user_id for testing
    user_id = current_user.id if current_user.is_authenticated else None

    if not user_id:
        user = Users.query.first()
        if not user:
            user = Users(username="testuser", email="test@example.com")
            db.session.add(user)
            db.session.commit()
        user_id = user.id
        session["user_id"] = user_id

    # generate nonce
    nonce = secrets.token_hex(16)
    session["wallet_nonce"] = nonce
    return {"nonce": nonce, "user_id": user_id}


# Verify signature + save wallet
@wallet_bp.route("/verify", methods=["POST"])
def wallet_verify():
    user_id = current_user.id if current_user.is_authenticated else None

    if not user_id:
        return {"error": "Not logged in"}, 401

    data = request.json
    address = data.get("address")
    signature = data.get("signature")
    nonce = session.get("wallet_nonce")

    if not address or not signature or not nonce:
        return {"error": "Missing data"}, 400

    # checksum + recover
    address = Web3.to_checksum_address(address)
    message = encode_defunct(text=nonce)
    recovered_address = Web3().eth.account.recover_message(message, signature=signature)

    if recovered_address.lower() != address.lower():
        return {"error": "Signature invalid"}, 400

    # save or update wallet
    wallet = Wallet.query.filter_by(user_id=user_id).first()
    if wallet:
        wallet.address = address
        wallet.chain = "ethereum"
        wallet.connected_at = datetime.utcnow()
        wallet.nonce = nonce
        wallet.last_signature = signature
    else:
        wallet = Wallet(
            user_id=user_id,
            address=address,
            chain="ethereum",
            nonce=nonce,
            last_signature=signature,
            connected_at=datetime.utcnow(),
        )
        db.session.add(wallet)

    db.session.commit()
    return {"status": "connected", "address": address, "user_id": user_id}
