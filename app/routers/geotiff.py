from typing import Optional
from fastapi import APIRouter, Response, Request, UploadFile, File, status, Query
from app.services.geotiff_parser import parse_geotiff_bytes, generate_sample_survey_cog_bytes
from app.logging_config import get_logger

logger = get_logger("app.geotiff")
router = APIRouter(prefix="/api", tags=["GeoTIFF & High-Resolution Imagery"])

# Cached survey sample GeoTIFF buffer
_cached_sample_bytes: Optional[bytes] = None
_cached_sample_meta: Optional[dict] = None


def _get_or_create_sample_cog(center_lat: float, center_lng: float):
    global _cached_sample_bytes, _cached_sample_meta
    if _cached_sample_bytes is None:
        _cached_sample_bytes, _cached_sample_meta = generate_sample_survey_cog_bytes(
            center_lat=center_lat,
            center_lng=center_lng,
            span_meters=450.0
        )
    return _cached_sample_bytes, _cached_sample_meta


@router.post("/parse-geotiff")
async def parse_geotiff(
    tiffFile: UploadFile = File(...),
    response: Response = None
):
    try:
        file_bytes = await tiffFile.read()
        filename = tiffFile.filename or "unknown.tif"
        result = parse_geotiff_bytes(file_bytes=file_bytes, filename=filename)
        return result
    except Exception as err:
        logger.error(f"[GeoTIFF Parser Error] {err}")
        if response:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err) or "Failed to parse GeoTIFF file"}


@router.get("/geotiff/survey-metadata")
def get_survey_geotiff_metadata(
    lat: float = Query(24.4686, description="Center latitude of survey site"),
    lng: float = Query(39.6120, description="Center longitude of survey site")
):
    """Returns metadata, spatial bounding box, and zoom threshold for the active survey GeoTIFF."""
    _, meta = _get_or_create_sample_cog(lat, lng)
    return {
        "success": True,
        "metadata": meta,
        "surveyBounds": meta["bounds"],
        "minZoomThreshold": meta.get("minZoomThreshold", 16),
        "center": [lat, lng],
        "cogUrl": f"/api/geotiff/sample-survey.tif?lat={lat}&lng={lng}"
    }


@router.get("/geotiff/sample-survey.tif")
def stream_sample_survey_cog(
    request: Request,
    lat: float = Query(24.4686),
    lng: float = Query(39.6120)
):
    """
    HTTP Range-Request enabled Cloud-Optimized GeoTIFF streaming endpoint.
    Serves 206 Partial Content slices to allow client-side geotiff.js window extraction
    without loading entire multi-megabyte raster files into memory.
    Triggers explicit telemetry logs on every image retrieval.
    """
    raw_bytes, meta = _get_or_create_sample_cog(lat, lng)
    total_len = len(raw_bytes)

    range_header = request.headers.get("range")
    client_ip = request.client.host if request.client else "unknown"

    if range_header and range_header.startswith("bytes="):
        byte_range = range_header.replace("bytes=", "").strip()
        parts = byte_range.split("-")
        try:
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else total_len - 1
            start = max(0, min(start, total_len - 1))
            end = max(start, min(end, total_len - 1))
            content_length = (end - start) + 1

            # Log GeoTIFF retrieval event
            logger.info(
                f"[geotiff.stream] Retrieved GeoTIFF slice: bytes={start}-{end}/{total_len} "
                f"({content_length} bytes) for survey site ({lat:.4f}, {lng:.4f}) | Client: {client_ip}"
            )

            headers = {
                "Content-Range": f"bytes {start}-{end}/{total_len}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": "image/tiff",
                "Cache-Control": "public, max-age=3600"
            }
            return Response(
                content=raw_bytes[start:end + 1],
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers
            )
        except Exception as e:
            logger.warning(f"[geotiff.stream] Invalid range requested: {range_header} ({e})")

    # Full file retrieval
    logger.info(
        f"[geotiff.stream] Retrieved full GeoTIFF image ({total_len} bytes) "
        f"for survey site ({lat:.4f}, {lng:.4f}) | Client: {client_ip}"
    )

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(total_len),
        "Content-Type": "image/tiff",
        "Cache-Control": "public, max-age=3600"
    }
    return Response(content=raw_bytes, status_code=status.HTTP_200_OK, headers=headers)

