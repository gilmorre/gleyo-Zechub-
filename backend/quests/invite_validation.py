from backend.communities.CommunitySecurity import CommunitySecurity
from backend.quests.sub_quest_models import Subquest
from backend.quests.subquest_completion import SubquestCompletion
from backend.auth.usertwitter import UserTwitter, TwitterMentionInvite


def invited_user_twitter_match(invited_user_id):
    twitter = (
        UserTwitter.query
        .filter_by(user_id=invited_user_id, action="connected")
        .order_by(UserTwitter.timestamp.desc())
        .first()
    )
    if not twitter:
        return False

    handle = (twitter.xusername or "").lstrip("@").lower()
    if not handle:
        return False

    match = TwitterMentionInvite.query.filter_by(
        handle=handle,
        status="matched",
    ).first()
    return match is not None


def _meets_xp_requirement(invited_user_id, community_id):
    from app import get_total_xp

    security = CommunitySecurity.query.filter_by(community_id=community_id).first()
    xp_threshold = security.xp_for_valid_invite if security else 1
    xp = get_total_xp(invited_user_id, community_id)

    print(f"[invite_validation] -> xp gate xp={xp} threshold={xp_threshold}")
    return xp >= xp_threshold


def invited_user_is_valid(task_config, invited_user_id, community_id):
    print(f"[invite_validation] config={task_config!r} community={community_id} invited_user={invited_user_id}")

    # 1) CommunitySecurity XP threshold is the baseline gate — ALWAYS checked first,
    #    regardless of what task-specific requirement is also configured.
    if not _meets_xp_requirement(invited_user_id, community_id):
        print("[invite_validation] failed XP gate, invalid")
        return False

    # 2) Task-specific requirement, layered on top of the XP gate.
    if task_config.get("require_twitter_match"):
        print("[invite_validation] -> twitter branch")
        return invited_user_twitter_match(invited_user_id)

    subquest_uuid = task_config.get("subquest_uuid")
    if subquest_uuid:
        print(f"[invite_validation] -> subquest branch uuid={subquest_uuid!r}")
        subquest = Subquest.query.filter_by(uuid=subquest_uuid).first()
        if not subquest:
            print("[invite_validation] subquest not found, invalid")
            return False
        completion = SubquestCompletion.query.filter_by(
            user_id=invited_user_id, subquest_id=subquest.id, status="success",
        ).first()
        return completion is not None

    # 3) No extra task requirement — XP gate alone is enough.
    return True