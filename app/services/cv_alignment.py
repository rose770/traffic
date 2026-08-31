"""
Production-grade Computer Vision and Geospatial Registration Engine for CAD-to-Map Alignment.

Features:
- Multi-hypothesis cross-modal feature matching (Direct, Inverted Polarities, Edge Gradients)
- Multi-scale SIFT & ORB with Adaptive Canny edge extraction and Bilateral filtering
- Robust Euclidean/Similarity rigid model estimation via RANSAC
- Sub-pixel metric-to-GPS coordinate transformation
- Vector-to-Vector point set registration (Iterative Closest Point with KDTree)
"""

import base64
import math
import logging
from typing import Dict, Any, Tuple, Optional, List
import cv2
import numpy as np
from scipy.spatial import KDTree

logger = logging.getLogger("cv_alignment")
logger.setLevel(logging.INFO)


# ----------------------------------------------------------------------
# 1. Base64 & Image Preprocessing Helpers
# ----------------------------------------------------------------------
def decode_base64_image(image_b64: str) -> np.ndarray:
    """Decodes a base64 or DataURL string into an OpenCV BGR/BGRA numpy array."""
    if not image_b64 or not isinstance(image_b64, str):
        raise ValueError("Invalid image input: base64 string is empty or not a string")

    # Strip DataURL prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    # Clean whitespace and newlines
    image_b64 = image_b64.strip()
    image_bytes = base64.b64decode(image_b64)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)

    if img is None:
        raise ValueError("Failed to decode image from base64 buffer")
    return img


def preprocess_cross_modal_image(
    img: np.ndarray,
    is_cad: bool = False,
    target_size: Optional[Tuple[int, int]] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Preprocesses images to bridge the domain disparity between vector CAD and satellite optical rasters.
    Returns:
        gray_img: 8-bit normalized grayscale image.
        edge_img: 8-bit structural edge map highlighting road corridors and boundaries.
    """
    # 1. Handle Alpha Transparency
    if len(img.shape) == 3 and img.shape[2] == 4:
        # Alpha compositing on white background
        b, g, r, a = cv2.split(img)
        alpha = a.astype(float) / 255.0
        white_bg = np.ones_like(b, dtype=np.uint8) * 255
        b_comp = (b.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        g_comp = (g.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        r_comp = (r.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        bgr = cv2.merge([b_comp, g_comp, r_comp])
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    elif len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # 2. Resize if target_size provided
    if target_size is not None and (gray.shape[1] != target_size[0] or gray.shape[0] != target_size[1]):
        gray = cv2.resize(gray, target_size, interpolation=cv2.INTER_AREA)

    # 3. Domain-specific filtering & enhancement
    if is_cad:
        # Bilateral filter to smooth antialiasing while preserving razor-sharp vector lines
        filtered = cv2.bilateralFilter(gray, d=5, sigmaColor=50, sigmaSpace=50)

        # Compute adaptive Canny edges
        v = np.median(filtered)
        lower = int(max(0, (1.0 - 0.33) * v))
        upper = int(min(255, (1.0 + 0.33) * v))
        edges = cv2.Canny(filtered, lower, upper)
    else:
        # For Satellite Imagery: Contrast-Limited Adaptive Histogram Equalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Bilateral filter to suppress asphalt grain and tree textures while preserving road curbs
        filtered = cv2.bilateralFilter(enhanced, d=7, sigmaColor=75, sigmaSpace=75)

        # Adaptive Canny
        v = np.median(filtered)
        lower = int(max(20, (1.0 - 0.4) * v))
        upper = int(min(240, (1.0 + 0.4) * v))
        edges = cv2.Canny(filtered, lower, upper)

        # Morphological dilation to bridge small road line gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

    return gray, edges


# ----------------------------------------------------------------------
# 2. SIFT & Multi-Scale Feature Matching Engine
# ----------------------------------------------------------------------
def _match_descriptor_pair(
    des_src: np.ndarray,
    des_dst: np.ndarray,
    kp_src: List[Any],
    kp_dst: List[Any],
    is_binary: bool,
    ratio_threshold: float = 0.75
) -> Tuple[np.ndarray, np.ndarray, int, float]:
    """Matches a single descriptor pair and filters with Lowe's ratio test."""
    if des_src is None or des_dst is None or len(kp_src) < 4 or len(kp_dst) < 4:
        return np.empty((0, 2)), np.empty((0, 2)), 0, 0.0

    if is_binary:
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        knn_matches = matcher.knnMatch(des_src, des_dst, k=2)
    else:
        index_params = dict(algorithm=1, trees=5)  # FLANN_INDEX_KDTREE
        search_params = dict(checks=64)
        matcher = cv2.FlannBasedMatcher(index_params, search_params)
        knn_matches = matcher.knnMatch(des_src, des_dst, k=2)

    good_matches = []
    ratio_sum = 0.0
    for match_pair in knn_matches:
        if len(match_pair) == 2:
            m, n = match_pair
            if m.distance < ratio_threshold * n.distance:
                good_matches.append(m)
                ratio_sum += (m.distance / (n.distance + 1e-7))

    if not good_matches:
        return np.empty((0, 2)), np.empty((0, 2)), 0, 0.0

    src_pts = np.float32([kp_src[m.queryIdx].pt for m in good_matches])
    dst_pts = np.float32([kp_dst[m.trainIdx].pt for m in good_matches])
    avg_quality = 1.0 - (ratio_sum / len(good_matches))

    return src_pts, dst_pts, len(good_matches), max(0.0, min(1.0, avg_quality))


def extract_and_match_features(
    img_cad: np.ndarray,
    img_map: np.ndarray,
    ratio_threshold: float = 0.75
) -> Tuple[np.ndarray, np.ndarray, int, float]:
    """
    Multi-hypothesis feature matching: Evaluates direct matching, inverted contrast polarity
    (handling white paper vs. dark satellite road disparity), and structural edge matching.
    Selects the hypothesis that produces the highest quality geometric correspondence.
    """
    sift = cv2.SIFT_create(
        nfeatures=4000,
        nOctaveLayers=4,
        contrastThreshold=0.02,
        edgeThreshold=12,
        sigma=1.6
    )

    # Hypothesis 1: Direct grayscale matching
    kp_cad, des_cad = sift.detectAndCompute(img_cad, None)
    kp_map, des_map = sift.detectAndCompute(img_map, None)
    src_pts, dst_pts, count, quality = _match_descriptor_pair(des_cad, des_map, kp_cad, kp_map, is_binary=False, ratio_threshold=ratio_threshold)

    best_src, best_dst, best_count, best_quality = src_pts, dst_pts, count, quality

    # Hypothesis 2: Inverted CAD polarity (paper plot black-on-white vs satellite white-on-dark)
    img_cad_inv = cv2.bitwise_not(img_cad)
    kp_cad_inv, des_cad_inv = sift.detectAndCompute(img_cad_inv, None)
    src_inv, dst_inv, count_inv, quality_inv = _match_descriptor_pair(des_cad_inv, des_map, kp_cad_inv, kp_map, is_binary=False, ratio_threshold=ratio_threshold)

    if count_inv > best_count:
        best_src, best_dst, best_count, best_quality = src_inv, dst_inv, count_inv, quality_inv

    # Hypothesis 3: Structural edge matching if features are still sparse (< 10 matches)
    if best_count < 10:
        cad_edges = cv2.Canny(img_cad, 50, 150)
        map_edges = cv2.Canny(img_map, 50, 150)
        kp_e_cad, des_e_cad = sift.detectAndCompute(cad_edges, None)
        kp_e_map, des_e_map = sift.detectAndCompute(map_edges, None)
        src_e, dst_e, count_e, quality_e = _match_descriptor_pair(des_e_cad, des_e_map, kp_e_cad, kp_e_map, is_binary=False, ratio_threshold=ratio_threshold)
        if count_e > best_count:
            best_src, best_dst, best_count, best_quality = src_e, dst_e, count_e, quality_e

    # Hypothesis 4: ORB fast detector fallback if SIFT found no matches
    if best_count < 4:
        orb = cv2.ORB_create(nfeatures=5000, fastThreshold=5, scaleFactor=1.2)
        kp_o_cad, des_o_cad = orb.detectAndCompute(img_cad, None)
        kp_o_map, des_o_map = orb.detectAndCompute(img_map, None)
        src_o, dst_o, count_o, quality_o = _match_descriptor_pair(des_o_cad, des_o_map, kp_o_cad, kp_o_map, is_binary=True, ratio_threshold=0.85)
        if count_o > best_count:
            best_src, best_dst, best_count, best_quality = src_o, dst_o, count_o, quality_o

    return best_src, best_dst, best_count, best_quality


# ----------------------------------------------------------------------
# 3. Geometric Transformation & GPS Metric Projection
# ----------------------------------------------------------------------
def compute_rigid_transform_and_gps(
    src_pts: np.ndarray,
    dst_pts: np.ndarray,
    meters_per_pixel: float = 0.5,
    origin_lat: float = 24.4686,
    img_center: Optional[Tuple[float, float]] = None
) -> Dict[str, Any]:
    """
    Estimates 2D Partial Affine / Similarity Transformation (Rotation, Scale, Translation)
    using RANSAC and projects pixel translation into metric geographic coordinates (dLat, dLng).
    """
    if len(src_pts) < 4:
        return {
            "success": False,
            "dLat": 0.0,
            "dLng": 0.0,
            "rotationDeg": 0.0,
            "scale": 1.0,
            "inliers": 0,
            "confidence": 0.0,
            "error": "Insufficient feature matches (< 4 points)"
        }

    # Estimate 2D Euclidean / Similarity Affine Transform:
    # [u, v]^T = s * R * [x, y]^T + [tx, ty]^T
    M, inlier_mask = cv2.estimateAffinePartial2D(
        src_pts,
        dst_pts,
        method=cv2.RANSAC,
        ransacReprojThreshold=5.0,
        maxIters=3000,
        confidence=0.99
    )

    if M is None or inlier_mask is None:
        return {
            "success": False,
            "dLat": 0.0,
            "dLng": 0.0,
            "rotationDeg": 0.0,
            "scale": 1.0,
            "inliers": 0,
            "confidence": 0.0,
            "error": "RANSAC failed to fit rigid transformation model"
        }

    inliers_count = int(np.sum(inlier_mask))
    total_pts = len(src_pts)
    inlier_ratio = inliers_count / float(total_pts) if total_pts > 0 else 0.0

    # Decompose Affine Partial 2D Matrix M = [[a, b, tx], [-b, a, ty]] in image space
    a = float(M[0, 0])
    b = float(M[1, 0])

    scale = math.sqrt(a * a + b * b)
    # In OpenCV y-down coordinate space, positive angle in getRotationMatrix2D produces -b at M[1,0]
    # We recover the true Cartesian / bearing rotation angle:
    rotation_deg = -math.degrees(math.atan2(b, a))
    rotation_deg = (rotation_deg + 180.0) % 360.0 - 180.0

    # Center-relative translation adjustment:
    if img_center is not None:
        cx, cy = img_center
        # Transformed center position: M * [cx, cy, 1]^T
        center_homo = np.array([cx, cy, 1.0], dtype=float)
        new_center = np.dot(M, center_homo)
        dx_pixel = float(new_center[0] - cx)
        dy_pixel = float(new_center[1] - cy)
    else:
        dx_pixel = float(M[0, 2])
        dy_pixel = float(M[1, 2])

    # Convert pixel displacements to metric ground meters:
    # In image space: +x is East, +y is South (downward)
    dx_meters = dx_pixel * meters_per_pixel
    dy_meters = -dy_pixel * meters_per_pixel  # Invert y so +dy is North

    # Convert metric ground meters to Geographic GPS WGS84 offsets (dLat, dLng):
    lat_rad = math.radians(origin_lat)
    meters_per_deg_lat = 110574.61
    meters_per_deg_lng = 111320.0 * max(0.01, math.cos(lat_rad))

    d_lat = dy_meters / meters_per_deg_lat
    d_lng = dx_meters / meters_per_deg_lng

    # Multi-factor confidence score:
    count_factor = min(1.0, inliers_count / 20.0)
    scale_penalty = max(0.2, 1.0 - abs(scale - 1.0) * 1.5) if (0.5 <= scale <= 2.0) else 0.1
    confidence = float(count_factor * inlier_ratio * scale_penalty)

    return {
        "success": True,
        "dLat": round(d_lat, 8),
        "dLng": round(d_lng, 8),
        "rotationDeg": round(rotation_deg, 4),
        "scale": round(scale, 4),
        "dx_meters": round(dx_meters, 3),
        "dy_meters": round(dy_meters, 3),
        "inliers": inliers_count,
        "totalMatches": total_pts,
        "confidence": round(confidence, 4),
        "method": "cv_sift_ransac"
    }


# ----------------------------------------------------------------------
# 4. Primary Public API: align_cad_to_map_cv
# ----------------------------------------------------------------------
def align_cad_to_map_cv(
    cad_b64: str,
    map_b64: str,
    meters_per_pixel: float = 0.5,
    origin_lat: float = 24.4686
) -> Dict[str, Any]:
    """
    Registers a CAD blueprint image against satellite map imagery using Computer Vision.

    Args:
        cad_b64: Base64 string of CAD blueprint (with or without data URI prefix).
        map_b64: Base64 string of Satellite map.
        meters_per_pixel: Ground resolution in meters/pixel (default 0.5m/px ~ zoom 18).
        origin_lat: Geographic latitude for accurate WGS84 meter-to-degree projection.

    Returns:
        Dict with keys: success, dLat, dLng, rotationDeg, scale, inliers, confidence, method.
    """
    try:
        cad_img = decode_base64_image(cad_b64)
        map_img = decode_base64_image(map_b64)

        # Ensure image has sufficient dimensions for spatial feature matching
        if cad_img.shape[0] < 8 or cad_img.shape[1] < 8 or map_img.shape[0] < 8 or map_img.shape[1] < 8:
            return {
                "success": False,
                "dLat": 0.0,
                "dLng": 0.0,
                "rotationDeg": 0.0,
                "scale": 1.0,
                "inliers": 0,
                "confidence": 0.0,
                "error": "Image dimensions too small for spatial registration (< 8x8)",
                "method": "cv_degenerate_size"
            }

        # Standardize matching resolution
        h_map, w_map = map_img.shape[:2]
        cad_gray, _ = preprocess_cross_modal_image(cad_img, is_cad=True, target_size=(w_map, h_map))
        map_gray, _ = preprocess_cross_modal_image(map_img, is_cad=False)

        # Extract & match SIFT features with multi-hypothesis handling
        src_pts, dst_pts, total_matches, quality = extract_and_match_features(cad_gray, map_gray)

        img_center = (w_map / 2.0, h_map / 2.0)
        result = compute_rigid_transform_and_gps(
            src_pts=src_pts,
            dst_pts=dst_pts,
            meters_per_pixel=meters_per_pixel,
            origin_lat=origin_lat,
            img_center=img_center
        )

        logger.info(
            f"[CV Alignment] Matches: {total_matches}, Inliers: {result.get('inliers', 0)}, "
            f"Confidence: {result.get('confidence', 0):.2f}, "
            f"Offset: ({result.get('dLat', 0):.6f}, {result.get('dLng', 0):.6f}), "
            f"Rot: {result.get('rotationDeg', 0):.2f}°"
        )
        return result

    except Exception as ex:
        logger.warning(f"[CV Alignment] Registration failed: {ex}")
        return {
            "success": False,
            "dLat": 0.0,
            "dLng": 0.0,
            "rotationDeg": 0.0,
            "scale": 1.0,
            "inliers": 0,
            "confidence": 0.0,
            "error": str(ex),
            "method": "cv_error"
        }


# ----------------------------------------------------------------------
# 5. Vector-Based Road Alignment & Iterative Closest Point (ICP)
# ----------------------------------------------------------------------
def sample_points_along_linestring(coords: List[List[float]], step_distance: float = 2.0) -> List[Tuple[float, float]]:
    """Samples equidistant 2D points along a polyline / linestring."""
    sampled: List[Tuple[float, float]] = []
    if not coords or len(coords) < 2:
        return sampled

    for i in range(len(coords) - 1):
        p1 = np.array(coords[i], dtype=float)
        p2 = np.array(coords[i + 1], dtype=float)
        seg_vec = p2 - p1
        seg_len = float(np.linalg.norm(seg_vec))

        if seg_len < 1e-6:
            sampled.append((float(p1[0]), float(p1[1])))
            continue

        num_steps = max(1, int(math.ceil(seg_len / step_distance)))
        for s in range(num_steps):
            t = s / float(num_steps)
            pt = p1 + t * seg_vec
            sampled.append((float(pt[0]), float(pt[1])))

    # Append end point
    sampled.append((float(coords[-1][0]), float(coords[-1][1])))
    return sampled


def sample_cad_vector_points(geojson_data: Dict[str, Any], target_layers: Optional[List[str]] = None) -> np.ndarray:
    """Extracts and samples 2D spatial points from CAD GeoJSON features (e.g. CENTERLINE_AXIS, ROAD_BOUNDARY)."""
    features = geojson_data.get("features", [])
    sampled_pts: List[Tuple[float, float]] = []

    for f in features:
        props = f.get("properties", {})
        layer = str(props.get("layer", "")).upper()
        group = str(props.get("group", "")).upper()

        if target_layers:
            if not any(t.upper() in layer or t.upper() in group for t in target_layers):
                continue

        geom = f.get("geometry", {})
        gtype = geom.get("type", "")
        coords = geom.get("coordinates", [])

        if gtype == "LineString":
            sampled_pts.extend(sample_points_along_linestring(coords))
        elif gtype == "MultiLineString" or gtype == "Polygon":
            for line in coords:
                sampled_pts.extend(sample_points_along_linestring(line))

    if not sampled_pts:
        return np.empty((0, 2), dtype=float)
    return np.array(sampled_pts, dtype=float)


def align_vectors_icp(
    source_points: np.ndarray,
    target_points: np.ndarray,
    max_iterations: int = 50,
    tolerance: float = 1e-5,
    rejection_distance: float = 25.0
) -> Dict[str, Any]:
    """
    Performs rigid 2D Iterative Closest Point (ICP) point-set registration using KDTree.

    Args:
        source_points: (N, 2) CAD road vector points to be aligned.
        target_points: (M, 2) Target satellite / map road points.
        max_iterations: Maximum ICP iterations.
        tolerance: Convergence threshold on delta RMSE.
        rejection_distance: Maximum point-to-point correspondence distance threshold.

    Returns:
        Dict containing: success, R (2x2 rotation), t (2D translation), rotationDeg, rmse, iterations.
    """
    if len(source_points) < 4 or len(target_points) < 4:
        return {
            "success": False,
            "rotationDeg": 0.0,
            "tx": 0.0,
            "ty": 0.0,
            "rmse": 999.0,
            "iterations": 0,
            "error": "Insufficient points for ICP (< 4 points)"
        }

    src = source_points.copy()
    kdtree = KDTree(target_points)

    total_R = np.eye(2)
    total_t = np.zeros(2)
    prev_error = float("inf")

    for it in range(max_iterations):
        # 1. Find nearest neighbors in target set
        distances, indices = kdtree.query(src)

        # 2. Filter outliers beyond rejection distance
        valid_mask = distances <= rejection_distance
        if np.sum(valid_mask) < 4:
            break

        pts_src = src[valid_mask]
        pts_tgt = target_points[indices[valid_mask]]

        # 3. Compute centroids
        centroid_src = np.mean(pts_src, axis=0)
        centroid_tgt = np.mean(pts_tgt, axis=0)

        # 4. Center the point clouds
        src_centered = pts_src - centroid_src
        tgt_centered = pts_tgt - centroid_tgt

        # 5. SVD of cross-covariance matrix H
        H = np.dot(src_centered.T, tgt_centered)
        U, S, Vt = np.linalg.svd(H)
        R_step = np.dot(Vt.T, U.T)

        # Ensure right-handed coordinate system (no reflection)
        if np.linalg.det(R_step) < 0:
            Vt[-1, :] *= -1
            R_step = np.dot(Vt.T, U.T)

        t_step = centroid_tgt - np.dot(R_step, centroid_src)

        # 6. Apply incremental transformation
        src = np.dot(src, R_step.T) + t_step
        total_R = np.dot(R_step, total_R)
        total_t = np.dot(R_step, total_t) + t_step

        # 7. Check convergence
        current_error = float(np.mean(distances[valid_mask]))
        if abs(prev_error - current_error) < tolerance:
            break
        prev_error = current_error

    # Extract final rotation angle
    rot_deg = math.degrees(math.atan2(total_R[1, 0], total_R[0, 0]))
    rot_deg = (rot_deg + 180.0) % 360.0 - 180.0

    return {
        "success": True,
        "rotationDeg": round(rot_deg, 4),
        "tx": round(float(total_t[0]), 4),
        "ty": round(float(total_t[1]), 4),
        "rmse": round(float(prev_error), 4),
        "iterations": it + 1,
        "method": "icp_kdtree"
    }
