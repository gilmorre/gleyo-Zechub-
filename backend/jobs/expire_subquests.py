# backend/jobs/expire_subquests.py

import logging
from decimal import Decimal
from datetime import datetime

from backend.utils.instance import db
from backend.quests.sub_quest_models import Subquest
from backend.quests.task_models import Task, CoinHolderVote
from backend.utils.nozy_client import _nozy_sync, _nozy_send
from app import app

logger = logging.getLogger(__name__)


def expire_one_subquest(subquest_id):
    logger.info("🚀 expire_one_subquest FIRED for subquest_id=%s", subquest_id)

    with app.app_context():
        subquest = Subquest.query.get(subquest_id)

        if not subquest:
            logger.warning("⚠️ subquest %s not found — nothing to do", subquest_id)
            return

        if subquest.is_draft:
            logger.info("↩️ subquest %s is a draft — skipping", subquest_id)
            return

        # ── STEP 1: close the vote immediately, regardless of payout status ──
        # is_expired reflects "the vote window is over" — a pure time fact.
        # It must NOT depend on Nozy being reachable.
        if not subquest.is_expired:
            subquest.is_expired = True
            db.session.commit()
            logger.info(
                "🔒 subquest %s marked is_expired=True (vote window closed) — "
                "payout will be attempted next, independently",
                subquest.id
            )
        else:
            logger.info("↩️ subquest %s already expired — proceeding to payout check", subquest.id)

        # ── STEP 2: attempt payout — failures here no longer block expiry ──
        vote_tasks = Task.query.filter_by(
            subquest_id=subquest.id,
            type="coin_holder_vote"
        ).all()

        logger.info("🔎 found %d coin_holder_vote task(s) for subquest %s", len(vote_tasks), subquest.id)

        # skip payout entirely if every task is already paid out
        pending_tasks = [t for t in vote_tasks if not getattr(t, "payout_sent_at", None)]
        if vote_tasks and not pending_tasks:
            logger.info("✅ subquest %s — all vote tasks already paid out, nothing to do", subquest.id)
            return

        if pending_tasks:
            synced, sync_error = _nozy_sync()
            logger.info("🔄 _nozy_sync() returned synced=%s error=%s", synced, sync_error)
            if not synced:
                logger.error(
                    "❌ Nozy sync failed — subquest %s stays EXPIRED, payout still PENDING, "
                    "will retry payout on next sweep: %s",
                    subquest.id, sync_error
                )
                return  # is_expired is already True — only payout is deferred

        for task in pending_tasks:
            config = task.config or {}
            payout_address = config.get("payoutAddress")

            if not payout_address:
                logger.warning(
                    "⚠️ task %s (subquest %s) has no payoutAddress — skipping payout permanently",
                    task.id, subquest.id
                )
                continue

            total_voted = (
                db.session.query(db.func.coalesce(db.func.sum(CoinHolderVote.amount), 0))
                .filter(CoinHolderVote.task_id == task.id)
                .scalar()
            )
            total_voted = Decimal(str(total_voted or 0))
            logger.info("💰 task %s total_voted=%s ZEC", task.id, total_voted)

            if total_voted <= 0:
                logger.info("↩️ task %s has zero votes — marking paid out with no transfer", task.id)
                task.payout_sent_at = datetime.utcnow()
                db.session.commit()
                continue

            memo = subquest.name or f"Subquest {subquest.id}"
            logger.info("📤 sending payout: task=%s amount=%s ZEC → %s memo=%r",
                        task.id, total_voted, payout_address, memo)

            txid, error = _nozy_send(payout_address, total_voted, memo=memo)

            if error:
                logger.error(
                    "❌ payout FAILED — subquest %s task %s — %s ZEC to %s: %s "
                    "(subquest stays expired; payout will retry on next sweep)",
                    subquest.id, task.id, total_voted, payout_address, error
                )
                continue  # try other tasks, don't abort the whole loop on one failure

            logger.info("✅ payout sent — %s ZEC → %s (memo=%r) txid=%s",
                        total_voted, payout_address, memo, txid)
            task.payout_sent_at = datetime.utcnow()
            db.session.commit()

        logger.info("🏁 expire_one_subquest finished for subquest %s", subquest.id)