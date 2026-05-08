from sqlalchemy import create_engine, text

engine = create_engine(
    "postgresql://postgres:hMXYgnwItGgdAAterUPCtgpNECnWyuhj@tramway.proxy.rlwy.net:17313/railway"
)

sql = """

ALTER TABLE subquest
ADD COLUMN IF NOT EXISTS streak_enabled BOOLEAN NOT NULL DEFAULT FALSE;

"""

with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()

print("✅ streak_enabled column added successfully")




# from instance import db
# from models import PasswordResetToken  # adjust import

# with app.app_context():
#     print("🧹 Deleting all password reset tokens...")

#     deleted = PasswordResetToken.query.delete()
#     db.session.commit()

#     print(f"✅ Deleted {deleted} tokens")


# import sqlite3
# import os

# DB_PATH = os.path.join(os.path.dirname(__file__), "project.db")

# conn = sqlite3.connect(DB_PATH)
# cur = conn.cursor()

# print("🚀 Migrating subquest.max_claim & claim_count to nullable...")

# # 1. Create new table with nullable columns
# cur.execute("""
# CREATE TABLE subquest_new (
#     id INTEGER PRIMARY KEY,
#     public_id BIGINT NOT NULL UNIQUE,
#     uuid TEXT NOT NULL UNIQUE,
#     sprint_id INTEGER,
#     sprint_name TEXT,
#     name TEXT NOT NULL,
#     description TEXT,
#     quest_id INTEGER NOT NULL,
#     is_archive BOOLEAN NOT NULL DEFAULT 0,
#     recurrence TEXT NOT NULL DEFAULT 'None',
#     cooldown TEXT NOT NULL DEFAULT 'None',

#     max_claim INTEGER NULL,
#     claim_count INTEGER NULL,

#     autovalidation BOOLEAN NOT NULL DEFAULT 0,
#     add_to_sprint BOOLEAN NOT NULL DEFAULT 0,
#     has_rewards_before BOOLEAN DEFAULT 0,
#     is_draft BOOLEAN NOT NULL DEFAULT 1,
#     image_url TEXT,

#     created_at DATETIME,
#     updated_at DATETIME,

#     FOREIGN KEY(quest_id) REFERENCES quest(id),
#     FOREIGN KEY(sprint_id) REFERENCES sprints(id)
# );
# """)

# # 2. Copy data
# cur.execute("""
# INSERT INTO subquest_new (
#     id, public_id, uuid, sprint_id, sprint_name, name, description,
#     quest_id, is_archive, recurrence, cooldown,
#     max_claim, claim_count,
#     autovalidation, add_to_sprint, has_rewards_before, is_draft, image_url,
#     created_at, updated_at
# )
# SELECT
#     id, public_id, uuid, sprint_id, sprint_name, name, description,
#     quest_id, is_archive, recurrence, cooldown,
#     max_claim, claim_count,
#     autovalidation, add_to_sprint, has_rewards_before, is_draft, image_url,
#     created_at, updated_at
# FROM subquest;
# """)

# # 3. Drop old table
# cur.execute("DROP TABLE subquest;")

# # 4. Rename new table
# cur.execute("ALTER TABLE subquest_new RENAME TO subquest;")

# conn.commit()
# conn.close()

# print("✅ Migration complete: max_claim & claim_count are now nullable")



 


# import os
# import sqlite3

# DB_PATH = os.path.join(os.path.dirname(__file__), "project.db")

# conn = sqlite3.connect(DB_PATH)
# cur = conn.cursor()

# print("🚀 Migrating communities → adding created_at column...")

# # 1. Create new table with created_at
# cur.execute("""
# CREATE TABLE communities_new (
#     id INTEGER PRIMARY KEY,
#     uuid TEXT NOT NULL UNIQUE,
#     name TEXT NOT NULL,
#     website TEXT,
#     about TEXT,
#     blockchain TEXT,
#     logo_path TEXT,
#     slug TEXT NOT NULL UNIQUE,

#     is_paid BOOLEAN DEFAULT 0,

#     deletion_requested_at DATETIME,
#     delete_at DATETIME,

#     created_by_id INTEGER NOT NULL,

#     created_at DATETIME,

#     FOREIGN KEY(created_by_id) REFERENCES users(id)
# );
# """)

# # 2. Copy old data (use CURRENT_TIMESTAMP for existing rows)
# cur.execute("""
# INSERT INTO communities_new (
#     id, uuid, name, website, about, blockchain, logo_path, slug,
#     is_paid, deletion_requested_at, delete_at, created_by_id, created_at
# )
# SELECT
#     id, uuid, name, website, about, blockchain, logo_path, slug,
#     is_paid, deletion_requested_at, delete_at, created_by_id,
#     CURRENT_TIMESTAMP
# FROM communities;
# """)

# # 3. Drop old table
# cur.execute("DROP TABLE communities;")

# # 4. Rename
# cur.execute("ALTER TABLE communities_new RENAME TO communities;")

# conn.commit()
# conn.close()

# print("✅ Migration complete: created_at added to communities")



# import os
# import sqlite3
# from datetime import datetime, timedelta

# DB_PATH = os.path.join(os.path.dirname(__file__), "project.db")

# conn = sqlite3.connect(DB_PATH)
# cur = conn.cursor()

# print("🚀 Updating community created_at from first activity...")

# # 6 months fallback
# fallback_date = datetime.utcnow() - timedelta(days=180)

# # Get all communities
# cur.execute("SELECT id FROM communities")
# communities = cur.fetchall()

# updated = 0

# for (community_id,) in communities:

#     # 1️⃣ earliest subquest completion activity
#     cur.execute("""
#         SELECT MIN(sc.started_at)
#         FROM subquest_completion sc
#         JOIN subquest s ON sc.subquest_id = s.id
#         JOIN quest q ON s.quest_id = q.id
#         WHERE q.community_id = ?
#     """, (community_id,))
#     subquest_time = cur.fetchone()[0]

#     # 2️⃣ earliest community message
#     cur.execute("""
#         SELECT MIN(cm.created_at)
#         FROM community_messages cm
#         JOIN community_channels ch ON cm.channel_id = ch.id
#         WHERE ch.community_id = ?
#     """, (community_id,))
#     message_time = cur.fetchone()[0]

#     # Convert to datetime
#     times = []

#     if subquest_time:
#         times.append(datetime.fromisoformat(subquest_time))

#     if message_time:
#         times.append(datetime.fromisoformat(message_time))

#     if times:
#         created_at = min(times)
#     else:
#         created_at = fallback_date

#     # Update
#     cur.execute("""
#         UPDATE communities
#         SET created_at = ?
#         WHERE id = ?
#     """, (created_at, community_id))

#     updated += 1


# conn.commit()
# conn.close()

# print(f"✅ Updated {updated} communities")



# import os
# import sqlite3

# DB_PATH = os.path.join(os.path.dirname(__file__), "project.db")

# conn = sqlite3.connect(DB_PATH)
# cur = conn.cursor()

# print("🚀 Migrating subquest_run with UNIQUE constraint...")

# # 1️⃣ Create new table with constraint
# cur.execute("""
# CREATE TABLE IF NOT EXISTS subquest_run_new (
#     id INTEGER PRIMARY KEY AUTOINCREMENT,

#     subquest_id INTEGER NOT NULL,
#     user_id INTEGER NOT NULL,

#     started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
#     finished_at DATETIME,

#     FOREIGN KEY (subquest_id) REFERENCES subquest(id),
#     FOREIGN KEY (user_id) REFERENCES users(id),

#     UNIQUE (subquest_id, user_id)
# );
# """)

# # 2️⃣ Copy data (deduplicate just in case)
# cur.execute("""
# INSERT OR IGNORE INTO subquest_run_new (
#     id, subquest_id, user_id, started_at, finished_at
# )
# SELECT
#     id, subquest_id, user_id, started_at, finished_at
# FROM subquest_run;
# """)

# # 3️⃣ Drop old table
# cur.execute("DROP TABLE subquest_run;")

# # 4️⃣ Rename new table
# cur.execute("ALTER TABLE subquest_run_new RENAME TO subquest_run;")

# conn.commit()
# conn.close()

# print("✅ Migration complete with UNIQUE constraint.")






# from app import app
# from instance import db
# from datetime import datetime

# from subquest_completion import SubquestCompletion 
# from sub_quest_models import SubquestRun


# with app.app_context():

#     print("🚀 Backfilling SubquestRun from SubquestCompletion...")

#     completions = SubquestCompletion.query.all()

#     created = 0
#     updated = 0

#     for c in completions:

#         if not c.subquest_id or not c.user_id:
#             continue

#         run = SubquestRun.query.filter_by(
#             subquest_id=c.subquest_id,
#             user_id=c.user_id
#         ).first()

#         started_at = c.started_at or datetime.utcnow()
#         finished_at = c.completed_at

#         # -------------------------
#         # CREATE
#         # -------------------------
#         if not run:

#             run = SubquestRun(
#                 subquest_id=c.subquest_id,
#                 user_id=c.user_id,
#                 started_at=started_at,
#                 finished_at=finished_at
#             )

#             db.session.add(run)
#             created += 1

#         # -------------------------
#         # UPDATE (if newer finish)
#         # -------------------------
#         else:

#             if finished_at:

#                 if (
#                     not run.finished_at
#                     or finished_at > run.finished_at
#                 ):
#                     run.finished_at = finished_at
#                     updated += 1

#     db.session.commit()

#     print(f"✅ Created runs: {created}")
#     print(f"✅ Updated runs: {updated}")
#     print("🎉 SubquestRun backfill complete.")