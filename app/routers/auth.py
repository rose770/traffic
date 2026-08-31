from fastapi import APIRouter, Response, status
from app.database import get_db
from app.models import LoginRequest, RegisterRequest


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            (payload.username, payload.password)
        )
        user = cursor.fetchone()

    if user:
        return {
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"]
            }
        }
    else:
        response.status_code = status.HTTP_401_UNAUTHORIZED
        return {"success": False, "error": "Invalid credentials"}


@router.post("/register")
def register(payload: RegisterRequest, response: Response):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (payload.username, payload.password, payload.role)
            )
            user_id = cursor.lastrowid

        return {
            "success": True,
            "user": {
                "id": user_id,
                "username": payload.username,
                "role": payload.role
            }
        }
    except Exception:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"success": False, "error": "Username may already exist"}
