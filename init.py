import sqlite3
import os

# Point to your database
BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, 'payments.db')

def add_expires_at_column():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check if the column already exists
    c.execute('PRAGMA table_info(payments);')
    columns = [col[1] for col in c.fetchall()]

    if 'expires_at' in columns:
        print("✅ 'expires_at' column already exists.")
    else:
        print("⏳ Adding 'expires_at' column to 'payments' table...")
        c.execute('ALTER TABLE payments ADD COLUMN expires_at INTEGER;')
        conn.commit()
        print("✅ 'expires_at' column successfully added!")

    conn.close()

if __name__ == "__main__":
    add_expires_at_column()
