import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Response, status, Request
from app.database import get_db
from app.models import (
    CreatePermitRequest,
    UpdatePermitRequest,
    ApprovePermitRequest,
    CreateDocumentRequest,
    FieldReadinessRequest,
    OpeningMinutesRequest
)


router = APIRouter(prefix="/api/permits", tags=["Permits & Approvals"])


@router.post("")
def create_permit(payload: CreatePermitRequest, response: Response):
    try:
        initial_status = (payload.data.get("status") if payload.data else None) or "Pending"
        data_json = json.dumps(payload.data or {})

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO permits (contractor_id, data, status) VALUES (?, ?, ?)",
                (payload.contractor_id, data_json, initial_status)
            )
            permit_id = cursor.lastrowid

        return {"success": True, "id": permit_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.get("")
def list_permits(response: Response):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM permits ORDER BY created_at DESC")
            permits = cursor.fetchall()
        return permits
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.put("/{permit_id}")
def update_permit(permit_id: int, payload: UpdatePermitRequest, response: Response):
    try:
        updates = []
        params = []

        if payload.status is not None:
            updates.append("status = ?")
            params.append(payload.status)

        if payload.inspector_notes is not None:
            updates.append("inspector_notes = ?")
            params.append(payload.inspector_notes)

        if updates:
            params.append(permit_id)
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(f"UPDATE permits SET {', '.join(updates)} WHERE id = ?", params)

        return {"success": True}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/approval-chain/init")
def init_approval_chain(permit_id: int, response: Response):
    try:
        roles = [
            "contractor",
            "consultant",
            "safety_dept",
            "maintenance_contractor",
            "maintenance_consultant"
        ]
        with get_db() as conn:
            cursor = conn.cursor()
            for role in roles:
                cursor.execute(
                    "INSERT INTO approval_chain (permit_id, role, status) VALUES (?, ?, ?)",
                    (permit_id, role, "pending")
                )
        return {"success": True}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.get("/{permit_id}/approval-chain")
def get_approval_chain(permit_id: int, response: Response):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM approval_chain WHERE permit_id = ? ORDER BY id",
                (permit_id,)
            )
            chain = cursor.fetchall()
        return chain
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/approve")
def approve_permit_role(permit_id: int, payload: ApprovePermitRequest, response: Response):
    try:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE approval_chain 
                SET status = ?, signed_by = ?, notes = ?, signed_at = ? 
                WHERE permit_id = ? AND role = ?
                """,
                (payload.action, payload.signedBy, payload.notes, now_str, permit_id, payload.role)
            )
        return {"success": True}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/documents")
def create_official_document(permit_id: int, payload: CreateDocumentRequest, response: Response):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)",
                (permit_id, payload.doc_type, json.dumps(payload.data))
            )
            doc_id = cursor.lastrowid
        return {"id": doc_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.get("/{permit_id}/documents")
def list_official_documents(permit_id: int, response: Response):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM official_documents WHERE permit_id = ? ORDER BY generated_at DESC",
                (permit_id,)
            )
            docs = cursor.fetchall()
        return docs
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/field-readiness")
def field_readiness(permit_id: int, payload: FieldReadinessRequest, response: Response):
    try:
        data_obj = {
            "fieldInspection": payload.fieldInspection,
            "executionSequencing": payload.executionSequencing,
            "completedAt": payload.completedAt
        }
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)",
                (permit_id, "field_readiness_verification", json.dumps(data_obj))
            )
            doc_id = cursor.lastrowid
            cursor.execute("UPDATE permits SET readiness_status = ? WHERE id = ?", ("verified", permit_id))

        return {"success": True, "id": doc_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/opening-minutes")
def opening_minutes(permit_id: int, payload: OpeningMinutesRequest, response: Response):
    try:
        data_obj = {
            "dayName": payload.dayName,
            "hijriDate": payload.hijriDate,
            "gregorianDate": payload.gregorianDate,
            "roadName": payload.roadName,
            "signatures": payload.signatures
        }
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)",
                (permit_id, "opening_minutes", json.dumps(data_obj))
            )
            doc_id = cursor.lastrowid

        return {"success": True, "id": doc_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/{permit_id}/periodic-inspections")
async def periodic_inspections(permit_id: int, request: Request, response: Response):
    try:
        body = await request.json()
        data_obj = {**body, "date": datetime.now(timezone.utc).isoformat()}
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO official_documents (permit_id, doc_type, data) VALUES (?, ?, ?)",
                (permit_id, "periodic_inspection_tdp_fu", json.dumps(data_obj))
            )
            doc_id = cursor.lastrowid
            cursor.execute("UPDATE permits SET monitoring_status = 'started' WHERE id = ?", (permit_id,))

        return {"success": True, "id": doc_id}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}
