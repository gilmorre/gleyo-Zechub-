# rebuild_and_backfill_task_reviews.py

from app import app  # make sure this imports your Flask app
from instance import db
from models import Users
from subquest_completion import SubquestCompletion
from subquest_review import TaskReview
from sqlalchemy import text, func

def rebuild_and_backfill_task_reviews():
    with app.app_context():
        print("⚠️ Dropping table 'task_reviews' if it exists...")
        try:
            db.session.execute(text("DROP TABLE IF EXISTS task_reviews"))
            db.session.commit()
            print("✅ Table 'task_reviews' dropped successfully.")
        except Exception as e:
            print("❌ Error dropping table:", e)
            db.session.rollback()
            return

        print("🧱 Creating table 'task_reviews'...")
        try:
            TaskReview.__table__.create(db.engine)
            print("✅ Table 'task_reviews' created successfully.")
        except Exception as e:
            print("❌ Error creating table:", e)
            return

        print("🔍 Fetching SubquestCompletions with status='pending'...")
        pending_completions = SubquestCompletion.query.filter_by(status="pending").all()
        print(f"Found {len(pending_completions)} pending subquest completions.")

        created = 0
        for completion in pending_completions:
            user = completion.user

            new_review = TaskReview(
                user_id=user.id,
                reviewed_by=None,
                subquest_completion_id=completion.id,
                user_name=getattr(user, "username", None),
                stars=None,
                free_xp=0,
                pending_reward=[],
                comment=None,
                flag=False,
                review_status="pending",
                created_at=func.now()
            )

            db.session.add(new_review)
            created += 1
            print(f"✅ Added review for SubquestCompletion ID {completion.id} (User {user.id})")

        db.session.commit()
        print(f"\n🟢 All done! Created {created} TaskReview rows.")

if __name__ == "__main__":
    rebuild_and_backfill_task_reviews()
