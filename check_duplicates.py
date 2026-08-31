import sqlite3
from app.config import DATABASE_PATH

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM permits")
total_count = cursor.fetchone()[0]
print(f"Total permits in database: {total_count}")

cursor.execute("SELECT id, COUNT(*) FROM permits GROUP BY id HAVING COUNT(*) > 1")
dupes = cursor.fetchall()
print("Duplicate IDs found:", "NONE" if not dupes else dupes)

conn.close()
