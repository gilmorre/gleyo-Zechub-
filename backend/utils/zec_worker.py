import queue
import logging
import threading
from datetime import datetime, UTC
from decimal import Decimal

logger = logging.getLogger("gleyo.zec_worker")

_zec_queue = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def enqueue_zec_withdrawal(tx_id):
    """Call this from the route after committing the pending tx + queue row."""
    _zec_queue.put(tx_id)
    logger.info("Enqueued withdrawal | tx_id=%s queue_depth=%s", tx_id, _zec_queue.qsize())


def start_zec_worker(app):
    """Call once at app startup."""
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        _recover_pending(app)
        t = threading.Thread(target=_worker_loop, args=(app,), daemon=True)
        t.start()
        _worker_started = True
        logger.info("ZEC withdrawal worker started")


def _recover_pending(app):
    """On restart, re-queue anything that never got picked up.
    Anything stuck 'processing' from a crash is left alone and flagged -
    we don't know if the send actually broadcast, so it needs a human look,
    not an automatic re-send."""
    from backend.payments.wallet import ZecWithdrawalQueue

    with app.app_context():
        stuck = ZecWithdrawalQueue.query.filter_by(status="processing").all()
        for row in stuck:
            logger.warning(
                "Withdrawal stuck in 'processing' at restart, needs manual review | tx_id=%s",
                row.tx_id
            )

        queued = ZecWithdrawalQueue.query.filter_by(status="queued") \
            .order_by(ZecWithdrawalQueue.created_at.asc()).all()
        for row in queued:
            _zec_queue.put(row.tx_id)
        if queued:
            logger.info("Recovered %s queued withdrawal(s) from DB", len(queued))


def _worker_loop(app):
    while True:
        tx_id = _zec_queue.get()
        try:
            with app.app_context():
                _process_next(tx_id)
        except Exception:
            logger.exception("Worker crashed processing tx_id=%s", tx_id)
        finally:
            _zec_queue.task_done()


def _process_next(tx_id):
    from backend.utils.instance import db
    from backend.models.models import UserTransaction, UserBalance
    from backend.payments.wallet import ZecWithdrawalQueue
    from backend.utils.nozy_client import _nozy_sync, _nozy_send

    q_row = ZecWithdrawalQueue.query.filter_by(tx_id=tx_id).first()
    tx = UserTransaction.query.get(tx_id)
    if not tx or not q_row:
        logger.error("tx_id=%s missing tx or queue row, skipping", tx_id)
        return

    q_row.status = "processing"
    q_row.started_at = datetime.now(UTC)
    db.session.commit()

    user_balance = UserBalance.query.filter_by(user_id=tx.user_id).first()
    address = q_row.address
    amount_to_send = float(q_row.amount_to_send)
    full_amount = q_row.full_amount
    platform_fee = q_row.platform_fee

    logger.info("Worker syncing before send | tx_id=%s", tx_id)
    synced, sync_err = _nozy_sync()

    if not synced:
        logger.error("Worker SYNC FAILED | tx_id=%s error=%s", tx_id, sync_err)
        user_balance.balance         += Decimal(str(full_amount))
        user_balance.total_withdrawn -= Decimal(str(platform_fee))
        tx.status = "failed"
        tx.remark = "Refunded · wallet sync failed — your ZEC has been returned, please try again"
        q_row.status = "failed"
        q_row.finished_at = datetime.now(UTC)
        db.session.commit()
        return

    logger.info(
        "Worker sending | tx_id=%s address=%s amount=%s",
        tx_id, address, amount_to_send
    )
    tx_hash, err = _nozy_send(address, amount_to_send, memo="Gleyo ZEC Withdrawal")

    if err:
        logger.error("Worker SEND FAILED | tx_id=%s error=%s", tx_id, err)
        user_balance.balance         += Decimal(str(full_amount))
        user_balance.total_withdrawn -= Decimal(str(platform_fee))
        tx.status = "failed"
        tx.remark = "Refunded · withdrawal failed — your ZEC has been returned, please try again"
        q_row.status = "failed"
        q_row.finished_at = datetime.now(UTC)
        db.session.commit()
        return

    logger.info("Worker SEND SUCCESS | tx_id=%s txid=%s", tx_id, tx_hash)
    user_balance.total_withdrawn += Decimal(str(amount_to_send))
    tx.status = "confirmed"
    tx.tx_hash = tx_hash
    q_row.status = "done"
    q_row.finished_at = datetime.now(UTC)
    db.session.commit()