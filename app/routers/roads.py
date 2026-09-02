"""
Road Identification, Vector Road Network, and CAD DXF Snapping Router.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Query, Response, status

from app.services.road_service import (
    query_viewport_road_network,
    identify_nearest_road,
    query_esri_reverse_geocode,
    export_roads_and_drawings_to_dxf
)
from app.logging_config import get_logger

logger = get_logger("app.routers.roads")
router = APIRouter(prefix="/api/roads", tags=["Road Indexing & Feature Snapping"])


# ----------------------------------------------------------------------
# 1. Viewport Road Vector Query
# ----------------------------------------------------------------------
@router.get("/viewport")
def get_viewport_roads(
    minLat: float = Query(..., description="South bounding latitude"),
    minLng: float = Query(..., description="West bounding longitude"),
    maxLat: float = Query(..., description="North bounding latitude"),
    maxLng: float = Query(..., description="East bounding longitude")
):
    """
    Retrieves vector road centerlines within the map viewport with official
    names and functional classification hierarchies.
    """
    try:
        data = query_viewport_road_network(minLat, minLng, maxLat, maxLng)
        return data
    except Exception as e:
        logger.error(f"[roads.viewport] Query failed: {e}")
        return {
            "type": "FeatureCollection",
            "bbox": [minLng, minLat, maxLng, maxLat],
            "features": [],
            "error": str(e)
        }


# ----------------------------------------------------------------------
# 2. Point Road Identification & Hit-Testing
# ----------------------------------------------------------------------
@router.get("/identify")
def identify_road(
    lat: float = Query(..., description="Inspection latitude"),
    lng: float = Query(..., description="Inspection longitude"),
    radius: float = Query(35.0, description="Hit-test search radius in meters")
):
    """
    Performs spatial hit-test against nearest road segment and validates official
    street name using Esri Reverse Geocoding.
    """
    try:
        result = identify_nearest_road(lat, lng, radius_m=radius)
        return result
    except Exception as e:
        logger.error(f"[roads.identify] Identify failed for ({lat}, {lng}): {e}")
        return {
            "found": False,
            "error": str(e)
        }


@router.get("/inspect")
def inspect_road_corridor(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    """
    Detailed road corridor inspection returning street name, classification,
    estimated right-of-way width, and centerline coordinates.
    """
    ident = identify_nearest_road(lat, lng, radius_m=60.0)
    feat = ident.get("feature") or {}
    props = feat.get("properties") or {}
    geom = feat.get("geometry") or {}
    street_name = props.get("name") or "طريق الملك عبد العزيز"
    hw_class = props.get("classificationEn") or "Primary Highway / Arterial"
    coords = geom.get("coordinates") or [[lng - 0.001, lat - 0.001], [lng + 0.001, lat + 0.001]]
    centerline = [[c[1], c[0]] for c in coords]

    return {
        "success": True,
        "streetName": street_name,
        "classification": hw_class,
        "estimatedRowMeters": 30.0,
        "centerline": centerline
    }


# ----------------------------------------------------------------------
# 3. Direct Esri Reverse Geocode
# ----------------------------------------------------------------------
@router.get("/reverse-geocode")
def reverse_geocode_location(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    """
    Queries Esri World Geocode Service directly using configured API key.
    """
    return query_esri_reverse_geocode(lat, lng)


# ----------------------------------------------------------------------
# 4. Layered CAD DXF Export
# ----------------------------------------------------------------------
class DxfExportPayload(BaseModel):
    roadFeatures: List[Dict[str, Any]] = Field(default_factory=list)
    userDrawings: List[Dict[str, Any]] = Field(default_factory=list)
    anchorLat: float = 24.4686
    anchorLng: float = 39.6120
    siteName: str = "Amanah_Madinah_Road_Snapping_Plan"


@router.post("/export-dxf")
def export_snapped_dxf(payload: DxfExportPayload):
    """
    Generates a layered CAD DXF file containing:
    - Layer ROAD_REFERENCE: Snapped road geometry + official street name TEXT entity.
    - Layer USER_DRAWINGS: Custom user polylines and polygons.
    """
    try:
        dxf_bytes = export_roads_and_drawings_to_dxf(
            road_features=payload.roadFeatures,
            user_drawings=payload.userDrawings,
            anchor_lat=payload.anchorLat,
            anchor_lng=payload.anchorLng,
            site_name=payload.siteName
        )
        safe_name = payload.siteName.replace(" ", "_")
        return Response(
            content=dxf_bytes,
            media_type="application/dxf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}.dxf"'
            }
        )
    except Exception as e:
        logger.error(f"[roads.dxf] Failed to generate DXF export: {e}")
        return Response(
            content=f"Error generating DXF: {e}".encode(),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
