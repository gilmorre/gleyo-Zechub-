from backend.utils.instance import db
from backend.quests.sub_quest_models import Subquest
from app import app  


def expire_one_subquest(subquest_id):
    with app.app_context():
        subquest = Subquest.query.get(subquest_id)
        if not subquest or subquest.is_expired or subquest.is_draft:
            return

        subquest.is_expired = True
        db.session.commit()