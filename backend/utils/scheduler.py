import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import func

from backend.utils.instance import db

from backend.communities.CommunitySecurity import CommunitySecurity
from backend.communities.community_invite_log import CommunityInviteLog
from backend.communities.xplevel import UserXP

from backend.quests.task_models import Task
from backend.communities.CommunityInviteTask import CommunityInviteTask
from backend.quests.sub_quest_models import Subquest
from backend.quests.subquest_completion import SubquestCompletion
from backend.quests.quest_models import Quest


def get_app():
    from app import app
    return app


logging.basicConfig(level=logging.INFO)


def reset_claim_counts(recurrence):
    with get_app().app_context():
        try:
            updated = (
                Subquest.query
                .filter(
                    func.lower(Subquest.recurrence) == recurrence,
                    Subquest.max_claim.isnot(None),
                    Subquest.is_draft.is_(False)
                )
                .update({Subquest.claim_count: 0}, synchronize_session=False)
            )
            db.session.commit()
            logging.info(f"Reset claim_count for {updated} {recurrence} subquests")
        except Exception as e:
            db.session.rollback()
            logging.error(f"Failed to reset {recurrence} claim counts: {e}")


def recalc_all_invites():
    logging.info("Running recalc_all_invites...")
    logs = CommunityInviteLog.query.all()
    user_community_pairs = {(log.invited_user_id, log.community_id) for log in logs}
    for user_id, community_id in user_community_pairs:
        check_and_update_invite_status(user_id, community_id)


def check_and_update_invite_status(user_id, community_id):
    security = CommunitySecurity.query.filter_by(community_id=community_id).first()
    if not security:
        logging.info(f"No security for community {community_id}, skipping.")
        return

    xp_needed = security.xp_for_valid_invite or 0

    total_xp = sum(
        xp.amount
        for xp in UserXP.query.filter_by(user_id=user_id).all()
        if xp.completion and xp.completion.subquest.quest.community_id == community_id
    )
    logging.info(f"User {user_id} total XP in community {community_id}: {total_xp} (needed: {xp_needed})")

    logs = CommunityInviteLog.query.filter_by(
        invited_user_id=user_id,
        community_id=community_id
    ).all()

    invite_tasks = Task.query.join(Subquest).join(Quest).filter(
        Quest.community_id == community_id,
        Task.type == "invite"
    ).all()

    logging.info(f"[DEBUG] Community {community_id} invite tasks: {[t.id for t in invite_tasks]}")
    for t in invite_tasks:
        logging.info(f"Task {t.id} config: {t.config}")

    for log in logs:
        old_status = log.status
        if old_status == "consumed":
            logging.info(f"Skipping consumed invite {log.invitation_code}")
            continue

        meets_xp = (xp_needed == 0 or total_xp >= xp_needed)
        all_tasks_met = True

        CommunityInviteTask.query.filter_by(community_invite_log_id=log.id).delete()

        for task in invite_tasks:
            task_status = "pending"
            subquest_uuid = task.config.get("subquest_uuid") if task.config else None

            if subquest_uuid:
                subquest = Subquest.query.filter_by(uuid=subquest_uuid).first()
                if subquest:
                    completion = (
                        SubquestCompletion.query
                        .filter_by(user_id=user_id, subquest_id=subquest.id, status="success")
                        .order_by(SubquestCompletion.completed_at.desc())
                        .first()
                    )
                    if completion:
                        task_status = "active"
                        logging.info(f"User {user_id} completed subquest {subquest.name} (task {task.id})")
                    else:
                        all_tasks_met = False
                        logging.info(f"User {user_id} has NOT completed subquest {subquest.name} (task {task.id})")
                else:
                    logging.warning(f"Task {task.id} refers to missing subquest {subquest_uuid}")
                    all_tasks_met = False
            else:
                if meets_xp:
                    task_status = "active"
                    logging.info(f"User {user_id} meets XP requirement for task {task.id}")
                else:
                    all_tasks_met = False
                    logging.info(f"User {user_id} does NOT meet XP requirement for task {task.id}")

            db.session.add(CommunityInviteTask(
                community_invite_log_id=log.id,
                task_id=task.id,
                status=task_status,
                completed_at=datetime.now(timezone.utc) if task_status == "active" else None
            ))

        if old_status != "consumed":
            if meets_xp and all_tasks_met:
                log.status = "active"
                log.consumed_at = log.consumed_at or datetime.now(timezone.utc)
            else:
                log.status = "pending"
                log.consumed_at = None

        db.session.add(log)
        if old_status != log.status:
            logging.info(
                f"Invite log {log.invitation_code} for user {user_id} "
                f"in community {community_id}: {old_status} -> {log.status}"
            )

    db.session.commit()
    logging.info(f"Invite logs updated for user {user_id} in community {community_id}")


if __name__ == "__main__":
    app = get_app()

    scheduler = BlockingScheduler(timezone="UTC")

    scheduler.add_job(
        lambda: get_app().app_context().push() or recalc_all_invites(),
        trigger="interval",
        minutes=1,
        id="recalc_invites",
        coalesce=True,
        max_instances=1
    )

    scheduler.add_job(
        reset_claim_counts,
        trigger="cron",
        args=["daily"],
        hour=0,
        minute=0,
        id="reset_daily_claims",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600
    )

    scheduler.add_job(
        reset_claim_counts,
        trigger="cron",
        args=["weekly"],
        day_of_week="mon",
        hour=0,
        minute=0,
        id="reset_weekly_claims",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600
    )

    scheduler.add_job(
        reset_claim_counts,
        trigger="cron",
        args=["monthly"],
        day=1,
        hour=0,
        minute=0,
        id="reset_monthly_claims",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
        misfire_grace_time=3600
    )

    logging.info("🚀 Scheduler running (resets + invites)")
    scheduler.start()