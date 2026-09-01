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


def generate_sample_survey_cog_bytes(
    center_lat: float = 24.4686,
    center_lng: float = 39.6120,
    span_meters: float = 400.0,
    width: int = 1024,
    height: int = 1024
) -> Tuple[bytes, Dict[str, Any]]:
    """
    Generates an ultra-high-resolution (sub-meter ~0.4m/px), georeferenced survey GeoTIFF
    around the project center. Contains crisp engineering survey grid, road markings,
    zebra pedestrian crossings, and work zone textures.
    Returns (tiff_bytes, metadata_dict).
    """
    import numpy as np

    # Calculate geographic span
    m_to_lat = 1.0 / 110574.61
    m_to_lng = 1.0 / (111320.0 * np.cos(np.radians(center_lat)))
    half_span_lat = (span_meters / 2.0) * m_to_lat
    half_span_lng = (span_meters / 2.0) * m_to_lng

    min_lat = center_lat - half_span_lat
    max_lat = center_lat + half_span_lat
    min_lng = center_lng - half_span_lng
    max_lng = center_lng + half_span_lng

    res_x = (max_lng - min_lng) / width
    res_y = (max_lat - min_lat) / height

    # 1. Base raster layer (Natural ground terrain)
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :] = [182, 170, 144]

    # Road corridor across center
    rw = int(height * 0.38)
    y_start = height // 2 - rw // 2
    y_end = height // 2 + rw // 2
    img[y_start:y_end, :] = [46, 52, 58]  # Deep high-grade asphalt

    # Double yellow road centerlines
    img[height // 2 - 4: height // 2 - 1, :] = [255, 204, 0]
    img[height // 2 + 1: height // 2 + 4, :] = [255, 204, 0]

    # Dashed lane dividers
    lane_offset = rw // 4
    for x in range(0, width, 48):
        img[height // 2 - lane_offset - 2: height // 2 - lane_offset + 2, x:x + 28] = [255, 255, 255]
        img[height // 2 + lane_offset - 2: height // 2 + lane_offset + 2, x:x + 28] = [255, 255, 255]

    # White lane outer edge lines
    img[y_start + 6: y_start + 10, :] = [255, 255, 255]
    img[y_end - 10: y_end - 6, :] = [255, 255, 255]

    # Zebra pedestrian crosswalk near west intersection
    zx_walk = int(width * 0.22)
    for zy in range(y_start + 12, y_end - 12, 32):
        img[zy:zy + 18, zx_walk:zx_walk + 70] = [255, 255, 255]

    # Survey target area (Excavation & Work Zone with safety border)
    zx_start = int(width * 0.40)
    zx_end = int(width * 0.72)
    zy_start = int(height * 0.38)
    zy_end = int(height * 0.62)
    img[zy_start:zy_end, zx_start:zx_end] = [155, 105, 55]  # Excavated trench ground

    # Red & White barrier wall perimeter
    for b in range(6):
        # Top barrier
        img[zy_start + b * 2: zy_start + b * 2 + 2, zx_start:zx_end] = [239, 68, 68] if b % 2 == 0 else [255, 255, 255]
        # Bottom barrier
        img[zy_end - b * 2 - 2: zy_end - b * 2, zx_start:zx_end] = [239, 68, 68] if b % 2 == 0 else [255, 255, 255]

    # High-accuracy 10m survey grid ticks (Sub-meter precision overlay)
    grid_spacing = width // 16
    for gx in range(0, width, grid_spacing):
        img[:, gx:gx + 1] = [14, 165, 233]  # Sky-blue survey grid line
    for gy in range(0, height, grid_spacing):
        img[gy:gy + 1, :] = [14, 165, 233]

    # Survey coordinate crosses at grid intersections
    for gx in range(grid_spacing, width, grid_spacing):
        for gy in range(grid_spacing, height, grid_spacing):
            img[gy - 5: gy + 6, gx - 1: gx + 2] = [255, 255, 255]
            img[gy - 1: gy + 2, gx - 5: gx + 6] = [255, 255, 255]

    buf = io.BytesIO()
    extratags = [
        (33550, 'd', 3, [res_x, res_y, 0.0], False),                   # ModelPixelScaleTag
        (33922, 'd', 6, [0.0, 0.0, 0.0, min_lng, max_lat, 0.0], False), # ModelTiepointTag
        (34735, 'H', 8, [1, 1, 0, 1, 1024, 0, 1, 2], False),            # GeoKeyDirectoryTag (ModelTypeGeographic)
    ]

    tifffile.imwrite(buf, img, photometric='rgb', extratags=extratags)
    tiff_bytes = buf.getvalue()

    metadata = {
        "success": True,
        "fileName": "Amanah_Madinah_HighRes_Survey_Grid.tif",
        "fileSize": len(tiff_bytes),
        "width": width,
        "height": height,
        "crs": "EPSG:4326",
        "bounds": [
            [min_lat, min_lng],
            [max_lat, max_lng]
        ],
        "center": [center_lat, center_lng],
        "resolution": [res_x, res_y],
        "minZoomThreshold": 16,
        "spanMeters": span_meters
    }

    return tiff_bytes, metadata

