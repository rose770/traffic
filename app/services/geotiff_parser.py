import io
from typing import Dict, Any, Tuple
import tifffile
import pyproj


CRS_MAP = {
    "EPSG:32637": "+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs",
    "EPSG:32638": "+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs",
    "EPSG:20499": "+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs",
    "EPSG:3857": "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs",
    "EPSG:4326": "+proj=longlat +datum=WGS84 +no_defs"
}


def parse_geotiff_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parse GeoTIFF byte stream, extracting raster geometry, GeoKeys, and WGS84 bounding box."""
    file_size = len(file_bytes)
    with tifffile.TiffFile(io.BytesIO(file_bytes)) as tif:
        if not tif.pages:
            raise ValueError("No pages found in TIFF file")

        page = tif.pages[0]
        width = int(page.imagewidth)
        height = int(page.imagelength)
        samples_per_pixel = int(page.samplesperpixel)

        # Extract geotiff tags
        geokeys = {}
        model_tiepoint = None
        model_pixel_scale = None

        if hasattr(page, "geokeys"):
            geokeys = dict(page.geokeys)
        
        for tag in page.tags:
            if tag.name == "ModelTiepointTag":
                model_tiepoint = list(tag.value)
            elif tag.name == "ModelPixelScaleTag":
                model_pixel_scale = list(tag.value)

        # Estimate origin & resolution
        origin_x = 0.0
        origin_y = 0.0
        res_x = 1.0
        res_y = 1.0

        if model_tiepoint and len(model_tiepoint) >= 6:
            origin_x = float(model_tiepoint[3])
            origin_y = float(model_tiepoint[4])

        if model_pixel_scale and len(model_pixel_scale) >= 2:
            res_x = float(model_pixel_scale[0])
            res_y = float(model_pixel_scale[1])

        raw_bbox = [
            origin_x,
            origin_y - height * abs(res_y),
            origin_x + width * abs(res_x),
            origin_y
        ]

        # CRS detection
        detected_crs = "EPSG:32637"
        if geokeys:
            proj_code = geokeys.get("ProjectedCSTypeGeoKey") or geokeys.get("ProjectionGeoKey")
            if proj_code and f"EPSG:{proj_code}" in CRS_MAP:
                detected_crs = f"EPSG:{proj_code}"
            elif geokeys.get("GeographicTypeGeoKey") == 4326:
                detected_crs = "EPSG:4326"
        elif raw_bbox:
            min_x, min_y, max_x, max_y = raw_bbox
            if -180 <= min_x <= 180 and -180 <= max_x <= 180 and -90 <= min_y <= 90 and -90 <= max_y <= 90:
                detected_crs = "EPSG:4326"

        min_x, min_y, max_x, max_y = raw_bbox
        wgs84_proj = pyproj.CRS.from_string(CRS_MAP["EPSG:4326"])

        if detected_crs == "EPSG:4326":
            sw_lng, sw_lat = min_x, min_y
            ne_lng, ne_lat = max_x, max_y
        else:
            from_proj_str = CRS_MAP.get(detected_crs, CRS_MAP["EPSG:32637"])
            from_proj = pyproj.CRS.from_string(from_proj_str)
            transformer = pyproj.Transformer.from_crs(from_proj, wgs84_proj, always_xy=True)
            sw_lng, sw_lat = transformer.transform(min_x, min_y)
            ne_lng, ne_lat = transformer.transform(max_x, max_y)

        bounds = [
            [min(sw_lat, ne_lat), min(sw_lng, ne_lng)],
            [max(sw_lat, ne_lat), max(sw_lng, ne_lng)]
        ]

        center = [
            (bounds[0][0] + bounds[1][0]) / 2.0,
            (bounds[0][1] + bounds[1][1]) / 2.0
        ]

        return {
            "success": True,
            "fileName": filename,
            "fileSize": file_size,
            "width": width,
            "height": height,
            "samplesPerPixel": samples_per_pixel,
            "crs": detected_crs,
            "rawBbox": raw_bbox,
            "bounds": bounds,
            "center": center,
            "resolution": [abs(res_x), abs(res_y)],
            "geoKeys": geokeys
        }
