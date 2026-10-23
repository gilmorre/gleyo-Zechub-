from backend.utils.instance import db
import uuid
from datetime import datetime
class Sprint(db.Model):
    __tablename__ = 'sprints'
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    title = db.Column(db.String(120))
    start_date = db.Column(db.DateTime)   
    end_date = db.Column(db.DateTime)
    description = db.Column(db.Text)
    rewards = db.Column(db.Text)         
    end_zone = db.Column(db.String(50))
    color = db.Column(db.String(20))
    distribution = db.Column(db.String(100))
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    creator = db.relationship('Users', back_populates='sprints_created')

    community_id = db.Column(db.Integer, db.ForeignKey('communities.id'), nullable=False)
    community = db.relationship('Community', backref='sprints')

    locked_amount = db.Column(db.BigInteger, nullable=False, default=0)   

    reward_tiers = db.relationship(
        "SprintRewardTier",
        back_populates="sprint",
        cascade="all, delete-orphan",
        order_by="SprintRewardTier.position",
    )

    def __repr__(self):
        return f"<Sprint {self.title}>"





class SprintRewardTier(db.Model):
    __tablename__ = "sprint_reward_tiers"

    id = db.Column(db.Integer, primary_key=True)
    sprint_id = db.Column(db.Integer, db.ForeignKey("sprints.id"), nullable=False, index=True)

    position = db.Column(db.Integer, nullable=False)         
    rank_from = db.Column(db.Integer, nullable=False)
    rank_to = db.Column(db.Integer, nullable=False)
    amount_per_winner = db.Column(db.BigInteger, nullable=False)   

    sprint = db.relationship("Sprint", back_populates="reward_tiers")

    @property
    def winners(self):
        return self.rank_to - self.rank_from + 1

    @property
    def total(self):
        return self.winners * self.amount_per_winner