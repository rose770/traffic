import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "127.0.0.1")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
ESRI_API_KEY = os.getenv("ESRI_API_KEY", os.getenv("VITE_ESRI_API_KEY", "")).strip()
DATABASE_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "database.sqlite"))
DIST_DIR = BASE_DIR / "dist"
