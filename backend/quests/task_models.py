from backend.utils.instance import db
from datetime import datetime
from decimal import Decimal
from datetime import datetime
from sqlalchemy import Numeric

class Task(db.Model):
    __tablename__ = "task"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  
    config = db.Column(db.JSON, nullable=True, default={})   

    subquest_id = db.Column(db.Integer, db.ForeignKey("subquest.id"), nullable=False)
    subquest = db.relationship("Subquest", back_populates="tasks")
    attempt_histories = db.relationship("TaskAttemptHistory", back_populates="task", cascade="all, delete")

    @property
    def quest_uuid(self):
        return self.subquest.quest.uuid if self.subquest and self.subquest.quest else None
    
    def __repr__(self):
        return f"<Task {self.type}>"



class PreviewTaskState(db.Model):
    __tablename__ = "preview_task_state"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, index=True)
    type = db.Column(db.String(50), nullable=False)  
    config = db.Column(db.JSON, nullable=True, default={}) 
    subquest_uuid = db.Column(db.String(64), index=True)
    state = db.Column(db.JSON)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)






class CoinHolderVote(db.Model):
    __tablename__ = "coin_holder_votes"

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer, db.ForeignKey("communities.id"), nullable=False, index=True   
    )
    subquest_id = db.Column(
        db.Integer, db.ForeignKey("subquest.id"), nullable=False, index=True   
    )
    task_id = db.Column(
        db.Integer, db.ForeignKey("task.id"), nullable=False, index=True      
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True       
    )

    project_index = db.Column(db.Integer, nullable=False)
    project_name = db.Column(db.String(255), nullable=False)

    amount = db.Column(Numeric(18, 8), nullable=False)  # ZEC voted
    token = db.Column(db.String(10), default="ZEC")

    # Ties the vote back to the specific claim that produced it —
    # doubles as the anti-duplicate key (see settlement code).
    subquest_completion_id = db.Column(
        db.Integer, db.ForeignKey("subquest_completions.id"), nullable=True, index=True
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    community = db.relationship(
        "Community", backref=db.backref("coin_holder_votes", cascade="all, delete")
    )
    user = db.relationship(
        "Users", backref=db.backref("coin_holder_votes", cascade="all, delete")
    )

    __table_args__ = (
        db.Index("ix_chv_task_project", "task_id", "project_index"),
    )

    def __repr__(self):
        return f"<CoinHolderVote user={self.user_id} project={self.project_name!r} amount={self.amount}>"


class CoinHolderVoteTally(db.Model):
    __tablename__ = "coin_holder_vote_tallies"

    id = db.Column(db.Integer, primary_key=True)

    community_id = db.Column(
        db.Integer, db.ForeignKey("communities.id"), nullable=False, index=True    
    )
    task_id = db.Column(
        db.Integer, db.ForeignKey("task.id"), nullable=False, index=True        
    )

    project_index = db.Column(db.Integer, nullable=False)
    project_name = db.Column(db.String(255), nullable=False)

    vote_count = db.Column(db.Integer, nullable=False, default=0)
    total_amount = db.Column(Numeric(18, 8), nullable=False, default=0)

    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    community = db.relationship(
        "Community", backref=db.backref("coin_holder_vote_tallies", cascade="all, delete")
    )

    __table_args__ = (
        db.UniqueConstraint(
            "task_id", "project_index", name="uq_chv_tally_task_project"
        ),
    )

    def __repr__(self):
        return f"<CoinHolderVoteTally task={self.task_id} project={self.project_name!r} votes={self.vote_count} total={self.total_amount}>"