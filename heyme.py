from flask import Blueprint

payment_bp = Blueprint(
    'payment',
    __name__,
    template_folder='../templates',
    static_folder='../static'
)

# ✅ Ensure this imports and executes route definitions
from . import payment_route
