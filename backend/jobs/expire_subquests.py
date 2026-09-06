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
    with app.app_context():
        subquest = Subquest.query.get(subquest_id)
        if not subquest or subquest.is_expired or subquest.is_draft:
            return

        vote_tasks = Task.query.filter_by(
            subquest_id=subquest.id,
            type="coin_holder_vote"
        ).all()

        if vote_tasks:
            # 🔄 CALL NOZY SYNC FIRST — before any payout attempt
            synced, sync_error = _nozy_sync()
            if not synced:
                logger.error(
                    "❌ Nozy sync failed — subquest %s not expired, will retry later: %s",
                    subquest.id, sync_error
                )
                return

        for task in vote_tasks:
            if getattr(task, "payout_sent_at", None):
                continue

            config = task.config or {}
            payout_address = config.get("payoutAddress")

            if not payout_address:
                logger.warning(
                    "⚠️ coin_holder_vote task %s (subquest %s) has no payoutAddress — skipping payout",
                    task.id, subquest.id
                )
                continue

            total_voted = (
                db.session.query(db.func.coalesce(db.func.sum(CoinHolderVote.amount), 0))
                .filter(CoinHolderVote.task_id == task.id)
                .scalar()
            )
            total_voted = Decimal(str(total_voted or 0))

            if total_voted <= 0:
                task.payout_sent_at = datetime.utcnow()
                db.session.commit()
                continue

            memo = subquest.name or f"Subquest {subquest.id}"

            txid, error = _nozy_send(payout_address, total_voted, memo=memo)

            if error:
                logger.error(
                    "❌ Coin holder vote payout FAILED — subquest %s task %s — %s ZEC to %s: %s",
                    subquest.id, task.id, total_voted, payout_address, error
                )
                return

            logger.info(
                "✅ Coin holder vote payout sent — %s ZEC → %s (memo=%r) txid=%s",
                total_voted, payout_address, memo, txid
            )

            task.payout_sent_at = datetime.utcnow()
            db.session.commit()

        subquest.is_expired = True
        db.session.commit()