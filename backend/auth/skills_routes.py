from datetime import datetime

from flask import Blueprint, jsonify, render_template, request
from flask_login import current_user, login_required

from backend.utils.instance import db
from backend.models.models import UserSkill

skills_bp = Blueprint('skills', __name__)

MAX_SKILLS = 5

# (slug stored in DB, label shown to the user)
SKILL_OPTIONS = [
    ('developer', 'Developer'),
    ('designer', 'Designer'),
    ('video_editor', 'Video editor'),
    ('content_creator', 'Content creator'),
    ('writer', 'Writer'),
    ('artist', 'Artist / illustrator'),
    ('community_manager', 'Community manager'),
    ('moderator', 'Moderator'),
    ('marketer', 'Marketer'),
    ('translator', 'Translator'),
    ('researcher', 'Researcher'),
    ('other', 'Other'),
]
ALLOWED_SKILLS = {slug for slug, _ in SKILL_OPTIONS}


def _safe_next(value):
    """Only allow same-site relative paths."""
    if value and value.startswith('/') and not value.startswith('//'):
        return value
    return ''


def _skills_context(user):
    return dict(
        user=user,
        options=SKILL_OPTIONS,
        selected={s.skill for s in user.skills},
        notify=bool(user.notify_opportunities),
        max_skills=MAX_SKILLS,
    )


def _render_skills(onboarding):
    return render_template(
        'accounts/skills.html',
        **_skills_context(current_user),
        onboarding=onboarding,
        next_url=_safe_next(request.args.get('next', '')),
    )


# Onboarding step (shown right after the passcode is set)
@skills_bp.route('/skills', methods=['GET'])
@login_required
def skills_page():
    return _render_skills(onboarding=True)


# Settings tab
@skills_bp.route('/settings/skills', methods=['GET'])
@login_required
def account_settings_skills():
    from app import load_account_settings_context  # imported here to avoid a circular import

    ctx = load_account_settings_context()
    user = ctx["user"]

    if request.headers.get("X-Partial"):
        return render_template(
            "accounts/skills.html",
            **_skills_context(user),
            onboarding=False,
            next_url="",
        )
    return render_template(
        "account_settings.html",
        user=user,
    )


@skills_bp.route('/skills', methods=['POST'])
@login_required
def save_skills():
    data = request.get_json(silent=True) or {}
    raw = data.get('skills')

    if not isinstance(raw, list):
        return jsonify(ok=False, error='Invalid data.'), 400

    chosen = []
    for item in raw:
        if not isinstance(item, str) or item not in ALLOWED_SKILLS:
            return jsonify(ok=False, error='Invalid skill selected.'), 400
        if item not in chosen:
            chosen.append(item)

    if len(chosen) > MAX_SKILLS:
        return jsonify(ok=False, error=f'You can pick up to {MAX_SKILLS} skills.'), 400

    notify = bool(data.get('notify'))

    try:
        UserSkill.query.filter_by(user_id=current_user.id).delete(synchronize_session=False)
        for slug in chosen:
            db.session.add(UserSkill(user_id=current_user.id, skill=slug))

        current_user.notify_opportunities = notify
        current_user.skills_updated_at = datetime.utcnow()
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify(ok=False, error='Could not save. Please try again.'), 500

    return jsonify(ok=True, skills=chosen)