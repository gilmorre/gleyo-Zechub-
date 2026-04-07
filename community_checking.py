# from sqlalchemy import event
# from datetime import datetime, timezone
# from sqlalchemy.orm import Session
# from instance import db
# from CommunitySecurity import CommunitySecurity
# from community_invite_log import CommunityInviteLog
# from application import check_invite_status
# from xplevel import UserXP

# # Store user_ids to check after commit
# pending_user_invite_checks = set()


# def update_invites_for_user(user_id):
#     """Check all communities the user is invited to and update their invite status."""
#     # Use a separate session to avoid committing inside a committed session
#     with Session(db.engine) as session:
#         pending_logs = session.query(CommunityInviteLog).filter_by(
#             invited_user_id=user_id,
#             status="pending"
#         ).all()

#         for log in pending_logs:
#             new_status = check_invite_status(user_id, log.community_id, log.invitation_code)
#             if new_status != log.status:
#                 log.status = new_status
#                 log.consumed_at = datetime.now(timezone.utc) if new_status == "active" else None

#         session.commit()


# @event.listens_for(CommunitySecurity, "after_update")
# def xp_for_valid_invite_changed(mapper, connection, target):
#     """If xp_for_valid_invite changes, queue invite checks for that community."""
#     state = db.inspect(target)
#     hist = state.attrs.xp_for_valid_invite.history
#     if not hist.has_changes():
#         return

#     community_id = target.community_id
#     # Collect user_ids for pending invites
#     with Session(db.engine) as session:
#         pending_logs = session.query(CommunityInviteLog).filter_by(
#             community_id=community_id,
#             status="pending"
#         ).all()
#         for log in pending_logs:
#             pending_user_invite_checks.add(log.invited_user_id)


# @event.listens_for(UserXP, "after_insert")
# def user_xp_changed(mapper, connection, target):
#     """When a user gains XP, queue their invite status check."""
#     pending_user_invite_checks.add(target.user_id)


# @event.listens_for(UserXP, "after_update")
# def user_xp_updated(mapper, connection, target):
#     """When a user's XP changes, queue their invite status check."""
#     state = db.inspect(target)
#     hist = state.attrs.amount.history
#     if not hist.has_changes():
#         return
#     pending_user_invite_checks.add(target.user_id)


# @event.listens_for(db.session, "after_commit")
# def after_commit(session):
#     """Run queued invite checks after transaction commit using a fresh session."""
#     global pending_user_invite_checks
#     if not pending_user_invite_checks:
#         return

#     # Process each queued user_id in a new session
#     for user_id in list(pending_user_invite_checks):
#         try:
#             update_invites_for_user(user_id)
#         except Exception as e:
#             print(f"Error updating invites for user {user_id}: {e}")

#     pending_user_invite_checks.clear()
