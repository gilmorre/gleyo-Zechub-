import html

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from email.message import EmailMessage

from backend.auth.entitlements import limit, plan_label
from backend.communities.community_models import Community
from backend.quests.sprint_models import Sprint
from backend.utils.utils import has_role, send_email

from .export_helpers import (
    MAX_EXPORT_ROWS,
    active_wallet_map,
    build_workbook,
    export_filename,
    ranked_all_time_users,
    ranked_sprint_users,
    report_title,
)

export_bp = Blueprint("leaderboard_export", __name__)

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@export_bp.route("/api/<community_slug>/export", methods=["POST"])
@login_required
def export_leaderboard(community_slug):
    community = Community.query.filter_by(slug=community_slug).first_or_404()

    # same audience as can_manage_sprints (admin + editor)
    if not has_role(current_user.id, community.id, "editor"):
        return jsonify(message="You don't have permission to export."), 403

    if not current_user.email:
        return jsonify(message="Your account has no email address to send the export to."), 400

    data = request.get_json(silent=True) or {}

    try:
        count = int(data.get("count"))
    except (TypeError, ValueError):
        return jsonify(message="Enter how many members to export."), 400
    if count < 1:
        return jsonify(message="Enter at least 1 member."), 400

    cap = limit(community, "export_max_members")   # None = unlimited
    if cap is not None and count > cap:
        return jsonify(
            message=(
                f"Your {plan_label(community)} plan can export up to "
                f"{cap:,} members. Upgrade to export more."
            )
        ), 403

    count = min(count, MAX_EXPORT_ROWS)

    sprint = None
    sprint_uuid = data.get("sprint_uuid")
    if sprint_uuid:
        sprint = Sprint.query.filter_by(uuid=sprint_uuid, community_id=community.id).first()
        if not sprint:
            return jsonify(message="Sprint not found."), 404

    # rows are (user_id, username, xp)
    rows = (
        ranked_sprint_users(sprint, community, count)
        if sprint
        else ranked_all_time_users(community, count)
    )

    # nothing on the leaderboard → don't build or send an empty file
    if not rows:
        return jsonify(message="Nothing to export yet."), 404

    wallets = active_wallet_map([row[0] for row in rows])
    title = report_title(sprint)
    filename = export_filename(community, sprint)
    buf = build_workbook(rows, wallets, title)

    # ── build the email with the xlsx attached ──
    safe_title = html.escape(title)
    msg = EmailMessage()
    msg["To"] = current_user.email
    msg["From"] = "Gleyo <noreply@gleyo.app>"
    msg["Subject"] = f"{title} export"
    msg.set_content(
        f"Hi,\n\nYour {title} export ({len(rows):,} members) is attached.\n\n- Gleyo"
    )
    msg.add_alternative(
        f"<p>Hi,</p><p>Your <strong>{safe_title}</strong> export "
        f"({len(rows):,} members) is attached.</p><p>- Gleyo</p>",
        subtype="html",
    )
    maintype, subtype = XLSX_MIME.split("/", 1)
    msg.add_attachment(
        buf.getvalue(),
        maintype=maintype,
        subtype=subtype,
        filename=filename,
    )

    if not send_email(msg):
        return jsonify(message="We couldn't send the email. Please try again."), 502

    return jsonify(message=f"Export sent to {current_user.email}."), 200