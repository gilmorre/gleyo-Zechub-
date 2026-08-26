from flask import Blueprint, jsonify, abort, render_template
from flask_login import login_required, current_user

from backend.communities.CommunitySecurity import CommunitySecurity
from backend.communities.community_models import Community
from backend.communities.community_invite_log import CommunityInviteLog

from backend.quests.task_models import Task
from backend.quests.sub_quest_models import Subquest
from backend.quests.subquest_completion import SubquestCompletion

from backend.auth.usertwitter import UserTwitter, TwitterMentionInvite   
from backend.quests.invite_validation import invited_user_is_valid as _invited_user_is_valid
invite_progress_bp = Blueprint("invite_progress", __name__)


def _get_invite_logs_by_status(status, community_id):
    logs = CommunityInviteLog.query.filter_by(
        inviter_user_id=current_user.id,
        community_id=community_id,
        status=status,
    ).all()
    print(f"[invite_progress] inviter={current_user.id} community={community_id} status={status} -> {len(logs)} logs")
    for log in logs:
        print(f"    log: id={log.id} invited_user_id={log.invited_user_id} status={log.status}")
    return logs


def _attach_total_xp(logs, community_id):
    from app import get_total_xp
    for log in logs:
        log.total_xp = get_total_xp(log.invited_user_id, community_id)
    return logs


def _get_all_invite_logs(community_id):
    logs = CommunityInviteLog.query.filter_by(
        inviter_user_id=current_user.id,
        community_id=community_id,
    ).all()
    print(f"[invite_progress] inviter={current_user.id} community={community_id} -> {len(logs)} total logs")
    return logs



@invite_progress_bp.route(
    "/api/<community_slug>/quest/<quest_uuid>/<subquest_uuid>/invite-progress/<int:task_id>",
    methods=["GET"],
)
@login_required
def get_invite_progress(community_slug, quest_uuid, subquest_uuid, task_id):
    community = Community.query.filter_by(slug=community_slug).first()
    if not community:
        abort(404, description="Community not found")

    task = Task.query.get(task_id)
    if not task or task.type != "invite":
        abort(404, description="Invite task not found")

    config = task.config or {}
    required_count = config.get("numInvites", 1)

    logs = _get_all_invite_logs(community.id)

    invited_count = sum(
        1 for log in logs
        if log.status != "consumed"
        and _invited_user_is_valid(config, log.invited_user_id, community.id)
    )

    print(f"[invite_progress] === RESULT invited_count={invited_count}/{required_count} ===")

    return jsonify({
        "invited_count": invited_count,
        "required_count": required_count,
    })


@invite_progress_bp.route("/<community_slug>/<int:task_id>/pending_invite")
@login_required
def pending_invite_route(community_slug, task_id):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    task = Task.query.get_or_404(task_id)
    config = task.config or {}

    logs = _get_all_invite_logs(community.id)

    pending = [
        log for log in logs
        if log.status == "pending"
        and not _invited_user_is_valid(config, log.invited_user_id, community.id)
    ]
    _attach_total_xp(pending, community.id)

    return render_template(
        "pending_invite.html",
        community=community,
        invites=pending,
        task_id=task_id,
    )


@invite_progress_bp.route("/<community_slug>/<int:task_id>/consumed_invite")
@login_required
def consumed_invite_route(community_slug, task_id):
    community = Community.query.filter_by(slug=community_slug).first_or_404()

    consumed = _get_invite_logs_by_status("consumed", community.id)
    _attach_total_xp(consumed, community.id)

    return render_template(
        "consumed_invite.html",
        community=community,
        invites=consumed,
        task_id=task_id,
    )


@invite_progress_bp.route("/<community_slug>/<int:task_id>/active_invite")
@login_required
def active_invite_route(community_slug, task_id):
    community = Community.query.filter_by(slug=community_slug).first_or_404()
    task = Task.query.get_or_404(task_id)
    config = task.config or {}

    logs = _get_all_invite_logs(community.id)
    active = [
        log for log in logs
        if log.status != "consumed"
        and _invited_user_is_valid(config, log.invited_user_id, community.id)
    ]
    _attach_total_xp(active, community.id)

    return render_template(
        "active_invite.html",
        community=community,
        invites=active,
        task_id=task_id,
    )