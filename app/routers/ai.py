from fastapi import APIRouter, Response, status
from app.models import AiAlignRequest, GeneratePhasingRequest
from app.services.ai_service import align_images_ai, generate_phasing_schedule


router = APIRouter(prefix="/api", tags=["AI Engineering Services"])


@router.post("/ai-align")
def ai_align(payload: AiAlignRequest, response: Response):
    try:
        if not payload.cadImage or not payload.mapImage:
            response.status_code = status.HTTP_400_BAD_REQUEST
            return {"success": False, "error": "Missing images"}

        result = align_images_ai(
            cad_image_b64=payload.cadImage,
            map_image_b64=payload.mapImage,
            api_key=payload.apiKey,
            meters_per_pixel=payload.metersPerPixel or 0.5,
            origin_lat=payload.originLat or 24.4686
        )
        return result
    except Exception as err:
        print(f"[Vision AI Route Error] {err}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": "Failed to align images using AI"}


@router.post("/generate-phasing")
def generate_phasing(payload: GeneratePhasingRequest, response: Response):
    try:
        result = generate_phasing_schedule(
            project_name=payload.project_name or "Traffic Detour & Safety Plan",
            road_classification=payload.road_classification or "Main / Expressway",
            traffic_volume=payload.traffic_volume or "High",
            speed_limit_kmh=payload.speed_limit_kmh or 80,
            excavation_depth_cm=payload.excavation_depth_cm or 200,
            total_duration_hours=payload.total_duration_hours or 1632,
            work_start_date=payload.work_start_date or "2026-08-30",
            work_end_date=payload.work_end_date or "2026-11-06",
            total_lanes=payload.total_lanes or 3,
            closed_lanes=payload.closed_lanes or 1,
            client_api_key=payload.apiKey
        )
        return result
    except Exception as err:
        print(f"[Phasing AI Route Error] {err}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err) or "Failed to generate phasing"}
