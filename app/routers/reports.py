import json
from typing import Optional
from fastapi import APIRouter, Response, status, Query
from app.database import get_db
from app.models import CreateReportRequest


router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("")
def create_report(payload: CreateReportRequest, response: Response):
    try:
        data_json = json.dumps(payload.data or {})
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO reports (permit_id, type, data) VALUES (?, ?, ?)",
                (payload.permit_id, payload.type, data_json)
            )
            report_id = cursor.lastrowid
        return {"success": True, "id": report_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.get("")
def list_reports(permit_id: Optional[int] = Query(None), response: Response = None):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            if permit_id is not None:
                cursor.execute(
                    "SELECT * FROM reports WHERE permit_id = ? ORDER BY created_at DESC",
                    (permit_id,)
                )
            else:
                cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")
            reports = cursor.fetchall()
        return reports
    except Exception as err:
        if response:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}
