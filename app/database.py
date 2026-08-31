import sqlite3
from contextlib import contextmanager
from typing import Generator, Any, List, Optional, Dict
from app.config import DATABASE_PATH


def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> Dict[str, Any]:
    """Convert SQLite row tuple into a python dict."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite database connection."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=5.0, check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def initialize_db() -> None:
    """Initialize database tables, default users, and run schema migrations."""
    conn = sqlite3.connect(DATABASE_PATH, timeout=5.0, check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        cursor = conn.cursor()
        
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT
            );

            CREATE TABLE IF NOT EXISTS permits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contractor_id INTEGER,
                data TEXT,
                status TEXT,
                inspector_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                permit_id INTEGER,
                type TEXT,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS approval_chain (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                permit_id INTEGER,
                role TEXT,
                status TEXT DEFAULT 'pending',
                signed_by TEXT,
                notes TEXT,
                signed_at DATETIME,
                FOREIGN KEY (permit_id) REFERENCES permits(id)
            );

            CREATE TABLE IF NOT EXISTS official_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                permit_id INTEGER,
                doc_type TEXT,
                data TEXT,
                generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (permit_id) REFERENCES permits(id)
            );

            CREATE TABLE IF NOT EXISTS cad_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                permit_id INTEGER,
                version_number INTEGER DEFAULT 1,
                version_type TEXT DEFAULT 'edited',
                file_name TEXT,
                geojson TEXT,
                placed_elements TEXT,
                editor_user TEXT,
                editor_notes TEXT,
                signature_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (permit_id) REFERENCES permits(id)
            );
        """)

        # Default users list
        default_users = [
            ("contractor", "pass123", "contractor"),
            ("inspector", "pass123", "inspector"),
            ("external_coordinator", "pass123", "external_entity"),
            ("consultant1", "pass123", "consultant"),
            ("safety_officer", "pass123", "safety_dept"),
            ("maint_contractor", "pass123", "maintenance_contractor"),
            ("maint_consultant", "pass123", "maintenance_consultant"),
        ]

        for username, password, role in default_users:
            cursor.execute(
                "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, password, role)
            )

        # Stage 3 gate migration: readiness_status
        try:
            cursor.execute("ALTER TABLE permits ADD COLUMN readiness_status TEXT DEFAULT 'pending'")
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Stage 4 gate migration: monitoring_status
        try:
            cursor.execute("ALTER TABLE permits ADD COLUMN monitoring_status TEXT DEFAULT 'pending'")
        except sqlite3.OperationalError:
            pass  # Column already exists

        conn.commit()
    finally:
        conn.close()
