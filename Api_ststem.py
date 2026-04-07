# from flask import Flask, request, jsonify, abort
# from functools import wraps
# from instance import db
# from models import User, PartnerAPIKey   # assuming you have these models


# # Middleware to check API Key
# def require_api_key(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         api_key = request.headers.get("Authorization")
#         if not api_key or not api_key.startswith("Bearer "):
#             abort(401, description="Missing or invalid Authorization header")

#         token = api_key.split(" ")[1]

#         partner = PartnerAPIKey.query.filter_by(key=token, active=True).first()
#         if not partner:
#             abort(403, description="Invalid or inactive API key")

#         return f(*args, **kwargs)
#     return decorated


# # ✅ Example endpoint: check if user exists
# @app.route("/api/v1/users/verify", methods=["GET"])
# @require_api_key
# def verify_user():
#     user_id = request.args.get("user_id")
#     if not user_id:
#         return jsonify({"error": "Missing user_id"}), 400

#     user = User.query.filter_by(id=user_id).first()

#     if user:
#         return jsonify({
#             "registered": True,
#             "user_id": user.id,
#             "username": user.username,
#             "email_verified": user.email_verified
#         })
#     else:
#         return jsonify({"registered": False})
