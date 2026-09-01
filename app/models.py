from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str


class CreatePermitRequest(BaseModel):
    contractor_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None


class UpdatePermitRequest(BaseModel):
    status: Optional[str] = None
    inspector_notes: Optional[str] = None


class ApprovePermitRequest(BaseModel):
    role: str
    signedBy: Optional[str] = None
    notes: Optional[str] = None
    action: str = "approved"


class CreateDocumentRequest(BaseModel):
    doc_type: str
    data: Dict[str, Any]


class CreateReportRequest(BaseModel):
    permit_id: Optional[int] = None
    type: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class FieldReadinessRequest(BaseModel):
    fieldInspection: Optional[Any] = None
    executionSequencing: Optional[Any] = None
    completedAt: Optional[str] = None


class OpeningMinutesRequest(BaseModel):
    dayName: Optional[str] = None
    hijriDate: Optional[str] = None
    gregorianDate: Optional[str] = None
    roadName: Optional[str] = None
    signatures: Optional[Any] = None


class GenerateCadRequest(BaseModel):
    lat: Optional[float] = 24.4686
    lng: Optional[float] = 39.6120
    radius_meters: Optional[int] = 200
    nodes: Optional[List[Dict[str, Any]]] = None
    detourNodes: Optional[List[Dict[str, Any]]] = None
    boundaryPoints: Optional[List[Dict[str, Any]]] = None
    pedestrianNodes: Optional[List[Dict[str, Any]]] = None
    barrierNodes: Optional[List[Dict[str, Any]]] = None
    barrierType: Optional[str] = "concrete_njb"
    placedElements: Optional[List[Dict[str, Any]]] = None
    labels: Optional[List[Dict[str, Any]]] = None
    projectName: Optional[str] = "Detour Work Site"
    editorUser: Optional[str] = "Amanah Certified Safety Engineer"


class Export6NodeCadRequest(BaseModel):
    nodes: Optional[List[Dict[str, Any]]] = None
    boundaryPoints: Optional[List[Dict[str, Any]]] = None
    detourNodes: Optional[List[Dict[str, Any]]] = None
    pedestrianNodes: Optional[List[Dict[str, Any]]] = None
    barrierNodes: Optional[List[Dict[str, Any]]] = None
    barrierType: Optional[str] = "concrete_njb"
    placedElements: Optional[List[Dict[str, Any]]] = None
    labels: Optional[List[Dict[str, Any]]] = None
    projectName: Optional[str] = "6-Node Site Traffic Corridor"
    lat: Optional[float] = 24.4686
    lng: Optional[float] = 39.6120
    editorUser: Optional[str] = "Amanah Certified Safety Engineer"


class ExportWatermarkedCadRequest(BaseModel):
    geojson: Dict[str, Any]
    placedElements: Optional[List[Dict[str, Any]]] = None
    labels: Optional[List[Dict[str, Any]]] = None
    projectName: Optional[str] = "Amanah Madinah Edited CAD"
    lat: Optional[float] = 24.4686
    lng: Optional[float] = 39.6120
    editorUser: Optional[str] = "Authorized Safety Engineer"


class SaveCadVersionRequest(BaseModel):
    permitId: Optional[int] = None
    versionType: str = "edited"  # "original" | "edited"
    fileName: str
    geojson: Dict[str, Any]
    placedElements: Optional[List[Dict[str, Any]]] = None
    editorNotes: Optional[str] = None
    dxfContent: Optional[str] = None


class AiAlignRequest(BaseModel):
    cadImage: str
    mapImage: str
    metersPerPixel: Optional[float] = 0.5
    originLat: Optional[float] = 24.4686
    apiKey: Optional[str] = None


class GeneratePhasingRequest(BaseModel):
    project_name: Optional[str] = "Traffic Detour & Safety Plan"
    road_classification: Optional[str] = "Main / Expressway"
    traffic_volume: Optional[str] = "High"
    speed_limit_kmh: Optional[float] = 80
    excavation_depth_cm: Optional[float] = 200
    total_duration_hours: Optional[float] = 1632
    work_start_date: Optional[str] = "2026-08-30"
    work_end_date: Optional[str] = "2026-11-06"
    total_lanes: Optional[int] = 3
    closed_lanes: Optional[int] = 1
    apiKey: Optional[str] = None
