import io
import math
import hashlib
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import ezdxf


def _gps_to_utm37n(lat: float, lng: float, origin_lat: float = 24.4686, origin_lng: float = 39.6120) -> Dict[str, float]:
    """Convert GPS coordinates (lat, lng) to metric UTM Zone 37N coordinates (meters)."""
    d_lat = (lat - origin_lat) * 110574.61
    d_lng = (lng - origin_lng) * (111320.0 * math.cos(origin_lat * math.pi / 180.0))
    return {
        "x": round(582500.0 + d_lng, 3),
        "y": round(2703800.0 + d_lat, 3),
    }


def _generate_digital_signature(content_str: str, timestamp_str: str) -> str:
    """Generate SHA-256 verification hash for watermarked CAD files."""
    raw = f"AMANAH_MADINAH_TAHCOM_CAD:{content_str}:{timestamp_str}"
    return "TAHCOM-CAD-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16].upper()


def build_6node_dxf(
    nodes: Optional[List[Dict[str, Any]]] = None,
    boundary_points: Optional[List[Dict[str, Any]]] = None,
    detour_nodes: Optional[List[Dict[str, Any]]] = None,
    pedestrian_nodes: Optional[List[Dict[str, Any]]] = None,
    barrier_nodes: Optional[List[Dict[str, Any]]] = None,
    barrier_type: str = "concrete_njb",
    placed_elements: Optional[List[Dict[str, Any]]] = None,
    labels: Optional[List[Dict[str, Any]]] = None,
    project_name: str = "Traffic Detour & Construction Corridor",
    lat: float = 24.4686,
    lng: float = 39.6120,
    editor_user: str = "Amanah Certified Safety Engineer",
    is_watermarked: bool = True
) -> str:
    """
    Generate AutoCAD DXF using ezdxf R2018 with auto-centering Viewport and clear layers:
      - WORK_ZONE_BOUNDARY (Yellow / ACI 2) - Exactly ONE clean site polygon
      - DETOUR_TAPER (Red / ACI 1) - Detour transition line
      - NJB_BARRIER_LINE (Cyan / ACI 4) - Continuous Concrete Barrier wall or Sign Series
      - PEDESTRIAN_PATH (Green / ACI 3) - Safe pedestrian pathway (optional)
      - TRAFFIC_SIGNS_AND_BARRIERS (Cyan / ACI 4) - Spot signs
      - PLATFORM_DIGITAL_WATERMARK (Magenta / ACI 6) - Verification stamp
    """
    center_lat = float(lat) if lat is not None else 24.4686
    center_lng = float(lng) if lng is not None else 39.6120
    origin_utm = _gps_to_utm37n(center_lat, center_lng, center_lat, center_lng)
    ox, oy = origin_utm["x"], origin_utm["y"]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    sig_hash = _generate_digital_signature(project_name, now_iso)

    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 6  # Metric units (Meters)
    doc.header["$PROJECTNAME"] = project_name[:64]
    msp = doc.modelspace()

    # MOT Standard Layers with exact ACI Colors
    doc.layers.add("WORK_ZONE_BOUNDARY", color=2)          # 2 = Yellow (#F59E0B)
    doc.layers.add("DETOUR_TAPER", color=1)                # 1 = Red (#EF4444)
    doc.layers.add("DETOUR_ROUTE", color=1)                # 1 = Red
    doc.layers.add("NJB_BARRIER_LINE", color=4)            # 4 = Cyan / Barrier Wall
    doc.layers.add("PEDESTRIAN_PATH", color=3)             # 3 = Green (#10B981)
    doc.layers.add("PEDESTRIAN_ROUTE", color=3)            # 3 = Green
    doc.layers.add("ROAD_BOUNDARY", color=4)               # 4 = Cyan (#06B6D4)
    doc.layers.add("CENTERLINE_AXIS", color=7)             # 7 = White
    doc.layers.add("TRAFFIC_SIGNS_AND_BARRIERS", color=4)  # 4 = Cyan / Signs
    doc.layers.add("ANNOTATIONS_AND_LABELS", color=4)      # 4 = Cyan / Text Labels & Notes
    doc.layers.add("PLATFORM_DIGITAL_WATERMARK", color=6)   # 6 = Magenta / Security

    all_x: List[float] = []
    all_y: List[float] = []

    # ── 1. Process Site / Boundary Nodes (Yellow - ONE polygon only) ──
    ctrl_nodes = nodes or boundary_points or []
    utm_nodes: List[Dict[str, float]] = []
    for pt in ctrl_nodes:
        if "lat" in pt and "lng" in pt:
            u = _gps_to_utm37n(float(pt["lat"]), float(pt["lng"]), center_lat, center_lng)
            utm_nodes.append(u)
            all_x.append(u["x"])
            all_y.append(u["y"])
        elif "x" in pt and "y" in pt:
            x, y = float(pt["x"]), float(pt["y"])
            utm_nodes.append({"x": x, "y": y})
            all_x.append(x)
            all_y.append(y)

    if len(utm_nodes) >= 3:
        site_pts = [(n["x"], n["y"]) for n in utm_nodes]
        msp.add_lwpolyline(site_pts, close=True, dxfattribs={"layer": "WORK_ZONE_BOUNDARY", "color": 2})

        # Clean compact node markers (S1, S2, ...) - No huge overlapping coordinate text
        for i, n in enumerate(utm_nodes):
            label = f"S{i + 1}"
            msp.add_circle((n["x"], n["y"]), radius=0.6, dxfattribs={"layer": "WORK_ZONE_BOUNDARY", "color": 2})
            t = msp.add_text(label, dxfattribs={"layer": "WORK_ZONE_BOUNDARY", "height": 0.9, "color": 2})
            t.set_placement((n["x"] + 0.8, n["y"] + 0.8))

    # ── 2. DETOUR_TAPER (Transition Line - Red) ──
    detour_utm: List[Dict[str, float]] = []
    if detour_nodes and len(detour_nodes) >= 2:
        for dn in detour_nodes:
            if "lat" in dn and "lng" in dn:
                u = _gps_to_utm37n(float(dn["lat"]), float(dn["lng"]), center_lat, center_lng)
                detour_utm.append(u)
                all_x.append(u["x"])
                all_y.append(u["y"])
            elif "x" in dn and "y" in dn:
                x, y = float(dn["x"]), float(dn["y"])
                detour_utm.append({"x": x, "y": y})
                all_x.append(x)
                all_y.append(y)

    if detour_utm:
        detour_pts = [(dn["x"], dn["y"]) for dn in detour_utm]
        msp.add_lwpolyline(detour_pts, close=False, dxfattribs={"layer": "DETOUR_TAPER", "color": 1})
        for i, dn in enumerate(detour_utm):
            msp.add_circle((dn["x"], dn["y"]), radius=0.6, dxfattribs={"layer": "DETOUR_TAPER", "color": 1})
            t = msp.add_text(f"T{i + 1}", dxfattribs={"layer": "DETOUR_TAPER", "height": 0.9, "color": 1})
            t.set_placement((dn["x"] + 0.8, dn["y"] + 0.8))

    # ── 3. NJB_BARRIER_LINE (Continuous Concrete Barrier Wall / Sign Range) ──
    barrier_utm: List[Dict[str, float]] = []
    if barrier_nodes and len(barrier_nodes) >= 2:
        for bn in barrier_nodes:
            if "lat" in bn and "lng" in bn:
                u = _gps_to_utm37n(float(bn["lat"]), float(bn["lng"]), center_lat, center_lng)
                barrier_utm.append(u)
                all_x.append(u["x"])
                all_y.append(u["y"])
            elif "x" in bn and "y" in bn:
                x, y = float(bn["x"]), float(bn["y"])
                barrier_utm.append({"x": x, "y": y})
                all_x.append(x)
                all_y.append(y)

    if barrier_utm:
        barrier_pts = [(bn["x"], bn["y"]) for bn in barrier_utm]
        msp.add_lwpolyline(barrier_pts, close=False, dxfattribs={"layer": "NJB_BARRIER_LINE", "color": 4})

        # Calculate continuous length and unit count
        total_len = 0.0
        for i in range(len(barrier_pts) - 1):
            dx = barrier_pts[i + 1][0] - barrier_pts[i][0]
            dy = barrier_pts[i + 1][1] - barrier_pts[i][1]
            total_len += math.sqrt(dx * dx + dy * dy)

        unit_len = 2.0 if barrier_type == "concrete_njb" else 1.0
        unit_count = max(1, round(total_len / unit_len))
        b_label = "CONCRETE NJB BARRIER" if barrier_type == "concrete_njb" else "PLASTIC WATER BARRIER"

        for i, bn in enumerate(barrier_utm):
            msp.add_circle((bn["x"], bn["y"]), radius=0.5, dxfattribs={"layer": "NJB_BARRIER_LINE", "color": 4})
            t = msp.add_text(f"B{i + 1}", dxfattribs={"layer": "NJB_BARRIER_LINE", "height": 0.8, "color": 4})
            t.set_placement((bn["x"] + 0.6, bn["y"] + 0.6))

        mid_idx = len(barrier_utm) // 2
        mid_pt = barrier_utm[mid_idx]
        callout = msp.add_text(
            f"[{b_label} WALL - L={total_len:.1f}m ({unit_count} PCS)]",
            dxfattribs={"layer": "NJB_BARRIER_LINE", "height": 1.1, "color": 4}
        )
        callout.set_placement((mid_pt["x"] + 1.2, mid_pt["y"] + 1.2))

    # ── 4. PEDESTRIAN_PATH (Green / Optional) ──
    ped_utm: List[Dict[str, float]] = []
    if pedestrian_nodes and len(pedestrian_nodes) >= 2:
        for pn in pedestrian_nodes:
            if "lat" in pn and "lng" in pn:
                u = _gps_to_utm37n(float(pn["lat"]), float(pn["lng"]), center_lat, center_lng)
                ped_utm.append(u)
                all_x.append(u["x"])
                all_y.append(u["y"])
            elif "x" in pn and "y" in pn:
                x, y = float(pn["x"]), float(pn["y"])
                ped_utm.append({"x": x, "y": y})
                all_x.append(x)
                all_y.append(y)

    if ped_utm:
        ped_pts = [(pn["x"], pn["y"]) for pn in ped_utm]
        msp.add_lwpolyline(ped_pts, close=False, dxfattribs={"layer": "PEDESTRIAN_PATH", "color": 3})
        for i, pn in enumerate(ped_utm):
            msp.add_circle((pn["x"], pn["y"]), radius=0.5, dxfattribs={"layer": "PEDESTRIAN_PATH", "color": 3})
            t = msp.add_text(f"P{i + 1}", dxfattribs={"layer": "PEDESTRIAN_PATH", "height": 0.8, "color": 3})
            t.set_placement((pn["x"] + 0.6, pn["y"] + 0.6))

    # ── 5. Placed Traffic Signs & Barriers (Spot signs) ──
    if placed_elements:
        for el in placed_elements:
            el_lat = el.get("lat")
            el_lng = el.get("lng")
            if el_lat is not None and el_lng is not None:
                ep = _gps_to_utm37n(float(el_lat), float(el_lng), center_lat, center_lng)
            else:
                ep = {"x": ox, "y": oy}

            all_x.append(ep["x"])
            all_y.append(ep["y"])

            el_type = el.get("type", "traffic_element")
            rot = el.get("rotation", 0)
            msp.add_circle((ep["x"], ep["y"]), radius=0.8, dxfattribs={"layer": "TRAFFIC_SIGNS_AND_BARRIERS", "color": 4})
            t = msp.add_text(f"[{el_type.upper()}]", dxfattribs={"layer": "TRAFFIC_SIGNS_AND_BARRIERS", "height": 1.0, "rotation": float(rot), "color": 4})
            t.set_placement((ep["x"] + 0.8, ep["y"] + 0.8))

    # ── 5b. Custom Text Labels (Annotations, Notes, Stationing) ──
    if labels:
        for lbl in labels:
            lbl_text = lbl.get("text") or lbl.get("label") or ""
            if not lbl_text:
                continue
            lbl_lat = lbl.get("lat")
            lbl_lng = lbl.get("lng")
            if lbl_lat is not None and lbl_lng is not None:
                lp = _gps_to_utm37n(float(lbl_lat), float(lbl_lng), center_lat, center_lng)
            elif "x" in lbl and "y" in lbl:
                lp = {"x": float(lbl["x"]), "y": float(lbl["y"])}
            else:
                continue

            all_x.append(lp["x"])
            all_y.append(lp["y"])

            # Node anchor circle
            msp.add_circle((lp["x"], lp["y"]), radius=0.4, dxfattribs={"layer": "ANNOTATIONS_AND_LABELS", "color": 4})
            # AutoCAD TEXT entity
            t = msp.add_text(str(lbl_text), dxfattribs={"layer": "ANNOTATIONS_AND_LABELS", "height": 1.2, "color": 4})
            t.set_placement((lp["x"] + 0.6, lp["y"] + 0.6))

    # Fallback to origin if no elements
    if not all_x:
        all_x = [ox]
        all_y = [oy]

    # Calculate tight bounding box for the project
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    span_w = max(10.0, max_x - min_x)
    span_h = max(10.0, max_y - min_y)
    view_height = max(30.0, span_h * 1.5, span_w * 1.1)

    # ── 6. PLATFORM_DIGITAL_WATERMARK (Offset below the bounding box) ──
    if is_watermarked:
        wx = min_x - 10.0
        wy = min_y - 28.0
        box_w = max(90.0, span_w + 20.0)
        box_pts = [(wx, wy), (wx + box_w, wy), (wx + box_w, wy + 20.0), (wx, wy + 20.0)]
        msp.add_lwpolyline(box_pts, close=True, dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "color": 6})

        t1 = msp.add_text("AMANAH AL-MADINAH AL-MUNAWWARAH — TAHCOM DIGITAL CAD CERTIFICATION", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.6, "color": 6})
        t1.set_placement((wx + 2.0, wy + 15.5))

        t2 = msp.add_text(f"PROJECT: {project_name[:40]}  |  ENGINEER: {editor_user[:28]}", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.2, "color": 6})
        t2.set_placement((wx + 2.0, wy + 11.0))

        t3 = msp.add_text(f"TIMESTAMP: {now_iso}  |  DIGITAL SIGNATURE: {sig_hash}", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.1, "color": 6})
        t3.set_placement((wx + 2.0, wy + 6.5))

        all_y.append(wy)

    # ── 7. Configure AutoCAD Initial Zoom & Viewport (Opens Centered on Drawing at 100% Zoom) ──
    final_min_x, final_max_x = min(all_x), max(all_x)
    final_min_y, final_max_y = min(all_y), max(all_y)
    final_cx = (final_min_x + final_max_x) / 2.0
    final_cy = (final_min_y + final_max_y) / 2.0
    final_h = max(35.0, (final_max_y - final_min_y) * 1.4, (final_max_x - final_min_x) * 1.1)

    doc.set_modelspace_vport(height=final_h, center=(final_cx, final_cy))
    doc.header["$EXTMIN"] = (final_min_x - 15.0, final_min_y - 15.0, 0.0)
    doc.header["$EXTMAX"] = (final_max_x + 15.0, final_max_y + 15.0, 0.0)
    doc.header["$LIMMIN"] = (final_min_x - 30.0, final_min_y - 30.0)
    doc.header["$LIMMAX"] = (final_max_x + 30.0, final_max_y + 30.0)
    doc.header["$LIMCHECK"] = 0

    out = io.StringIO()
    doc.write(out)
    return out.getvalue()


def build_watermarked_dxf_from_features(
    geojson: Dict[str, Any],
    placed_elements: Optional[List[Dict[str, Any]]] = None,
    labels: Optional[List[Dict[str, Any]]] = None,
    project_name: str = "Amanah Madinah Detour Blueprint",
    lat: float = 24.4686,
    lng: float = 39.6120,
    editor_user: str = "Authorized Safety Engineer"
) -> str:
    """
    Generate certified AutoCAD DXF from GeoJSON features with auto-centering Viewport.
    """
    center_lat = float(lat) if lat is not None else 24.4686
    center_lng = float(lng) if lng is not None else 39.6120
    origin_utm = _gps_to_utm37n(center_lat, center_lng, center_lat, center_lng)
    ox, oy = origin_utm["x"], origin_utm["y"]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    sig_hash = _generate_digital_signature(project_name, now_iso)

    doc = ezdxf.new("R2018", setup=True)
    doc.header["$INSUNITS"] = 6
    doc.header["$PROJECTNAME"] = project_name[:64]
    msp = doc.modelspace()

    # MOT Standard Layers
    doc.layers.add("WORK_ZONE_BOUNDARY", color=2)
    doc.layers.add("DETOUR_TAPER", color=1)
    doc.layers.add("DETOUR_ROUTE", color=1)
    doc.layers.add("NJB_BARRIER_LINE", color=4)
    doc.layers.add("PEDESTRIAN_PATH", color=3)
    doc.layers.add("PEDESTRIAN_ROUTE", color=3)
    doc.layers.add("ROAD_BOUNDARY", color=4)
    doc.layers.add("CENTERLINE_AXIS", color=7)
    doc.layers.add("TRAFFIC_SIGNS_AND_BARRIERS", color=4)
    doc.layers.add("ANNOTATIONS_AND_LABELS", color=4)
    doc.layers.add("PLATFORM_DIGITAL_WATERMARK", color=6)

    all_x: List[float] = []
    all_y: List[float] = []

    features = geojson.get("features", []) if isinstance(geojson, dict) else []
    for feat in features:
        props = feat.get("properties", {}) or {}
        layer_name = props.get("layer", "WORK_ZONE_BOUNDARY").upper()
        if layer_name not in doc.layers:
            doc.layers.add(layer_name, color=2)

        geom = feat.get("geometry", {}) or {}
        gtype = geom.get("type", "")
        coords = geom.get("coordinates", [])

        if gtype == "Polygon" and coords:
            ring = coords[0]
            utm_ring = []
            for pt in ring:
                if len(pt) >= 2:
                    u = _gps_to_utm37n(float(pt[1]), float(pt[0]), center_lat, center_lng)
                    utm_ring.append((u["x"], u["y"]))
                    all_x.append(u["x"])
                    all_y.append(u["y"])
            if len(utm_ring) >= 3:
                msp.add_lwpolyline(utm_ring, close=True, dxfattribs={"layer": layer_name})

        elif gtype in ["LineString", "MultiPoint"] and coords:
            utm_line = []
            for pt in coords:
                if len(pt) >= 2:
                    u = _gps_to_utm37n(float(pt[1]), float(pt[0]), center_lat, center_lng)
                    utm_line.append((u["x"], u["y"]))
                    all_x.append(u["x"])
                    all_y.append(u["y"])
            if len(utm_line) >= 2:
                msp.add_lwpolyline(utm_line, close=False, dxfattribs={"layer": layer_name})

        elif gtype == "Point" and coords:
            u = _gps_to_utm37n(float(coords[1]), float(coords[0]), center_lat, center_lng)
            all_x.append(u["x"])
            all_y.append(u["y"])
            txt = props.get("text", "") or props.get("label", "")
            if txt:
                msp.add_circle((u["x"], u["y"]), radius=0.4, dxfattribs={"layer": layer_name})
                t = msp.add_text(str(txt), dxfattribs={"layer": layer_name, "height": 1.2})
                t.set_placement((u["x"] + 0.6, u["y"] + 0.6))
            else:
                msp.add_circle((u["x"], u["y"]), radius=0.8, dxfattribs={"layer": layer_name})

    # Placed MOT Signs
    if placed_elements:
        for el in placed_elements:
            el_lat = el.get("lat")
            el_lng = el.get("lng")
            if el_lat is not None and el_lng is not None:
                ep = _gps_to_utm37n(float(el_lat), float(el_lng), center_lat, center_lng)
            else:
                ep = {"x": ox, "y": oy}

            all_x.append(ep["x"])
            all_y.append(ep["y"])

            el_type = el.get("type", "sign")
            rot = el.get("rotation", 0)
            msp.add_circle((ep["x"], ep["y"]), radius=0.8, dxfattribs={"layer": "TRAFFIC_SIGNS_AND_BARRIERS", "color": 4})
            t = msp.add_text(f"[{el_type.upper()}]", dxfattribs={"layer": "TRAFFIC_SIGNS_AND_BARRIERS", "height": 1.0, "rotation": float(rot), "color": 4})
            t.set_placement((ep["x"] + 0.8, ep["y"] + 0.8))

    # Explicit Custom Text Labels (if passed directly)
    if labels:
        for lbl in labels:
            lbl_text = lbl.get("text") or lbl.get("label") or ""
            if not lbl_text:
                continue
            lbl_lat = lbl.get("lat")
            lbl_lng = lbl.get("lng")
            if lbl_lat is not None and lbl_lng is not None:
                lp = _gps_to_utm37n(float(lbl_lat), float(lbl_lng), center_lat, center_lng)
            elif "x" in lbl and "y" in lbl:
                lp = {"x": float(lbl["x"]), "y": float(lbl["y"])}
            else:
                continue

            all_x.append(lp["x"])
            all_y.append(lp["y"])

            msp.add_circle((lp["x"], lp["y"]), radius=0.4, dxfattribs={"layer": "ANNOTATIONS_AND_LABELS", "color": 4})
            t = msp.add_text(str(lbl_text), dxfattribs={"layer": "ANNOTATIONS_AND_LABELS", "height": 1.2, "color": 4})
            t.set_placement((lp["x"] + 0.6, lp["y"] + 0.6))

    if not all_x:
        all_x = [ox]
        all_y = [oy]

    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)

    # Watermark box
    wx = min_x - 10.0
    wy = min_y - 28.0
    box_w = max(90.0, (max_x - min_x) + 20.0)
    box_pts = [(wx, wy), (wx + box_w, wy), (wx + box_w, wy + 20.0), (wx, wy + 20.0)]
    msp.add_lwpolyline(box_pts, close=True, dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "color": 6})

    t1 = msp.add_text("AMANAH AL-MADINAH AL-MUNAWWARAH — TAHCOM DIGITAL CAD CERTIFICATION", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.6, "color": 6})
    t1.set_placement((wx + 2.0, wy + 15.5))

    t2 = msp.add_text(f"PROJECT: {project_name[:40]}  |  ENGINEER: {editor_user[:28]}", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.2, "color": 6})
    t2.set_placement((wx + 2.0, wy + 11.0))

    t3 = msp.add_text(f"TIMESTAMP: {now_iso}  |  DIGITAL SIGNATURE: {sig_hash}", dxfattribs={"layer": "PLATFORM_DIGITAL_WATERMARK", "height": 1.1, "color": 6})
    t3.set_placement((wx + 2.0, wy + 6.5))

    all_y.append(wy)

    final_min_x, final_max_x = min(all_x), max(all_x)
    final_min_y, final_max_y = min(all_y), max(all_y)
    final_cx = (final_min_x + final_max_x) / 2.0
    final_cy = (final_min_y + final_max_y) / 2.0
    final_h = max(35.0, (final_max_y - final_min_y) * 1.4, (final_max_x - final_min_x) * 1.1)

    doc.set_modelspace_vport(height=final_h, center=(final_cx, final_cy))
    doc.header["$EXTMIN"] = (final_min_x - 15.0, final_min_y - 15.0, 0.0)
    doc.header["$EXTMAX"] = (final_max_x + 15.0, final_max_y + 15.0, 0.0)
    doc.header["$LIMMIN"] = (final_min_x - 30.0, final_min_y - 30.0)
    doc.header["$LIMMAX"] = (final_max_x + 30.0, final_max_y + 30.0)
    doc.header["$LIMCHECK"] = 0

    out = io.StringIO()
    doc.write(out)
    return out.getvalue()


def build_dxf_content(
    boundary_points: List[Dict[str, Any]],
    detour_nodes: Optional[List[Dict[str, Any]]] = None,
    pedestrian_nodes: Optional[List[Dict[str, Any]]] = None,
    barrier_nodes: Optional[List[Dict[str, Any]]] = None,
    barrier_type: str = "concrete_njb",
    placed_elements: Optional[List[Dict[str, Any]]] = None,
    project_name: str = "Detour Work Site",
    lat: float = 24.4686,
    lng: float = 39.6120,
    editor_user: str = "Amanah Certified Safety Engineer",
    is_watermarked: bool = True
) -> str:
    """Legacy alias for build_6node_dxf."""
    return build_6node_dxf(
        nodes=boundary_points,
        boundary_points=boundary_points,
        detour_nodes=detour_nodes,
        pedestrian_nodes=pedestrian_nodes,
        barrier_nodes=barrier_nodes,
        barrier_type=barrier_type,
        placed_elements=placed_elements,
        project_name=project_name,
        lat=lat,
        lng=lng,
        editor_user=editor_user,
        is_watermarked=is_watermarked
    )
