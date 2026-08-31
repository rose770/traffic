import json
import time
from typing import Optional
from fastapi import APIRouter, Response, UploadFile, File, Form, status, HTTPException
from fastapi.responses import Response as RawResponse
from app.database import get_db
from app.models import (
    GenerateCadRequest,
    Export6NodeCadRequest,
    ExportWatermarkedCadRequest,
    SaveCadVersionRequest
)
from app.services.cad_generator import (
    build_dxf_content,
    build_6node_dxf,
    build_watermarked_dxf_from_features,
    _generate_digital_signature
)
from app.services.cad_parser import parse_cad_drawing, cad_to_geojson_ingest


router = APIRouter(prefix="/api", tags=["CAD & GIS Operations"])


@router.post("/generate-cad")
def generate_cad(payload: GenerateCadRequest):
    """Generate AutoCAD DXF with multi-layer geometric template, traffic layers, and watermark."""
    dxf_content = build_6node_dxf(
        nodes=payload.nodes or payload.boundaryPoints,
        boundary_points=payload.boundaryPoints,
        detour_nodes=payload.detourNodes,
        pedestrian_nodes=payload.pedestrianNodes,
        barrier_nodes=payload.barrierNodes,
        barrier_type=payload.barrierType or "concrete_njb",
        placed_elements=payload.placedElements,
        project_name=payload.projectName or "Detour Work Site",
        lat=payload.lat or 24.4686,
        lng=payload.lng or 39.6120,
        editor_user=payload.editorUser or "Amanah Certified Safety Engineer",
        is_watermarked=True
    )
    timestamp = int(time.time() * 1000)
    filename = f"detour_site_{timestamp}.dxf"
    return RawResponse(
        content=dxf_content,
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/cad/export-6node-dwg")
@router.post("/cad/export-6node-dxf")
def export_6node_cad(payload: Export6NodeCadRequest):
    """Export standard AutoCAD DXF from custom control nodes, barrier walls, and traffic layers."""
    dxf_content = build_6node_dxf(
        nodes=payload.nodes,
        boundary_points=payload.boundaryPoints,
        detour_nodes=payload.detourNodes,
        pedestrian_nodes=payload.pedestrianNodes,
        barrier_nodes=payload.barrierNodes,
        barrier_type=payload.barrierType or "concrete_njb",
        placed_elements=payload.placedElements,
        project_name=payload.projectName,
        lat=payload.lat or 24.4686,
        lng=payload.lng or 39.6120,
        editor_user=payload.editorUser,
        is_watermarked=True
    )
    timestamp = int(time.time() * 1000)
    filename = f"detour_site_{timestamp}.dxf"
    return RawResponse(
        content=dxf_content,
        media_type="application/dxf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/cad/export-watermarked-dwg")
@router.post("/cad/export-watermarked")
def export_watermarked_cad(payload: ExportWatermarkedCadRequest):
    """Export modified GeoJSON layers & signs as AutoCAD DWG with an official digital signature watermark."""
    dxf_content = build_watermarked_dxf_from_features(
        geojson=payload.geojson,
        placed_elements=payload.placedElements,
        project_name=payload.projectName,
        lat=payload.lat or 24.4686,
        lng=payload.lng or 39.6120,
        editor_user=payload.editorUser
    )
    timestamp = int(time.time() * 1000)
    filename = f"watermarked_cad_{timestamp}.dwg"
    return RawResponse(
        content=dxf_content,
        media_type="application/acad",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/cad/save-version")
def save_cad_version(payload: SaveCadVersionRequest, response: Response):
    """Store original or edited CAD version with verification hash and timestamp."""
    try:
        now_iso = time.strftime("%Y-%m-%d %H:%M:%S")
        sig_hash = _generate_digital_signature(payload.fileName, now_iso)
        geojson_str = json.dumps(payload.geojson or {})
        placed_str = json.dumps(payload.placedElements or [])

        with get_db() as conn:
            cursor = conn.cursor()
            # Calculate next version number for this permit
            ver_num = 1
            if payload.permitId:
                cursor.execute(
                    "SELECT MAX(version_number) as max_v FROM cad_versions WHERE permit_id = ?",
                    (payload.permitId,)
                )
                row = cursor.fetchone()
                if row and row.get("max_v"):
                    ver_num = row["max_v"] + 1

            cursor.execute("""
                INSERT INTO cad_versions (
                    permit_id, version_number, version_type, file_name,
                    geojson, placed_elements, editor_user, editor_notes, signature_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.permitId,
                ver_num,
                payload.versionType,
                payload.fileName,
                geojson_str,
                placed_str,
                "Authorized Safety Engineer",
                payload.editorNotes or "Platform Edited Version",
                sig_hash
            ))
            version_id = cursor.lastrowid

        return {
            "success": True,
            "versionId": version_id,
            "versionNumber": ver_num,
            "versionType": payload.versionType,
            "signatureHash": sig_hash,
            "timestamp": now_iso
        }
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.get("/cad/versions/{permit_id}")
def get_cad_versions(permit_id: int, response: Response):
    """Get all saved CAD iterations (Original upload vs Platform Edited versions)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM cad_versions WHERE permit_id = ? ORDER BY version_number ASC",
                (permit_id,)
            )
            rows = cursor.fetchall()

        versions = []
        for r in rows:
            versions.append({
                "id": r["id"],
                "permitId": r["permit_id"],
                "versionNumber": r["version_number"],
                "versionType": r["version_type"],
                "fileName": r["file_name"],
                "geojson": json.loads(r["geojson"]) if r.get("geojson") else {},
                "placedElements": json.loads(r["placed_elements"]) if r.get("placed_elements") else [],
                "editorUser": r.get("editor_user"),
                "editorNotes": r.get("editor_notes"),
                "signatureHash": r.get("signature_hash"),
                "createdAt": r.get("created_at")
            })
        return {"success": True, "versions": versions}
    except Exception as err:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err)}


@router.post("/parse-dwg")
async def parse_dwg(
    dwgFile: UploadFile = File(...),
    crs: Optional[str] = Form(None),
    anchorLat: Optional[float] = Form(None),
    anchorLng: Optional[float] = Form(None),
    response: Response = None
):
    try:
        file_bytes = await dwgFile.read()
        filename = dwgFile.filename or "unknown.dwg"
        result = parse_cad_drawing(
            file_bytes=file_bytes,
            filename=filename,
            user_crs=crs,
            anchor_lat_param=anchorLat,
            anchor_lng_param=anchorLng
        )
        return result
    except Exception as err:
        print(f"[CAD Parser Error] {err}")
        if response:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err) or "Failed to parse DWG file"}


@router.post("/cad-to-geojson")
async def cad_to_geojson(
    file: UploadFile = File(...),
    source_epsg: Optional[str] = Form("EPSG:32637"),
    response: Response = None
):
    try:
        file_bytes = await file.read()
        filename = file.filename or "drawing.dwg"
        result = cad_to_geojson_ingest(
            file_bytes=file_bytes,
            filename=filename,
            source_epsg=source_epsg or "EPSG:32637"
        )
        return result
    except Exception as err:
        print(f"[CAD to GeoJSON Error] {err}")
        if response:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"error": str(err) or "CAD parsing failed"}
