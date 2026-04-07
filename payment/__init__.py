from flask import Flask
from ..payment_route import payment_bp  # import the blueprint

def create_app():
    app = Flask(__name__)

    # Register the blueprint with prefix `/payment`
    app.register_blueprint(payment_bp, url_prefix='/payment')

    return app
