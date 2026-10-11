# backend/jobs/expire_subscriptions.py   (REPLACE the whole file)
#
# Two one-shot jobs per community, both moved every time a payment lands
# (billing_stripe._save_expiry_job -> schedule_subscription_expiry):
#
#   expire_subscription_<id>   at access_until   -> drops the community to Free
#                                                    (card subs get a grace period + a Stripe check first)
#   wallet_renew_<id>          at expires_at-24h -> debits the wallet, renews, sends the receipt;
#                                                    low balance -> emails the owner, retries 2h before expiry
#
# This file never does `from app import ...`; it finds the REAL scheduler/app of the running app.py.

import sys
import logging
from datetime import datetime, timedelta, timezone

from backend.utils.instance import db
from backend.communities.community_models import Community
from backend.communities.community_subscription_models import CommunitySubscription

logger = logging.getLogger(__name__)

RENEW_AHEAD = timedelta(hours=24)
RETRY_BEFORE_EXPIRY = timedelta(hours=2)

_flask_app = None
_scheduler = None


def _find(attr):
    for name in ("__main__", "app"):
        obj = getattr(sys.modules.get(name), attr, None)
        if obj is not None:
            return obj
    return None


def _get_scheduler():
    return _scheduler or _find("scheduler")


def _get_flask_app():
    return _flask_app or _find("app")


def _job_id(community_id):
    return f"expire_subscription_{community_id}"


def _renew_job_id(community_id):
    return f"wallet_renew_{community_id}"


def _retry_job_id(community_id):
    return f"wallet_renew_retry_{community_id}"


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt  # stored as naive UTC


def _add_job(func, run_at, args, job_id):
    scheduler = _get_scheduler()
    if scheduler is None:
        logger.error("❌ no scheduler found — job %s NOT saved", job_id)
        return
    job = scheduler.add_job(
        func=func,
        trigger="date",
        run_date=_aware(run_at),
        args=args,
        id=job_id,
        replace_existing=True,
        misfire_grace_time=None,  # a run date in the past (or server was down) = run as soon as possible
    )
    logger.info("🗓️ job %s scheduled for %s UTC (next_run=%s)", job_id, run_at, getattr(job, "next_run_time", None))


def _remove_job(job_id):
    scheduler = _get_scheduler()
    if scheduler is None:
        return
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass  # no such job


def init_subscription_jobs(flask_app, scheduler):
    """Call once in app.py after db.create_all(). Safe on every restart (same ids + replace_existing)."""
    global _flask_app, _scheduler
    _flask_app = flask_app
    _scheduler = scheduler

    with flask_app.app_context():
        subs = CommunitySubscription.query.filter(CommunitySubscription.status != "expired").all()
        for sub in subs:
            schedule_subscription_expiry(sub.community_id, sub.expires_at)
        logger.info("🧷 backfilled jobs for %d subscription(s)", len(subs))


def schedule_subscription_expiry(community_id, expires_at):
    """
    Save (or move) both jobs for this community. Same job ids + replace_existing,
    so a renewal / upgrade / toggle just moves them.
    """
    if not expires_at:
        return

    sub = CommunitySubscription.query.filter_by(community_id=community_id).first()

    # 1) downgrade job (card subs: expires_at + grace)
    run_at = sub.access_until if sub else expires_at
    _add_job(expire_one_subscription, run_at, [community_id], _job_id(community_id))

    # 2) wallet auto-renew job, only for wallet-managed subscriptions with auto-renew on
    if sub and sub.status != "expired" and sub.auto_renew_wallet and not sub.card_auto_renews:
        _add_job(run_wallet_renewal, expires_at - RENEW_AHEAD, [community_id, 1], _renew_job_id(community_id))
    else:
        _remove_job(_renew_job_id(community_id))
        _remove_job(_retry_job_id(community_id))


def expire_one_subscription(community_id):
    """
    Fires at access_until. Before downgrading anybody:
      - already renewed -> reschedule
      - card sub        -> ask Stripe; still paying with a later period -> sync, don't downgrade
      - otherwise       -> status expired, is_paid False, claims lock re-synced to the Free limit
    """
    logger.info("🚀 expire_one_subscription FIRED for community_id=%s", community_id)

    flask_app = _get_flask_app()
    if flask_app is None:
        logger.error("❌ no Flask app found — cannot expire community %s", community_id)
        return

    with flask_app.app_context():
        from backend.auth.billing_stripe import expire_subscription_if_due

        community = db.session.get(Community, community_id)
        if not community:
            return

        sub = community.subscription
        if not sub or sub.status == "expired":
            logger.info("↩️ community %s already Free", community_id)
            return

        if expire_subscription_if_due(community):
            logger.info("⬇️ community %s downgraded to Free", community_id)
            return

        # Not downgraded: renewed, synced from Stripe, still in grace, or Stripe unreachable.
        db.session.refresh(sub)
        now = datetime.utcnow()
        next_run = sub.access_until if sub.access_until > now else now + timedelta(hours=1)
        logger.info("↩️ community %s NOT downgraded — checking again at %s", community_id, next_run)
        _add_job(expire_one_subscription, next_run, [community_id], _job_id(community_id))


def run_wallet_renewal(community_id, attempt=1):
    """
    Fires ~24h before expires_at (attempt 1) and again 2h before if the balance was too low (attempt 2).
    Success -> activate_plan stacks the period, moves both jobs, and emails the receipt.
    Low balance -> owner gets the "top up before your plan expires" email (once per period).
    """
    logger.info("🔁 run_wallet_renewal FIRED community_id=%s attempt=%s", community_id, attempt)

    flask_app = _get_flask_app()
    if flask_app is None:
        logger.error("❌ no Flask app found — cannot renew community %s", community_id)
        return

    with flask_app.app_context():
        from backend.auth.billing_stripe import renew_plan_with_wallet

        try:
            result = renew_plan_with_wallet(community_id, notify=(attempt == 1))
        except Exception:
            logger.exception("wallet renewal crashed for community %s", community_id)
            db.session.rollback()
            return

        logger.info("🔁 community %s wallet renewal result: %s", community_id, result)

        if result == "low_balance" and attempt == 1:
            sub = CommunitySubscription.query.filter_by(community_id=community_id).first()
            if sub:
                retry_at = sub.expires_at - RETRY_BEFORE_EXPIRY
                if retry_at > datetime.utcnow():
                    _add_job(run_wallet_renewal, retry_at, [community_id, 2], _retry_job_id(community_id))