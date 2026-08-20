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


def invited_user_is_valid(task_config, invited_user_id, community_id):
    from app import get_total_xp

    if task_config.get("require_twitter_match"):
        return invited_user_twitter_match(invited_user_id)

    subquest_uuid = task_config.get("subquest_uuid")

    if subquest_uuid:
        subquest = Subquest.query.filter_by(uuid=subquest_uuid).first()
        if not subquest:
            return False

        completion = SubquestCompletion.query.filter_by(
            user_id=invited_user_id,
            subquest_id=subquest.id,
            status="success",
        ).first()
        return completion is not None

    security = CommunitySecurity.query.filter_by(community_id=community_id).first()
    xp_threshold = security.xp_for_valid_invite if security else 1
    xp = get_total_xp(invited_user_id, community_id)
    return xp >= xp_threshold