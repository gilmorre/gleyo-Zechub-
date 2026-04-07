from flask import Blueprint, render_template, request, jsonify, abort
from flask_login import current_user, login_required
from community_models import Community
from invitation_code import InvitationCode
invite_bp = Blueprint("invite", __name__)


@invite_bp.route("/<string:community_slug>/invite-code", methods=["GET"])
@login_required
def get_invite_code(community_slug):
    # Find community
    community = Community.query.filter_by(slug=community_slug).first()
    if not community:
        return abort(404, description="Community not found")

    # Find invitation code for this user and community
    invite = InvitationCode.query.filter_by(
        user_id=current_user.id,
        community_id=community.id
    ).first()

    if not invite:
        return jsonify({"error": "No invitation code found"}), 404

    return jsonify({
        "invite_code": invite.code,
        "user_id": invite.user_id,
        "community_id": invite.community_id,
        "community_name": community.name
    })
