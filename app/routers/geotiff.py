from fastapi import APIRouter, Response, UploadFile, File, status
from app.services.geotiff_parser import parse_geotiff_bytes


router = APIRouter(prefix="/api", tags=["GeoTIFF Parser"])


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
        print(f"[GeoTIFF Parser Error] {err}")
        if response:
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": str(err) or "Failed to parse GeoTIFF file"}
