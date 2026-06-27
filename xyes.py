import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "project.db")
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("🚀 Adding locked_zec_zatoshi to subquest...")

try:
    cur.execute("PRAGMA table_info(subquest)")
    columns = [col[1] for col in cur.fetchall()]

    if "locked_zec_zatoshi" not in columns:
        cur.execute("""
            ALTER TABLE subquest
            ADD COLUMN locked_zec_zatoshi INTEGER DEFAULT 0
        """)
        print("✅ locked_zec_zatoshi added to subquest.")
    else:
        print("ℹ️ locked_zec_zatoshi already exists.")

    conn.commit()

except Exception as e:
    conn.rollback()
    print(f"❌ Migration failed: {e}")
finally:
    conn.close()

print("🏁 Done.")