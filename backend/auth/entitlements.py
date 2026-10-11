from functools import wraps

from sqlalchemy import func
from flask import jsonify

from backend.auth.billing_stripe import (
    BillingError, CLAIM_LIMITS, get_active_subscription,
)
from backend.communities.community_models import Community
from backend.communities.CommunityUserRole_models import CommunityUserRole


PLAN_FEATURES = {
    "community_members": {"free": 100,   "standard": 3000,  "plus": 8000,  "enterprise": None},
    "team_members":      {"free": 1,     "standard": None,  "plus": None,  "enterprise": None},
    "claims_per_month":  CLAIM_LIMITS,
    "community_chat":    {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "export_max_members":{"free": 100,   "standard": 1000,  "plus": 4000,  "enterprise": None},
    "crm":               {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "analytics":         {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "custom_emojis":     {"free": 0, "standard": 10, "plus": 35, "enterprise": 65},
    "partnerships":      {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "landing_listing":   {"free": True,  "standard": True,  "plus": True,  "enterprise": True},
    "twitter_promotion": {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "bot_protection":    {"free": True,  "standard": True,  "plus": True,  "enterprise": True},
    "priority_support":  {"free": False, "standard": True,  "plus": True,  "enterprise": True},
    "account_manager":   {"free": False, "standard": False, "plus": True,  "enterprise": True},
    "crypto_payments":   {"free": False, "standard": False, "plus": False, "enterprise": True},
}

_PLAN_ORDER = ["free", "standard", "plus", "enterprise"]
_PLAN_LABEL = {"free": "Free", "standard": "Standard", "plus": "Pro", "enterprise": "Enterprise"}

TEAM_ROLES = {"admin", "editor", "reviewer"}


class FeatureLocked(BillingError):
    def __init__(self, message):
        super().__init__(message, 403)
        self.message = message


def plan_key(community):
    sub = get_active_subscription(community)
    return sub.plan if sub else "free"


def plan_label(community):
    return _PLAN_LABEL[plan_key(community)]


def limit(community, feature):
    return PLAN_FEATURES[feature][plan_key(community)]


def has_feature(community, feature):
    return bool(limit(community, feature))


def _cheapest_plan_with(feature):
    for p in _PLAN_ORDER:
        if PLAN_FEATURES[feature][p]:
            return _PLAN_LABEL[p]
    return None


def require_feature(community, feature, what=None):
    if has_feature(community, feature):
        return
    need = _cheapest_plan_with(feature)
    what = what or feature.replace("_", " ")
    raise FeatureLocked(
        f"{what.capitalize()} is available on the {need} plan and above. Upgrade to unlock it."
        if need else f"{what.capitalize()} isn't available."
    )


def feature_required(feature, what=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            community = Community.query.filter_by(slug=kwargs["community_slug"]).first_or_404()
            require_feature(community, feature, what)
            return fn(*args, **kwargs)
        return wrapper
    return deco


def member_count(community):
    return CommunityUserRole.query.filter_by(
        community_id=community.id, banned=False
    ).count()


def check_can_join(community):
    cap = limit(community, "community_members")
    if cap is not None and member_count(community) >= cap:
        raise FeatureLocked(
            f"This community has reached its {cap:,} member limit. "
            "The owner needs to upgrade the plan to let more people join."
        )


def team_member_count(community):
    return CommunityUserRole.query.filter(
        CommunityUserRole.community_id == community.id,
        CommunityUserRole.banned.is_(False),
        func.lower(CommunityUserRole.role).in_(TEAM_ROLES),
    ).count()


def team_is_full(community):
    cap = limit(community, "team_members")
    return cap is not None and team_member_count(community) >= cap


def user_is_on_team(community, user_id):
    if not user_id:
        return False
    return CommunityUserRole.query.filter(
        CommunityUserRole.community_id == community.id,
        CommunityUserRole.user_id == user_id,
        CommunityUserRole.banned.is_(False),
        func.lower(CommunityUserRole.role).in_(TEAM_ROLES),
    ).first() is not None


def check_can_add_team_member(community, adding=1):
    cap = limit(community, "team_members")
    if cap is None:
        return
    if team_member_count(community) + adding > cap:
        if cap == 1:
            raise FeatureLocked(
                "Your Free plan only includes the community creator on the team. "
                "Upgrade to Standard to add admins, editors and reviewers."
            )
        raise FeatureLocked(f"Your plan allows {cap} team members. Upgrade to add more.")


def check_can_accept_team_invite(community, user_id=None):
    if user_is_on_team(community, user_id):
        return
    check_can_add_team_member(community)


def check_can_take_role(community, user_id, role, is_new_member):
    if is_new_member:
        check_can_join(community)
    if role.lower() in TEAM_ROLES and not user_is_on_team(community, user_id):
        check_can_add_team_member(community)


def check_can_export(community, rows_to_export):
    cap = limit(community, "export_max_members")
    if cap is not None and rows_to_export > cap:
        raise FeatureLocked(
            f"Your plan exports up to {cap:,} members and this community has {rows_to_export:,}. "
            "Upgrade to export everything."
        )


def entitlements_payload(community):
    key = plan_key(community)
    return {"plan": key, **{f: PLAN_FEATURES[f][key] for f in PLAN_FEATURES}}


def check_can_add_emoji(community, current_count):
    cap = limit(community, "custom_emojis")

    if not cap:   
        raise FeatureLocked(
            "Custom emojis are available on the Standard plan and above. Upgrade to unlock them."
        )

    if current_count >= cap:
        raise FeatureLocked(
            f"Your {plan_label(community)} plan allows up to {cap} custom emojis. "
            "Upgrade to add more."
        )



def feature_lock_response(community, feature, what=None):
    need = _cheapest_plan_with(feature)
    what = what or feature.replace("_", " ")
    return jsonify({
        "error": "feature_locked",    
        "lock_ui": True,
        "feature": feature,
        "current_plan": plan_key(community),
        "required_plan": need,       
        "message": f"{what.capitalize()} is available on the {need} plan and above. Upgrade to unlock it."
                   if need else f"{what.capitalize()} isn't available.",
    }), 403


def chat_locked(community_id):
    """Call at the very top of any chat-related route.
    Returns a (response, 403) tuple if locked, otherwise None."""
    try:
        community_id = int(community_id)
    except (TypeError, ValueError):
        return None  

    community = Community.query.get(community_id)
    if not community:
        return None

    if has_feature(community, "community_chat"):
        return None

    return feature_lock_response(community, "community_chat", "community chat")