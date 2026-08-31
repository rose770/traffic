import sqlite3
from app.config import DATABASE_PATH

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()

cursor.execute(
    "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
    ("external_coordinator", "pass123", "external_entity")
)
conn.commit()

cursor.execute("SELECT * FROM users WHERE username = ?", ("external_coordinator",))
row = cursor.fetchone()
print("Account now in database:", row)

conn.close()
