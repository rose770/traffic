import re
import math
import subprocess
import tempfile
import os
import io
from typing import Dict, Any, List, Optional, Tuple
import pyproj
import ezdxf
from ezdxf.document import Drawing


# -------------------------------------------------------------
# 1. AutoCAD Color Index (ACI) to Hex Table
# -------------------------------------------------------------
ACI_HEX_MAP = {
    1: "#FF0000", 2: "#FFFF00", 3: "#00FF00", 4: "#00FFFF", 5: "#0000FF",
    6: "#FF00FF", 7: "#FFFFFF", 8: "#808080", 9: "#C0C0C0",
    10: "#FF0000", 20: "#FF6600", 30: "#FF9900", 40: "#FFCC00",
    50: "#FFFF00", 60: "#CCFF00", 70: "#66FF00", 80: "#00FF00",
    90: "#00FF66", 100: "#00FFCC", 110: "#00FFFF", 120: "#00CCFF",
    130: "#0066FF", 140: "#0000FF", 150: "#6600FF", 160: "#CC00FF",
    170: "#FF00FF", 180: "#FF00CC", 190: "#FF0066", 200: "#FF3333",
    210: "#FF6666", 220: "#FF9999", 230: "#FFCCCC", 240: "#990000",
    250: "#333333", 251: "#555555", 252: "#777777", 253: "#999999",
    254: "#BBBBBB", 255: "#DDDDDD"
}


def aci_to_hex(color_index: Optional[int]) -> str:
    """Map AutoCAD color index (1-255) to hex color."""
    if color_index is None:
        return "#AAAAAA"
    return ACI_HEX_MAP.get(int(color_index), "#AAAAAA")


# -------------------------------------------------------------
# 2. AutoCAD DXF Text Cleaner
# -------------------------------------------------------------
def clean_dxf_text(raw: Any) -> str:
    """Strips AutoCAD MText formatting codes, font codes, fractions, and gibberish."""
    if not raw:
        return ""
    text = str(raw)
    text = re.sub(r"^[0-9.]+x;", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\\+p[a-zA-Z0-9,.:= -]+;", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\\+f[^;]+;", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\\+[A-Za-z0-9_#.=-]+;", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\\+S[^;]*;", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\\+[PpXx]", " ", text)
    text = text.replace("^J", " ").replace("^M", "")
    text = re.sub(r"\\+[a-zA-Z0-9~]", "", text)
    text = re.sub(r"[{}]", "", text)
    text = re.sub(r"%%c", "⌀", text, flags=re.IGNORECASE)
    text = re.sub(r"%%d", "°", text, flags=re.IGNORECASE)
    text = re.sub(r"%%p", "±", text, flags=re.IGNORECASE)
    text = re.sub(r"%%u", "", text, flags=re.IGNORECASE)
    text = re.sub(r"%%o", "", text, flags=re.IGNORECASE)
    text = text.replace("%%%", "%")
    text = re.sub(r"\b(?:p?xqc|p?xql|p?xqr)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r":\s*\)", ")", text)
    text = re.sub(r":\s*$", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    # Filter out raw shape-font gibberish
    if len(text) > 5 and not re.search(r"[\u0600-\u06FF]", text):
        if re.match(r"^[a-zA-Z\s'\[\]()]{8,}$", text) and any(
            gib in text for gib in ["vdR", "sglh", "kihdm", "HBIdv"]
        ):
            return ""

    return text


def is_civil_micro_noise(name: str = "") -> bool:
    """Filter out non-traffic civil engineering layers (manholes, curbs, etc.)."""
    n = (name or "").upper()
    noise_keywords = [
        "MANHOLE", "BASIN", "TILES", "CURB", "IRRIGATION", "SCUPPER",
        "ASPHLT", "FENCE", "LIGHT POLE", "TANK", "GENM", "WALL",
        "C S", "FRAM", "WEARING", "SUB GRADE", "BASE COURSE", "EMBANKMENT"
    ]
    return any(kw in n for kw in noise_keywords)


def get_layer_role(layer_name: str, color_code: int) -> Dict[str, str]:
    """Semantic role descriptor based on CAD layer and attributes."""
    l = (layer_name or "").upper()
    if "تنظيم" in l or "REG" in l or "BOUND" in l:
        return {"ar": "خط تنظيم معتمد ومسار نزع ملكية", "en": "Regulatory Approved Boundary", "color": "#00E5FF"}
    if "ROAD" in l or "طريق" in l or "TRAFFIC" in l:
        return {"ar": "مسار تحويلة الطريق وحارات السير", "en": "Detour Road Corridor & Lanes", "color": "#FFD600"}
    if "SIGN" in l or "لوح" in l:
        return {"ar": "لوحة مرورية وتحذيرية", "en": "Traffic Signboard", "color": "#00E676"}
    if "HATCH" in l or "WORK" in l or "عمل" in l:
        return {"ar": "نطاق أعمال حفر وإنشاءات", "en": "Excavation & Work Zone", "color": "#FF1744"}
    if "CADR-YEL" in l or "YEL" in l:
        return {"ar": "حواجز توجيهية وخطوط تحذيرية صفراء", "en": "Warning Delineators & Barriers", "color": "#FF9100"}
    return {"ar": "عنصر مخطط هندسي تنفيذي", "en": "Engineering Plan Geometry", "color": aci_to_hex(color_code) or "#00FFFF"}


from app.config import BASE_DIR


# -------------------------------------------------------------
# 3. DWG to DXF Conversion Helper
# -------------------------------------------------------------
def convert_dwg_to_dxf_string(dwg_bytes: bytes) -> str:
    """Converts DWG binary buffer to DXF string using dwgdxf via Node."""
    with tempfile.NamedTemporaryFile(suffix=".dwg", delete=False) as tmp_dwg:
        tmp_dwg.write(dwg_bytes)
        tmp_dwg_path = tmp_dwg.name.replace("\\", "/")

    try:
        # Inline Node snippet to run dwgdxf converter in project directory
        script = f"""
        import fs from 'fs';
        import('dwgdxf').then(async (m) => {{
            await m.init();
            const buf = fs.readFileSync('{tmp_dwg_path}');
            const dxfBytes = await m.convertDwgToDxf(new Uint8Array(buf));
            process.stdout.write(Buffer.from(dxfBytes));
        }}).catch(err => {{
            console.error(err);
            process.exit(1);
        }});
        """
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=str(BASE_DIR),
            capture_output=True,
            check=True
        )
        return proc.stdout.decode("utf-8", errors="ignore")
    finally:
        if os.path.exists(tmp_dwg_path):
            try:
                os.remove(tmp_dwg_path)
            except OSError:
                pass


def get_polyline_points(entity: Any) -> List[Tuple[float, float]]:
    """Extract (x, y) coordinates from LWPOLYLINE or POLYLINE entities in ezdxf."""
    pts = []
    if hasattr(entity, "get_points") and callable(entity.get_points):
        pts = [(float(p[0]), float(p[1])) for p in entity.get_points()]
    elif hasattr(entity, "points") and callable(entity.points):
        pts = [(float(p[0]), float(p[1])) for p in entity.points()]
    elif hasattr(entity, "vertices"):
        v_attr = getattr(entity, "vertices")
        v_list = list(v_attr()) if callable(v_attr) else list(v_attr)
        for v in v_list:
            if hasattr(v, "dxf") and hasattr(v.dxf, "location"):
                pts.append((float(v.dxf.location.x), float(v.dxf.location.y)))
            elif hasattr(v, "dxf") and hasattr(v.dxf, "insert"):
                pts.append((float(v.dxf.insert.x), float(v.dxf.insert.y)))
    return pts


def load_dxf_document(dxf_string: str) -> Drawing:
    """Safely loads DXF string with automatic recovery and repair."""
    try:
        doc = ezdxf.read(io.StringIO(dxf_string))
        if len(doc.modelspace()) > 0:
            return doc
    except Exception:
        pass
    from ezdxf.recover import read as recover_read
    doc, _ = recover_read(io.BytesIO(dxf_string.encode("utf-8", errors="ignore")))
    return doc


# -------------------------------------------------------------
# 4. Core CAD Parser & GeoJSON Converter
# -------------------------------------------------------------
def parse_cad_drawing(
    file_bytes: bytes,
    filename: str,
    user_crs: Optional[str] = None,
    anchor_lat_param: Optional[float] = None,
    anchor_lng_param: Optional[float] = None
) -> Dict[str, Any]:
    file_size = len(file_bytes)
    is_dxf = filename.lower().endswith(".dxf")

    if is_dxf:
        dxf_string = file_bytes.decode("utf-8", errors="ignore")
    else:
        dxf_string = convert_dwg_to_dxf_string(file_bytes)

    doc: Drawing = load_dxf_document(dxf_string)
    msp = doc.modelspace()

    # Extract layers
    layers_raw = {}
    for layer in doc.layers:
        layers_raw[layer.dxf.name] = {
            "color": layer.get_color(),
            "is_off": layer.is_off(),
            "is_frozen": layer.is_frozen()
        }

    layers = []
    for name, info in layers_raw.items():
        layers.append({
            "name": name,
            "color": info["color"],
            "visible": not info["is_frozen"] and not info["is_off"] and not is_civil_micro_noise(name)
        })

    # Collect coordinates for spatial median & outlier filtering
    all_x: List[float] = []
    all_y: List[float] = []

    def check_pt(x: float, y: float) -> None:
        if isinstance(x, (int, float)) and math.isfinite(x) and isinstance(y, (int, float)) and math.isfinite(y):
            all_x.append(float(x))
            all_y.append(float(y))

    for entity in msp:
        dxftype = entity.dxftype()
        if dxftype == "LINE":
            check_pt(entity.dxf.start.x, entity.dxf.start.y)
            check_pt(entity.dxf.end.x, entity.dxf.end.y)
        elif dxftype in ("LWPOLYLINE", "POLYLINE"):
            for vx, vy in get_polyline_points(entity):
                check_pt(vx, vy)
        elif dxftype in ("CIRCLE", "ARC"):
            check_pt(entity.dxf.center.x, entity.dxf.center.y)
        elif dxftype in ("TEXT", "MTEXT"):
            insert = getattr(entity.dxf, "insert", None) or getattr(entity.dxf, "align_point", None)
            if insert:
                check_pt(insert.x, insert.y)
        elif dxftype == "INSERT":
            check_pt(entity.dxf.insert.x, entity.dxf.insert.y)

    min_x, max_x = float("inf"), float("-inf")
    min_y, max_y = float("inf"), float("-inf")
    median_x, median_y = 0.0, 0.0

    if all_x and all_y:
        all_x.sort()
        all_y.sort()
        median_x = all_x[len(all_x) // 2]
        median_y = all_y[len(all_y) // 2]

        MAX_CLUSTER_RADIUS = 15000.0
        for x in all_x:
            if abs(x - median_x) <= MAX_CLUSTER_RADIUS:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
        for y in all_y:
            if abs(y - median_y) <= MAX_CLUSTER_RADIUS:
                min_y = min(min_y, y)
                max_y = max(max_y, y)

    # Scan text entities for explicit CRS declarations & GPS coords
    text_declared_crs = None
    text_declared_lat = None
    text_declared_lng = None

    for entity in msp:
        if entity.dxftype() in ("TEXT", "MTEXT"):
            t = (getattr(entity.dxf, "text", "") or getattr(entity, "text", "") or "").upper()
            if "UTM" in t and ("37" in t or "37N" in t):
                text_declared_crs = "utm37n"
            elif "UTM" in t and ("38" in t or "38N" in t):
                text_declared_crs = "utm38n"

            raw_txt = (getattr(entity.dxf, "text", "") or getattr(entity, "text", "") or "").strip()
            lat_m = re.search(r"(?:N|LAT|LATITUDE)[:\s=]+([2-3]\d\.\d+)", raw_txt, re.I) or re.search(r"([2-3]\d\.\d+)\s*(?:N|LAT)", raw_txt, re.I)
            lng_m = re.search(r"(?:E|LNG|LON|LONGITUDE)[:\s=]+([3-5]\d\.\d+)", raw_txt, re.I) or re.search(r"([3-5]\d\.\d+)\s*(?:E|LNG|LON)", raw_txt, re.I)
            if lat_m and not text_declared_lat:
                text_declared_lat = float(lat_m.group(1))
            if lng_m and not text_declared_lng:
                text_declared_lng = float(lng_m.group(1))

    # CRS setup
    utm_zone_37n = "+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs"
    utm_zone_38n = "+proj=utm +zone=38 +datum=WGS84 +units=m +no_defs"
    ain_el_abd = "+proj=utm +zone=37 +ellps=intl +towgs84=-143,-236,7,0,0,0,0 +units=m +no_defs"
    wgs84 = "+proj=longlat +datum=WGS84 +no_defs"

    coord_system = user_crs or "unknown"
    from_proj_str = None

    if coord_system in ("utm37n", "EPSG:32637"):
        coord_system = "utm37n"
        from_proj_str = utm_zone_37n
    elif coord_system in ("utm38n", "EPSG:32638"):
        coord_system = "utm38n"
        from_proj_str = utm_zone_38n
    elif coord_system in ("ain_el_abd", "EPSG:20499"):
        coord_system = "ain_el_abd"
        from_proj_str = ain_el_abd
    elif text_declared_crs == "utm37n":
        coord_system = "utm37n"
        from_proj_str = utm_zone_37n
    elif text_declared_crs == "utm38n":
        coord_system = "utm38n"
        from_proj_str = utm_zone_38n
    else:
        if 100000 < median_x < 900000 and 2500000 < median_y < 3000000:
            coord_system = "utm37n"
            from_proj_str = utm_zone_37n
        else:
            coord_system = "local"

    transformer = None
    if from_proj_str:
        p_from = pyproj.CRS.from_string(from_proj_str)
        p_wgs84 = pyproj.CRS.from_string(wgs84)
        transformer = pyproj.Transformer.from_crs(p_from, p_wgs84, always_xy=True)

    anchor_lat = text_declared_lat or (float(anchor_lat_param) if anchor_lat_param else 24.4686)
    anchor_lng = text_declared_lng or (float(anchor_lng_param) if anchor_lng_param else 39.6120)

    geom_center_x = (min_x + max_x) / 2.0 if min_x != float("inf") else 0.0
    geom_center_y = (min_y + max_y) / 2.0 if min_y != float("inf") else 0.0

    anchor_cad_x = 0.0 if (min_x <= 0 <= max_x and min_y <= 0 <= max_y and math.hypot(geom_center_x, geom_center_y) < 300) else geom_center_x
    anchor_cad_y = 0.0 if (min_x <= 0 <= max_x and min_y <= 0 <= max_y and math.hypot(geom_center_x, geom_center_y) < 300) else geom_center_y

    def to_lat_lng(x: float, y: float) -> Tuple[float, float]:
        if transformer:
            lng, lat = transformer.transform(x, y)
            return (lat, lng)
        else:
            cos_lat = math.cos(anchor_lat * math.pi / 180.0)
            dx = x - anchor_cad_x
            dy = y - anchor_cad_y
            lat = anchor_lat + (dy / 110574.61)
            lng = anchor_lng + (dx / (111320.0 * cos_lat))
            return (lat, lng)

    def is_pt_valid(pt: Any) -> bool:
        if not pt:
            return False
        px = getattr(pt, "x", pt.get("x") if isinstance(pt, dict) else None)
        py = getattr(pt, "y", pt.get("y") if isinstance(pt, dict) else None)
        if px is None or py is None or not math.isfinite(px) or not math.isfinite(py):
            return False
        return math.hypot(px - median_x, py - median_y) < 15000.0

    features: List[Dict[str, Any]] = []
    detected_mot_signs: List[Dict[str, Any]] = []

    # Recursive entity processor for blocks
    def process_entities(entities: Any, transform: Dict[str, Any], depth: int = 0) -> None:
        if depth > 6:
            return

        for idx, entity in enumerate(entities):
            try:
                layer_name = getattr(entity.dxf, "layer", "0")
                layer_info = layers_raw.get(layer_name, {})
                color_idx = entity.dxf.color if hasattr(entity.dxf, "color") and entity.dxf.color not in (0, 256) else layer_info.get("color", 7)
                hex_col = aci_to_hex(color_idx)
                role_info = get_layer_role(layer_name, color_idx)

                props = {
                    "layer": layer_name,
                    "type": entity.dxftype(),
                    "colorIndex": color_idx,
                    "color": hex_col,
                    "roleAr": role_info["ar"],
                    "roleEn": role_info["en"],
                    "depth": depth,
                    "isBlockChild": bool(transform["isBlockChild"]),
                    "id": f"{depth}_{idx}"
                }

                def apply_transform(pt: Any) -> Dict[str, float]:
                    if not pt:
                        return None
                    px = getattr(pt, "x", pt[0] if isinstance(pt, (list, tuple)) else pt.get("x", 0))
                    py = getattr(pt, "y", pt[1] if isinstance(pt, (list, tuple)) else pt.get("y", 0))
                    x = px * transform["scaleX"]
                    y = py * transform["scaleY"]
                    if transform["rotation"] != 0:
                        cos_a = math.cos(transform["rotation"])
                        sin_a = math.sin(transform["rotation"])
                        nx = x * cos_a - y * sin_a
                        ny = x * sin_a + y * cos_a
                        x, y = nx, ny
                    x += transform["x"]
                    y += transform["y"]
                    return {"x": x, "y": y}

                etype = entity.dxftype()

                if etype == "LINE":
                    p1 = apply_transform(entity.dxf.start)
                    p2 = apply_transform(entity.dxf.end)
                    if not is_pt_valid(p1) or not is_pt_valid(p2):
                        continue
                    dx = p2["x"] - p1["x"]
                    dy = p2["y"] - p1["y"]
                    length_m = math.hypot(dx, dy)
                    bearing = ((math.atan2(dx, dy) * 180.0 / math.pi) + 360.0) % 360.0
                    lat1, lng1 = to_lat_lng(p1["x"], p1["y"])
                    lat2, lng2 = to_lat_lng(p2["x"], p2["y"])

                    features.append({
                        "type": "Feature",
                        "properties": {
                            **props,
                            "lengthMeters": round(length_m, 2),
                            "bearingDeg": round(bearing),
                            "startUtm": {"x": round(p1["x"], 1), "y": round(p1["y"], 1)},
                            "endUtm": {"x": round(p2["x"], 1), "y": round(p2["y"], 1)}
                        },
                        "geometry": {"type": "LineString", "coordinates": [[lng1, lat1], [lng2, lat2]]}
                    })

                elif etype in ("POLYLINE", "LWPOLYLINE"):
                    raw_pts = [{"x": p[0], "y": p[1]} for p in get_polyline_points(entity)]
                    if len(raw_pts) < 2:
                        continue

                    pts = [apply_transform(pt) for pt in raw_pts]
                    if not all(is_pt_valid(pt) for pt in pts):
                        continue

                    total_len = sum(math.hypot(pts[i]["x"] - pts[i-1]["x"], pts[i]["y"] - pts[i-1]["y"]) for i in range(1, len(pts)))
                    coords = [[to_lat_lng(pt["x"], pt["y"])[1], to_lat_lng(pt["x"], pt["y"])[0]] for pt in pts]

                    is_explicitly_closed = bool(entity.is_closed if hasattr(entity, "is_closed") else False)
                    first_pt = pts[0]
                    last_pt = pts[-1]
                    is_self_closing = len(pts) >= 3 and math.hypot(first_pt["x"] - last_pt["x"], first_pt["y"] - last_pt["y"]) < 0.05
                    is_closed = (is_explicitly_closed or is_self_closing) and len(pts) >= 3

                    if is_closed:
                        if coords[0] != coords[-1]:
                            coords.append(list(coords[0]))
                        features.append({
                            "type": "Feature",
                            "properties": {**props, "lengthMeters": round(total_len, 2), "vertexCount": len(pts), "isClosed": True},
                            "geometry": {"type": "Polygon", "coordinates": [coords]}
                        })
                    else:
                        features.append({
                            "type": "Feature",
                            "properties": {**props, "lengthMeters": round(total_len, 2), "vertexCount": len(pts), "isClosed": False},
                            "geometry": {"type": "LineString", "coordinates": coords}
                        })

                elif etype == "CIRCLE":
                    center = apply_transform(entity.dxf.center)
                    radius = entity.dxf.radius
                    if not is_pt_valid(center) or not radius:
                        continue
                    lat, lng = to_lat_lng(center["x"], center["y"])
                    features.append({
                        "type": "Feature",
                        "properties": {**props, "radius": radius * abs(transform["scaleX"]), "utm": {"x": round(center["x"], 1), "y": round(center["y"], 1)}},
                        "geometry": {"type": "Point", "coordinates": [lng, lat]}
                    })

                elif etype == "ARC":
                    center = entity.dxf.center
                    radius = entity.dxf.radius
                    start_angle = getattr(entity.dxf, "start_angle", 0.0) * math.pi / 180.0
                    end_angle = getattr(entity.dxf, "end_angle", 360.0) * math.pi / 180.0
                    total_angle = end_angle - start_angle
                    if total_angle <= 0:
                        total_angle += 2 * math.pi
                    segments = 32
                    arc_coords = []
                    valid = True
                    for i in range(segments + 1):
                        ang = start_angle + (total_angle * i / segments)
                        px = center.x + radius * math.cos(ang)
                        py = center.y + radius * math.sin(ang)
                        tp = apply_transform({"x": px, "y": py})
                        if not is_pt_valid(tp):
                            valid = False
                            break
                        lat, lng = to_lat_lng(tp["x"], tp["y"])
                        arc_coords.append([lng, lat])

                    if valid and arc_coords:
                        features.append({
                            "type": "Feature",
                            "properties": {**props, "lengthMeters": round(total_angle * radius, 2), "radius": radius},
                            "geometry": {"type": "LineString", "coordinates": arc_coords}
                        })

                elif etype in ("TEXT", "MTEXT"):
                    pos = getattr(entity.dxf, "insert", None) or getattr(entity.dxf, "align_point", None)
                    if not pos:
                        continue
                    tp = apply_transform(pos)
                    if not is_pt_valid(tp):
                        continue
                    raw_str = getattr(entity.dxf, "text", "") or getattr(entity, "text", "")
                    cleaned = clean_dxf_text(raw_str)
                    if not cleaned:
                        continue

                    # Filter table metadata
                    table_meta = {"(cm)", "(m2)", "SIZE", "QTY", "Area", "Total Area", "SHAPE &SYMBOL", "cm", "m2", "m3", "NO.", "SHAPE", "SYMBOL"}
                    if cleaned.strip() in table_meta:
                        continue

                    rot = getattr(entity.dxf, "rotation", 0.0) or 0.0
                    net_rotation = (rot + (transform["rotation"] * 180.0 / math.pi)) % 360.0

                    tag_type = "label"
                    if any(z in cleaned for z in ["منطقة", "Zone", "TRANSITION", "العمل"]):
                        tag_type = "zone"
                    elif re.search(r"\b\d+\s*M\b", cleaned, re.I) or re.search(r"\bM\s*\d+\b", cleaned, re.I):
                        tag_type = "dimension"
                    elif cleaned.startswith("N:") or cleaned.startswith("E:"):
                        tag_type = "coordinate"

                    lat, lng = to_lat_lng(tp["x"], tp["y"])
                    features.append({
                        "type": "Feature",
                        "properties": {
                            **props,
                            "text": cleaned,
                            "tagType": tag_type,
                            "rotationDeg": round(net_rotation),
                            "height": getattr(entity.dxf, "height", 1.0) or 1.0,
                            "utm": {"x": round(tp["x"], 1), "y": round(tp["y"], 1)}
                        },
                        "geometry": {"type": "Point", "coordinates": [lng, lat]}
                    })

                elif etype == "DIMENSION":
                    raw_str = getattr(entity.dxf, "text", "") or getattr(entity, "text", "")
                    cleaned_dim = clean_dxf_text(raw_str)
                    mid_pt = getattr(entity.dxf, "midpoint", None) or getattr(entity.dxf, "defpoint", None)
                    if cleaned_dim and mid_pt:
                        tp = apply_transform(mid_pt)
                        if is_pt_valid(tp):
                            lat, lng = to_lat_lng(tp["x"], tp["y"])
                            features.append({
                                "type": "Feature",
                                "properties": {
                                    **props,
                                    "text": cleaned_dim,
                                    "tagType": "dimension",
                                    "functionalType": "ANNOTATION_GUIDES",
                                    "color": "#8B5CF6",
                                    "colorIndex": 6,
                                    "height": getattr(entity.dxf, "height", 1.2) or 1.2
                                },
                                "geometry": {"type": "Point", "coordinates": [lng, lat]}
                            })

                elif etype == "SOLID":
                    corners = []
                    for i in range(1, 5):
                        attr = f"vtx{i-1}" if hasattr(entity.dxf, f"vtx{i-1}") else f"corner{i}"
                        pt = getattr(entity.dxf, attr, None)
                        if pt is not None:
                            corners.append(pt)
                    if len(corners) >= 3:
                        pts = [apply_transform(pt) for pt in corners]
                        if all(is_pt_valid(pt) for pt in pts):
                            coords = [[to_lat_lng(pt["x"], pt["y"])[1], to_lat_lng(pt["x"], pt["y"])[0]] for pt in pts]
                            coords.append(list(coords[0]))
                            features.append({
                                "type": "Feature",
                                "properties": {**props, "isSolid": True, "fillColor": hex_col},
                                "geometry": {"type": "Polygon", "coordinates": [coords]}
                            })

                elif etype == "INSERT":
                    block_name = getattr(entity.dxf, "name", None)
                    if not block_name or block_name not in doc.blocks:
                        continue
                    block = doc.blocks[block_name]

                    insert_pos = getattr(entity.dxf, "insert", {"x": 0.0, "y": 0.0})
                    world_insert_pos = apply_transform(insert_pos)
                    if not is_pt_valid(world_insert_pos):
                        continue

                    lat, lng = to_lat_lng(world_insert_pos["x"], world_insert_pos["y"])
                    block_layer = (getattr(entity.dxf, "layer", "") or "").upper()
                    b_name_upper = block_name.upper()

                    block_texts = " ".join([
                        clean_dxf_text(getattr(be.dxf, "text", "") or getattr(be, "text", ""))
                        for be in block if be.dxftype() in ("TEXT", "MTEXT")
                    ]).upper()

                    has_sign_layer = "SIGN" in block_layer or any("SIGN" in (getattr(be.dxf, "layer", "") or "").upper() for be in block)

                    recognized_sign_type = None
                    sign_label_ar = ""

                    if "ROAD WORK END" in block_texts or "نهاية" in block_texts or b_name_upper == "II":
                        recognized_sign_type = "road_work_ends_poster"
                        sign_label_ar = "نهاية منطقة العمل"
                    elif "CONCRETE NJB" in block_texts or b_name_upper == "W":
                        recognized_sign_type = "concrete_njb_poster"
                        sign_label_ar = "حاجز خرساني CONCRETE NJB مع إنارة"
                    elif "PLASTIC NJB" in block_texts or b_name_upper == "ER":
                        recognized_sign_type = "plastic_njb_poster"
                        sign_label_ar = "حاجز بلاستيكي PLASTIC NJB مع إنارة"
                    elif "SLOW" in block_texts or "تمهل" in block_texts or "A$CE8A39C43" in b_name_upper:
                        recognized_sign_type = "slow_sign"
                        sign_label_ar = "لوحة تمهل (SLOW)"
                    elif "50" in block_texts or "A$C217D7EA6" in b_name_upper:
                        recognized_sign_type = "speed_limit_50"
                        sign_label_ar = "تحديد سرعة ٥٠"
                    elif "STOP" in block_texts or "قف" in block_texts or "A$C13EFC72C" in b_name_upper or (has_sign_layer and b_name_upper.startswith("A$C")):
                        recognized_sign_type = "stop_sign"
                        sign_label_ar = "لوحة قف (STOP)"
                    elif "CHEVRON" in b_name_upper or "HAZARD" in b_name_upper:
                        recognized_sign_type = "chevron_hazard"
                        sign_label_ar = "شواخص تحذيرية عاكسة (Chevron)"
                    elif "SUN FLOWER" in b_name_upper or "FLASH LIGHT" in b_name_upper:
                        recognized_sign_type = "flash_light"
                        sign_label_ar = "إنارة تحذيرية"
                    elif b_name_upper == "JJ" or "ARROW" in block_texts:
                        recognized_sign_type = "detour_split_arrow"
                        sign_label_ar = "سهم توجيه التحويلة"

                    if recognized_sign_type:
                        is_dup = any(math.hypot(s["lat"] - lat, s["lng"] - lng) < 0.00008 for s in detected_mot_signs)
                        if not is_dup:
                            detected_mot_signs.append({
                                "id": f"auto_sign_{len(detected_mot_signs) + 1}",
                                "type": recognized_sign_type,
                                "lat": lat,
                                "lng": lng,
                                "rotation": getattr(entity.dxf, "rotation", 0.0) or 0.0,
                                "labelAr": sign_label_ar,
                                "originalText": block_texts or block_name
                            })
                        continue

                    scale_x = getattr(entity.dxf, "xscale", 1.0) or 1.0
                    scale_y = getattr(entity.dxf, "yscale", 1.0) or 1.0
                    rot_deg = getattr(entity.dxf, "rotation", 0.0) or 0.0
                    rot_rad = rot_deg * math.pi / 180.0

                    combined_transform = {
                        "x": world_insert_pos["x"],
                        "y": world_insert_pos["y"],
                        "scaleX": transform["scaleX"] * scale_x,
                        "scaleY": transform["scaleY"] * scale_y,
                        "rotation": transform["rotation"] + rot_rad,
                        "isBlockChild": True
                    }

                    process_entities(block, combined_transform, depth + 1)

            except Exception as ex:
                pass

    # Start recursive processing
    init_transform = {"x": 0.0, "y": 0.0, "scaleX": 1.0, "scaleY": 1.0, "rotation": 0.0, "isBlockChild": False}
    process_entities(msp, init_transform)

    # Standardized 6-Group MOT Functional Keymap Classification
    for f in features:
        p = f.get("properties", {})
        layer = (p.get("layer", "") or "").upper()
        text = (p.get("text", "") or "").upper()
        c_idx = p.get("colorIndex")
        col = (p.get("color", "") or "").upper()

        if (
            p.get("isDimensionLine") or p.get("isLeaderLine") or p.get("tagType") == "dimension" or
            any(k in layer for k in ["DIM", "LEADER", "ANNO", "STALBL", "DEFPOINTS", "NOTE"]) or
            p.get("tagType") == "coordinate" or text.startswith("N:") or text.startswith("E:")
        ):
            p["functionalType"] = "ANNOTATION_GUIDES"
            p["keymapId"] = "ANNOTATION_GUIDES"
            p["color"] = "#8B5CF6"
            p["elementRole"] = "الأبعاد وخطوط الإرشاد التوضيحية"
            p["elementRoleEn"] = "Explanatory Dimensions & Guides"
            p["icon"] = "🟣"
        elif (
            any(k in layer for k in ["PED", "SIDEWALK", "WALK", "FOOTPATH", "RAMP"]) or
            "PEDESTRIAN" in text or "مشاة" in text or c_idx == 3 or col in ("#00E676", "#10B981")
        ):
            p["functionalType"] = "PEDESTRIAN_ROUTE"
            p["keymapId"] = "PEDESTRIAN_ROUTE"
            p["color"] = "#10B981"
            p["elementRole"] = "مسار وممشى المشاة المؤمّن"
            p["elementRoleEn"] = "Pedestrian Detour Route"
            p["icon"] = "🟢"
        elif (
            c_idx == 1 or col in ("#FF1744", "#FF0000", "#EF4444") or
            any(k in layer for k in ["DETOUR", "TAPER", "CLOSURE"]) or
            any(k in text for k in ["TRANSITION", "انتقالية", "تحويلة"])
        ):
            p["functionalType"] = "DETOUR_TAPER"
            p["keymapId"] = "DETOUR_TAPER"
            p["color"] = "#EF4444"
            p["elementRole"] = "مسار وتدرج التحويلة المرورية"
            p["elementRoleEn"] = "Detour Transition Lines"
            p["icon"] = "🔴"
        elif (
            c_idx in (2, 40) or col in ("#FFD600", "#FFFF00", "#F59E0B") or
            p.get("isWorkZoneHatch") or any(k in layer for k in ["BUFFER", "SAFTY", "SAFETY", "WORK", "HATCH", "32", "1"]) or
            any(k in text for k in ["BUFFER", "فاصلة", "WORK", "عمل"])
        ):
            p["functionalType"] = "SAFETY_BUFFER"
            p["keymapId"] = "SAFETY_BUFFER"
            p["color"] = "#F59E0B"
            p["elementRole"] = "أظرف ومناطق الأمان الفاصلة"
            p["elementRoleEn"] = "Safety & Buffer Envelopes"
            p["icon"] = "🟡"
        elif (
            c_idx == 4 or col in ("#00E5FF", "#06B6D4") or
            any(k in layer for k in ["تنظيم", "ROAD", "LIMIT", "BOUNDARY", "ROW", "R-O-W", "CURB", "EDGE", "CORRIDOR"])
        ):
            p["functionalType"] = "ROAD_BOUNDARY"
            p["keymapId"] = "ROAD_BOUNDARY"
            p["color"] = "#06B6D4"
            p["elementRole"] = "حدود الطريق والتنظيم المعتمدة"
            p["elementRoleEn"] = "Planning & Road Limits"
            p["icon"] = "🔵"
        else:
            p["functionalType"] = "CENTERLINE_AXIS"
            p["keymapId"] = "CENTERLINE_AXIS"
            p["color"] = "#FFFFFF"
            p["elementRole"] = "محاور الطريق وخطوط المنتصف"
            p["elementRoleEn"] = "Centerlines & Baselines"
            p["icon"] = "⚪"

    # Additional MOT Signs from text / polygons
    for f in features:
        geom = f.get("geometry", {})
        gtype = geom.get("type")
        props = f.get("properties", {})
        mot_type = None
        label_ar = ""
        lat, lng = None, None

        if gtype == "Point" and props.get("text"):
            t = props["text"].upper().strip()
            l = (props.get("layer", "") or "").upper()
            is_sign_layer = any(sl in l for sl in ["SIGN", "DETOUR", "SAFTY", "SAFETY"])

            if any(k in t for k in ["ROAD WORK END", "ROAD WORKS END", "END", "نهاية أعمال", "نهاية منطقة العمل"]):
                mot_type = "road_work_ends_poster"
                label_ar = "نهاية منطقة العمل"
            elif "CONCRETE NJB" in t or ("CONCRETE" in t and any(k in t for k in ["LIGHTS", "3LINE", "NJB"])):
                mot_type = "concrete_njb_poster"
                label_ar = "حاجز خرساني CONCRETE NJB مع إنارة"
            elif "PLASTIC NJB" in t or ("PLASTIC" in t and any(k in t for k in ["LIGHTS", "3LINE", "NJB"])):
                mot_type = "plastic_njb_poster"
                label_ar = "حاجز بلاستيكي PLASTIC NJB مع إنارة"
            elif "STOP" in t or t == "قف":
                mot_type = "stop_sign"
                label_ar = "لوحة قف (STOP)"
            elif "SLOW" in t or "تمهل" in t:
                mot_type = "slow_sign"
                label_ar = "لوحة تمهل (SLOW)"
            elif "50" in t or (is_sign_layer and t == "50"):
                mot_type = "speed_limit_50"
                label_ar = "تحديد سرعة ٥٠ + لوحة تحذير"
            elif is_sign_layer and t == "80":
                mot_type = "speed_limit_80"
                label_ar = "سرعة ٨٠"
            elif is_sign_layer and t == "60":
                mot_type = "speed_limit_60"
                label_ar = "سرعة ٦٠"
            elif is_sign_layer and t == "40":
                mot_type = "speed_limit_40"
                label_ar = "سرعة ٤٠"
            elif is_sign_layer and t == "70":
                mot_type = "speed_limit_70"
                label_ar = "سرعة ٧٠"
            elif "ARROW" in t or "سهم" in t or (is_sign_layer and any(k in t for k in ["DETOUR", "تحويل"])):
                mot_type = "detour_split_arrow"
                label_ar = "سهم توجيه التحويلة الإلزامي"
            elif any(k in t for k in ["CHEVRON", "HAZARD", "عاكس"]):
                mot_type = "chevron_hazard"
                label_ar = "شواخص تحذيرية عاكسة (Chevron)"
            elif "DETOUR AHEAD" in t:
                mot_type = "detour_ahead"
                label_ar = "تحويلة أمامك"

            if geom.get("coordinates"):
                lng, lat = geom["coordinates"][0], geom["coordinates"][1]

        elif gtype in ("Polygon", "LineString"):
            coords = geom.get("coordinates", [])
            if gtype == "Polygon" and coords:
                coords = coords[0]
            l = (props.get("layer", "") or "").upper()
            if 8 <= len(coords) <= 12:
                xs = [c[0] for c in coords]
                ys = [c[1] for c in coords]
                span_m = max((max(xs) - min(xs)) * 111320.0, (max(ys) - min(ys)) * 110574.0)
                if 0.3 <= span_m <= 3.5:
                    props["isTrafficSign"] = True
                    props["motType"] = "stop_sign"
                    mot_type = "stop_sign"
                    label_ar = "لوحة قف (STOP)"
                    lng = sum(xs) / len(xs)
                    lat = sum(ys) / len(ys)
            elif any(k in l for k in ["SIGN", "STOP", "TRAFFIC"]):
                props["isTrafficSign"] = True
                if len(coords) >= 2:
                    mot_type = "stop_sign"
                    label_ar = "لوحة قف (STOP)"
                    lng = sum(c[0] for c in coords) / len(coords)
                    lat = sum(c[1] for c in coords) / len(coords)

        if mot_type and lat is not None and lng is not None:
            is_dup = any(math.hypot(s["lat"] - lat, s["lng"] - lng) < 0.00008 for s in detected_mot_signs)
            if not is_dup:
                detected_mot_signs.append({
                    "id": f"auto_{len(detected_mot_signs) + 1}",
                    "type": mot_type,
                    "lat": lat,
                    "lng": lng,
                    "rotation": props.get("rotationDeg", 0),
                    "labelAr": label_ar,
                    "originalText": props.get("text", "")
                })

    # Ground Control Points Tie-in Alignment
    control_points = []
    cur_e = None
    cur_n = None
    for entity in msp:
        if entity.dxftype() in ("TEXT", "MTEXT"):
            raw_txt = getattr(entity.dxf, "text", "") or getattr(entity, "text", "") or ""
            pos = getattr(entity.dxf, "insert", None) or getattr(entity.dxf, "align_point", None)
            e_m = re.search(r"E:\s*([0-9.]+)", raw_txt, re.I)
            n_m = re.search(r"N:\s*([0-9.]+)", raw_txt, re.I)
            if e_m:
                cur_e = {"val": float(e_m.group(1)), "rawPt": pos}
            if n_m:
                cur_n = {"val": float(n_m.group(1)), "rawPt": pos}
            if cur_e and cur_n:
                control_points.append({
                    "targetLat": cur_n["val"],
                    "targetLng": cur_e["val"],
                    "cadPt": {"x": getattr(cur_n["rawPt"], "x", 0.0), "y": getattr(cur_n["rawPt"], "y", 0.0)} if cur_n["rawPt"] else None
                })
                cur_e = None
                cur_n = None

    auto_alignment = {"hasControlPoints": False, "dLat": 0.0, "dLng": 0.0, "rotationDeg": 0.0, "controlPoints": []}
    if control_points and coord_system == "utm37n":
        target_pt = control_points[0]
        # Find regulation line or road line
        reg_lines = [e for e in msp if e.dxftype() == "LINE" and (getattr(e.dxf, "layer", "") in ("تنظيم", "1-ROAD"))]
        if reg_lines:
            p1_lat, p1_lng = to_lat_lng(reg_lines[0].dxf.start.x, reg_lines[0].dxf.start.y)
            d_lat = target_pt["targetLat"] - p1_lat
            d_lng = target_pt["targetLng"] - p1_lng
            if abs(d_lat) < 0.005 and abs(d_lng) < 0.005:
                auto_alignment = {
                    "hasControlPoints": True,
                    "dLat": round(d_lat, 7),
                    "dLng": round(d_lng, 7),
                    "rotationDeg": 0.0,
                    "controlPoints": control_points
                }

    # CAD Smart Extraction Engine (Zones, street name, speed limit, dates, dimensions)
    all_clean_texts = []
    for entity in msp:
        if entity.dxftype() in ("TEXT", "MTEXT"):
            raw = getattr(entity.dxf, "text", "") or getattr(entity, "text", "") or ""
            cln = clean_dxf_text(raw)
            if cln:
                all_clean_texts.append({
                    "text": cln,
                    "raw": raw,
                    "layer": getattr(entity.dxf, "layer", "0")
                })

    def dist_match(s: str) -> Optional[float]:
        if not s:
            return None
        m = re.search(r"(\d+(?:\.\d+)?)\s*M\b", s, re.I) or re.search(r"\bM\s*(\d+(?:\.\d+)?)", s, re.I) or re.search(r"(\d+)\s*م", s)
        return float(m.group(1)) if m else None

    zones = {
        "advanceWarning": {"lengthM": 500, "labelAr": "منطقة التحذير المتقدم", "labelEn": "Advance Warning Area", "source": "MOT Standard (500m)"},
        "transition": {"lengthM": 0, "labelAr": "المنطقة الانتقالية", "labelEn": "Transition Area (Taper)", "source": "CAD Extracted"},
        "buffer": {"lengthM": 0, "labelAr": "المنطقة الفاصلة ومساحة الأمان", "labelEn": "Buffer Space", "source": "CAD Extracted"},
        "workArea": {"lengthM": 0, "widthM": 0, "labelAr": "منطقة العمل الإنشائي", "labelEn": "Work Area", "source": "CAD Extracted"},
        "termination": {"lengthM": 0, "labelAr": "منطقة نهاية العمل", "labelEn": "Termination Area", "source": "CAD Extracted"}
    }

    for i in range(len(all_clean_texts)):
        item = all_clean_texts[i]
        next_txt = all_clean_texts[i + 1]["text"] if i + 1 < len(all_clean_texts) else ""
        prev_txt = all_clean_texts[i - 1]["text"] if i - 1 >= 0 else ""
        val = dist_match(item["text"]) or dist_match(next_txt) or dist_match(prev_txt)

        if "المنطقة الانتقالية" in item["text"] or "transition" in item["text"].lower():
            if val and val >= 30:
                zones["transition"]["lengthM"] = max(zones["transition"]["lengthM"], int(val))
        elif "المنطقة الفاصلة" in item["text"] or "buffer" in item["text"].lower():
            if val:
                zones["buffer"]["lengthM"] = max(zones["buffer"]["lengthM"], int(val))
        elif "منطقة العمل" in item["text"] or ("العمل" in item["text"] and "نهاية" not in item["text"]) or "work area" in item["text"].lower():
            if val:
                zones["workArea"]["lengthM"] = max(zones["workArea"]["lengthM"], int(val))
        elif "نهاية العمل" in item["text"] or "termination" in item["text"].lower():
            if val:
                zones["termination"]["lengthM"] = max(zones["termination"]["lengthM"], int(val))

    max_cone_span = 0
    for t in all_clean_texts:
        cone_m = re.search(r"(\d+)\s*@\s*(\d+)\s*m", t["text"], re.I)
        if cone_m:
            count = int(cone_m.group(1))
            spacing = int(cone_m.group(2))
            max_cone_span = max(max_cone_span, count * spacing)
        detour_ahead_m = re.search(r"DETOUR\s+AHEAD\s+(\d+)\s*m", t["text"], re.I)
        if detour_ahead_m:
            zones["advanceWarning"]["lengthM"] = max(zones["advanceWarning"]["lengthM"], int(detour_ahead_m.group(1)))
            zones["advanceWarning"]["source"] = "CAD Extracted"

    if max_cone_span > zones["transition"]["lengthM"]:
        zones["transition"]["lengthM"] = max_cone_span
        zones["transition"]["source"] = "CAD Cone Spacing"

    # Road width from DIMENSION entities
    detected_road_width_m = ""
    for entity in msp:
        if entity.dxftype() == "DIMENSION":
            dim_txt = getattr(entity.dxf, "text", "") or getattr(entity, "text", "") or ""
            dim_val = dist_match(dim_txt)
            if dim_val and 3 < dim_val < 100:
                detected_road_width_m = dim_val

    total_detour_length_m = (
        (zones["transition"]["lengthM"] or 0) +
        (zones["buffer"]["lengthM"] or 0) +
        (zones["workArea"]["lengthM"] or 0) +
        (zones["termination"]["lengthM"] or 0)
    )

    detected_street_name_ar = ""
    detected_street_name_en = ""
    detected_city_ar = "المدينة المنورة"
    detected_city_en = "Al-Madinah Al-Munawwarah"

    for t in all_clean_texts:
        if t["layer"] in ("-NAMES", "NAME"):
            txt = t["text"]
            if re.search(r"prince|road|street|highway|bridge", txt, re.I) and len(txt) > 5:
                if not detected_street_name_en or len(txt) > len(detected_street_name_en):
                    detected_street_name_en = txt

        cl_m = re.search(r"(?:℄|CL|C/L)\s*(?:OF\s+)?(.+(?:ROAD|STREET|HIGHWAY))", t["text"], re.I)
        if cl_m:
            name = cl_m.group(1).strip()
            if not detected_street_name_en or len(name) > len(detected_street_name_en):
                detected_street_name_en = name

        txt = t["text"]
        if any(k in txt for k in ["طريق الأمير", "طريق الملك", "شارع", "طريق"]):
            if not detected_street_name_ar or len(txt) > len(detected_street_name_ar):
                detected_street_name_ar = txt
        if not detected_street_name_en and any(k in txt for k in ["Road", "Street", "Highway"]):
            if 5 < len(txt) < 100:
                detected_street_name_en = txt

    if not detected_street_name_ar:
        if "242206770" in filename:
            detected_street_name_ar = "طريق الأمير مقرن بن عبدالعزيز"
        elif "bridge" in filename.lower():
            detected_street_name_ar = "طريق الأمير نايف بن عبدالعزيز (تقاطع الجسر)"

    if not detected_street_name_en:
        if "242206770" in filename:
            detected_street_name_en = "Prince Muqrin Ibn Abdulaziz Road"
        elif "bridge" in filename.lower():
            detected_street_name_en = "Prince Nayif Bin Abdulaziz Road (Bridge Intersection)"

    detected_speed_limit = ""
    for t in all_clean_texts:
        sp_m = re.search(r"SPEED\s+LIMIT\s+(?:FOR\s+ROAD\s+)?(\d+)\s*(?:km|KM)", t["text"], re.I)
        if sp_m:
            detected_speed_limit = int(sp_m.group(1))

    if not detected_speed_limit:
        for t in all_clean_texts:
            if t["layer"] == "SIGN" and t["text"].isdigit():
                val = int(t["text"])
                if 30 <= val <= 120 and val != 70:
                    detected_speed_limit = val

    detected_start_date = ""
    detected_end_date = ""
    for t in all_clean_texts:
        d_m = re.search(r"(\d{2})/(\d{2})/(\d{4})", t["text"])
        if d_m:
            iso_d = f"{d_m.group(3)}-{d_m.group(2)}-{d_m.group(1)}"
            if not detected_start_date:
                detected_start_date = iso_d
            elif not detected_end_date:
                detected_end_date = iso_d
        iso_m = re.search(r"(\d{4}-\d{2}-\d{2})", t["text"])
        if iso_m:
            if not detected_start_date:
                detected_start_date = iso_m.group(1)
            elif not detected_end_date:
                detected_end_date = iso_m.group(1)

    has_concrete_njb = any("CONCRETE NJB" in t["text"] or "CONCRETE BARRIER" in t["text"] for t in all_clean_texts)
    has_plastic_njb = any("PLASTIC NJB" in t["text"] or "PLASTIC BARRIER" in t["text"] for t in all_clean_texts)
    has_plastic_njb_with_lights = any(("PLASTIC" in t["text"] or "NJB" in t["text"]) and "LIGHTS" in t["text"] for t in all_clean_texts)

    road_sections = []
    section_labels = ["Sidewalk", "Main Road", "Service Road", "Separator", "Shoulder", "Parking", "Median"]
    for t in all_clean_texts:
        if t["text"] in section_labels and t["text"] not in road_sections:
            road_sections.append(t["text"])

    is_multi_lane_divided = "Median" in road_sections or "Service Road" in road_sections
    has_service_road = "Service Road" in road_sections
    detected_total_lanes_count = 6 if is_multi_lane_divided else (4 if has_service_road else (3 if road_sections else ""))
    detected_active_lanes_count = max(1, detected_total_lanes_count - 1) if isinstance(detected_total_lanes_count, int) else ""

    anchor_center_lat, anchor_center_lng = (
        (text_declared_lat, text_declared_lng)
        if text_declared_lat and text_declared_lng
        else to_lat_lng(geom_center_x, geom_center_y)
    )
    coord_string = f"{anchor_center_lat:.6f}, {anchor_center_lng:.6f}"

    concrete_barrier_meters = zones["workArea"]["lengthM"] or ""
    plastic_barrier_meters = zones["transition"]["lengthM"] or ""
    flashing_arrow_boards_count = 4 if has_plastic_njb_with_lights else (2 if any(s["type"] == "flash_light" for s in detected_mot_signs) else "")
    traffic_signs_count = len(detected_mot_signs) or ""

    extracted_info = {
        "clientNameAr": "",
        "clientNameEn": "",
        "projectNameAr": f"مشروع تحويلة {detected_street_name_ar}" if detected_street_name_ar else "",
        "projectNameEn": f"Traffic Detour Plan - {detected_street_name_en}" if detected_street_name_en else "",
        "contractingCompanyAr": "",
        "contractingCompanyEn": "",
        "consultantNameAr": "",
        "consultantNameEn": "",
        "projectManagerAr": "",
        "projectManagerEn": "",
        "ownerClassification": "",
        "streetNameAr": detected_street_name_ar,
        "streetNameEn": detected_street_name_en,
        "cityAr": detected_city_ar or "",
        "cityEn": detected_city_en or "",
        "locationAr": f"{detected_city_ar} - {detected_street_name_ar}" if detected_street_name_ar else "",
        "locationEn": f"{detected_city_en} - {detected_street_name_en}" if detected_street_name_en else "",
        "coordinates": coord_string,
        "latitude": round(anchor_center_lat, 6),
        "longitude": round(anchor_center_lng, 6),
        "roadClassification": "",
        "trafficVolumeLevel": "",
        "workDurationCategory": "",
        "workPurposeAr": "",
        "workPurposeEn": "",
        "owningUtilityAr": "",
        "owningUtilityEn": "",
        "speedLimit": detected_speed_limit or "",
        "permitStartDate": detected_start_date or "",
        "permitEndDate": detected_end_date or "",
        "workStartDate": detected_start_date or "",
        "workEndDate": detected_end_date or "",
        "detailedTimeline": "",
        "roadCrossSection": road_sections,
        "isMultiLaneDivided": is_multi_lane_divided,
        "hasServiceRoad": has_service_road,
        "barrierTypes": {
            "hasConcreteNJB": has_concrete_njb,
            "hasPlasticNJB": has_plastic_njb,
            "hasPlasticNJBWithLights": has_plastic_njb_with_lights
        },
        "zones": zones,
        "dimensions": {
            "totalDetourLengthM": total_detour_length_m or "",
            "trenchLengthM": zones["workArea"]["lengthM"] or "",
            "trenchWidthM": zones["workArea"]["widthM"] or "",
            "trenchDepthM": "",
            "closedLaneWidthM": "",
            "activeLanesCount": detected_active_lanes_count or "",
            "activeLanesLeftCount": max(1, detected_active_lanes_count // 2) if is_multi_lane_divided and isinstance(detected_active_lanes_count, int) else "",
            "activeLanesRightCount": max(1, math.ceil(detected_active_lanes_count / 2.0)) if is_multi_lane_divided and isinstance(detected_active_lanes_count, int) else (detected_active_lanes_count or ""),
            "detourLanesPlacement": "dual" if is_multi_lane_divided else "right",
            "closedLanesCount": "",
            "totalLanesCount": detected_total_lanes_count or "",
            "lateralClearanceM": "",
            "longitudinalBufferM": zones["buffer"]["lengthM"] or "",
            "siteWidthM": detected_road_width_m or "",
            "roadWidthM": detected_road_width_m or ""
        },
        "barriers": {
            "concreteBarriersLengthM": concrete_barrier_meters or "",
            "plasticBarriersLengthM": plastic_barrier_meters or "",
            "flashingArrowBoards": flashing_arrow_boards_count or "",
            "trafficSignsCount": traffic_signs_count or ""
        },
        "plans": {
            "roadClosureAr": "",
            "roadClosureEn": "",
            "trafficFlowPlanAr": "",
            "trafficFlowPlanEn": "",
            "tempBridgesAr": "",
            "lightingPlanAr": "",
            "sideStreetsPlanAr": ""
        },
        "equipmentList": [],
        "extractedFieldsSummary": [],
        "missingFieldsRequired": []
    }

    # Generate Saudi MOT CAD Keymap Engine
    standard_map = {
        "0": {"titleAr": "عناصر المخطط ومسار التحويلة الرئيسي", "titleEn": "Main Detour & Base Elements", "category": "traffic_detour", "icon": "🛣️", "colorHex": "#FF1744", "descriptionAr": "المسار الفعلي لحركة المركبات وتدرج التوجيه المروري"},
        "1": {"titleAr": "مسار الطريق وحارات السير", "titleEn": "Road Corridor & Traffic Lanes", "category": "traffic_detour", "icon": "🛣️", "colorHex": "#2979FF", "descriptionAr": "حارات الطريق القائم وحركة المرور المفتوحة"},
        "1-ROAD": {"titleAr": "مسار الطريق وحارات السير", "titleEn": "Road Corridor & Traffic Lanes", "category": "traffic_detour", "icon": "🛣️", "colorHex": "#2979FF", "descriptionAr": "حارات الطريق القائم وحركة المرور المفتوحة"},
        "2": {"titleAr": "حدود حارات السير والكتف الجانبي", "titleEn": "Lane Markings & Road Shoulder", "category": "traffic_detour", "icon": "🛣️", "colorHex": "#00E5FF", "descriptionAr": "خطوط التخطيط الأرضي للمسارات والكتف"},
        "32": {"titleAr": "منطقة العمل والصبات الخرسانية", "titleEn": "Work Zone & Concrete Barriers", "category": "work_zone", "icon": "🚧", "colorHex": "#FFD600", "descriptionAr": "موقع الحفر والإنشاءات المحمي بالصبات"},
        "تنظيم": {"titleAr": "خط التنظيم وحدود الملكية المعتمدة", "titleEn": "Regulatory Planning Boundary", "category": "cadastral", "icon": "🗺️", "colorHex": "#00E5FF", "descriptionAr": "حدود الشارع المعتمدة من أمانة المدينة المنورة"},
        "SIGN": {"titleAr": "اللوحات واللافتات المرورية التحذيرية", "titleEn": "Traffic Signboards & Warning Signs", "category": "signage", "icon": "🛑", "colorHex": "#FF9100", "descriptionAr": "شواخص تحذيرية وإرشادية ولوحات الأسهم"},
        "SIGNBOARDS": {"titleAr": "اللوحات واللافتات المرورية التحذيرية", "titleEn": "Traffic Signboards & Warning Signs", "category": "signage", "icon": "🛑", "colorHex": "#FF9100", "descriptionAr": "شواخص تحذيرية وإرشادية ولوحات الأسهم"},
        "Sign Board": {"titleAr": "اللوحات واللافتات المرورية التحذيرية", "titleEn": "Traffic Signboards & Warning Signs", "category": "signage", "icon": "🛑", "colorHex": "#FF9100", "descriptionAr": "شواخص تحذيرية وإرشادية ولوحات الأسهم"},
        "0-dim": {"titleAr": "الأبعاد الهندسية وشريط القياس", "titleEn": "Engineering Dimensions & Chainage", "category": "dimensions", "icon": "📐", "colorHex": "#00E676", "descriptionAr": "أطوال ومسافات التحويلة ومحطات العمل"},
        "DIM": {"titleAr": "الأبعاد الهندسية وشريط القياس", "titleEn": "Engineering Dimensions & Chainage", "category": "dimensions", "icon": "📐", "colorHex": "#00E676", "descriptionAr": "أطوال ومسافات التحويلة ومحطات العمل"},
        "HATCH 90%": {"titleAr": "منطقة الحفر والتهشير الإنشائي", "titleEn": "Work Zone Trench Hatch", "category": "work_zone", "icon": "🚧", "colorHex": "#FF6D00", "descriptionAr": "موقع الخندق المحفور والأعمال عالية الخطورة"},
        "CADR-YEL": {"titleAr": "علامات التخطيط والتحذير الصفراء", "titleEn": "Yellow Safety Channelization", "category": "safety_barriers", "icon": "🚧", "colorHex": "#FFD600", "descriptionAr": "تخطيط أرضي أصفر لتحويل المركبات"},
        "pitext": {"titleAr": "نصوص ومعلومات الرفع المساحي", "titleEn": "Survey & Reference Callouts", "category": "surveys", "icon": "📍", "colorHex": "#38BDF8", "descriptionAr": "إحداثيات ومناسيب نقاط الربط المساحي"},
        "Defpoints": {"titleAr": "نقاط القياس والمطابقة المرجعية", "titleEn": "Reference Measurement Points", "category": "general", "icon": "📍", "colorHex": "#9E9E9E", "descriptionAr": "نقاط الربط المساحي المرجعية"},
        "border": {"titleAr": "إطار المخطط وحدود الرفع المعتمد", "titleEn": "Blueprint Sheet Frame", "category": "general", "icon": "🗺️", "colorHex": "#607D8B", "descriptionAr": "حدود لوحة الرسم الهندسية"},
        "PDF_Geometry": {"titleAr": "العناصر الهندسية المرجعية المستوردة", "titleEn": "Imported Reference Geometry", "category": "general", "icon": "🗺️", "colorHex": "#90A4AE", "descriptionAr": "مخططات سابقة مستوردة"},
        "new jersy": {"titleAr": "صبات نيوجيرسي الخرسانية العازلة", "titleEn": "New Jersey Concrete Barriers", "category": "safety_barriers", "icon": "🛡️", "colorHex": "#E0E0E0", "descriptionAr": "حواجز خرسانية لحماية منطقة العمل"}
    }

    layer_entity_count = {}
    for f in features:
        l = f.get("properties", {}).get("layer", "0")
        layer_entity_count[l] = layer_entity_count.get(l, 0) + 1

    active_layers = [l for l in layers if layer_entity_count.get(l["name"], 0) > 0]

    keymap = []
    for l in active_layers:
        found = standard_map.get(l["name"]) or standard_map.get(l["name"].upper())
        if found:
            keymap.append({"layerName": l["name"], **found})
        else:
            keymap.append({
                "layerName": l["name"],
                "titleAr": f"طبقة هندسية ({l['name']})",
                "titleEn": f"Engineering Layer ({l['name']})",
                "category": "general",
                "icon": "🗺️",
                "colorHex": aci_to_hex(l["color"]),
                "descriptionAr": f"عناصر ورسومات طبقة {l['name']}"
            })

    keymap_lookup = {k["layerName"]: k for k in keymap}
    enriched_layers = []
    for l in active_layers:
        km = keymap_lookup.get(l["name"], {})
        enriched_layers.append({
            **l,
            "entityCount": layer_entity_count.get(l["name"], 0),
            "displayNameAr": km.get("titleAr", l["name"]),
            "displayNameEn": km.get("titleEn", l["name"]),
            "category": km.get("category", "general"),
            "colorHex": km.get("colorHex", aci_to_hex(l["color"])),
            "descriptionAr": km.get("descriptionAr", ""),
            "icon": km.get("icon", "🗺️")
        })

    sw_lat, sw_lng = to_lat_lng(min_x, min_y)
    ne_lat, ne_lng = to_lat_lng(max_x, max_y)
    gps_bounds = [
        [min(sw_lat, ne_lat), min(sw_lng, ne_lng)],
        [max(sw_lat, ne_lat), max(sw_lng, ne_lng)]
    ]
    center_lat_lng = to_lat_lng(geom_center_x, geom_center_y)

    entity_counts = {}
    for entity in msp:
        t = entity.dxftype()
        entity_counts[t] = entity_counts.get(t, 0) + 1

    return {
        "success": True,
        "fileName": filename,
        "fileSize": file_size,
        "coordSystem": coord_system,
        "detectedMotSigns": detected_mot_signs,
        "bbox": {"minX": min_x, "maxX": max_x, "minY": min_y, "maxY": max_y},
        "gpsBounds": gps_bounds,
        "centerLatLng": center_lat_lng,
        "autoAlignment": auto_alignment,
        "extractedInfo": extracted_info,
        "layers": enriched_layers,
        "keymap": keymap,
        "entityCounts": entity_counts,
        "totalEntities": len(msp),
        "totalFeatures": len(features),
        "geojson": {
            "type": "FeatureCollection",
            "features": features
        }
    }


def cad_to_geojson_ingest(file_bytes: bytes, filename: str, source_epsg: str = "EPSG:32637") -> Dict[str, Any]:
    """Ingests CAD file and outputs projected GeoJSON using custom source EPSG."""
    is_dxf = filename.lower().endswith(".dxf")
    if is_dxf:
        dxf_string = file_bytes.decode("utf-8", errors="ignore")
    else:
        dxf_string = convert_dwg_to_dxf_string(file_bytes)

    doc: Drawing = load_dxf_document(dxf_string)
    msp = doc.modelspace()

    crs = source_epsg or "EPSG:32637"
    p_from = pyproj.CRS.from_string(CRS_MAP.get(crs, "+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs") if "CRS_MAP" in globals() else "+proj=utm +zone=37 +datum=WGS84 +units=m +no_defs")
    p_wgs84 = pyproj.CRS.from_string("+proj=longlat +datum=WGS84 +no_defs")
    transformer = pyproj.Transformer.from_crs(p_from, p_wgs84, always_xy=True)

    features = []
    for entity in msp:
        layer = getattr(entity.dxf, "layer", "0")
        etype = entity.dxftype()
        if etype == "LINE":
            p1 = entity.dxf.start
            p2 = entity.dxf.end
            lng1, lat1 = transformer.transform(p1.x, p1.y)
            lng2, lat2 = transformer.transform(p2.x, p2.y)
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[lng1, lat1], [lng2, lat2]]},
                "properties": {"layer": layer, "type": "LINE"}
            })
        elif etype in ("LWPOLYLINE", "POLYLINE"):
            pts = get_polyline_points(entity)
            if len(pts) >= 2:
                coords = [list(transformer.transform(p[0], p[1])) for p in pts]
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "properties": {"layer": layer, "type": etype}
                })

    return {
        "type": "FeatureCollection",
        "sourceEpsg": crs,
        "features": features
    }
