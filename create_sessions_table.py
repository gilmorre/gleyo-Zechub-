import sqlite3

conn = sqlite3.connect('your_database.db')  # change to 'users.db' if that’s your DB!
c = conn.cursor()
c.execute('''
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_agent TEXT,
    created_at INTEGER
  )
''')
conn.commit()
conn.close()


