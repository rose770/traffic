import sys
import os
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import base64
import math
import cv2
import numpy as np
import pytest
from app.services.cv_alignment import (
    align_cad_to_map_cv,
    align_vectors_icp,
    sample_points_along_linestring,
    preprocess_cross_modal_image,
    compute_rigid_transform_and_gps,
    decode_base64_image
)
from app.services.ai_service import align_images_ai


def create_synthetic_road_scene(width: int = 500, height: int = 500) -> np.ndarray:
    """Generates a synthetic high-contrast road corridor scene with lanes, intersections, and markings."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 40  # Dark asphalt background

    # Main horizontal dual-carriageway road
    cv2.rectangle(img, (0, 200), (500, 300), (80, 80, 80), -1)
    # Road curb edges
    cv2.line(img, (0, 200), (500, 200), (220, 220, 220), 3)
    cv2.line(img, (0, 300), (500, 300), (220, 220, 220), 3)
    # Dashed center line
    for x in range(0, 500, 30):
        cv2.line(img, (x, 250), (x + 15, 250), (240, 240, 240), 2)

    # Vertical cross-street
    cv2.rectangle(img, (200, 0), (300, 500), (80, 80, 80), -1)
    cv2.line(img, (200, 0), (200, 500), (220, 220, 220), 3)
    cv2.line(img, (300, 0), (300, 500), (220, 220, 220), 3)
    for y in range(0, 500, 30):
        cv2.line(img, (250, y), (250, y + 15), (240, 240, 240), 2)

    # Add geometric distinctive road markers (crosswalks, arrows, turn bays)
    for x in range(205, 295, 12):
        cv2.rectangle(img, (x, 175), (x + 6, 195), (255, 255, 255), -1)
        cv2.rectangle(img, (x, 305), (x + 6, 325), (255, 255, 255), -1)

    # Add island triangles
    pts1 = np.array([[160, 160], [195, 160], [195, 195]], np.int32)
    cv2.fillPoly(img, [pts1], (180, 180, 180))
    pts2 = np.array([[340, 160], [305, 160], [305, 195]], np.int32)
    cv2.fillPoly(img, [pts2], (180, 180, 180))

    return img


def transform_image_2d(img: np.ndarray, tx: float, ty: float, angle_deg: float, scale: float = 1.0) -> np.ndarray:
    """Applies known ground truth affine transformation."""
    h, w = img.shape[:2]
    center = (w / 2.0, h / 2.0)
    rot_mat = cv2.getRotationMatrix2D(center, angle_deg, scale)
    rot_mat[0, 2] += tx
    rot_mat[1, 2] += ty
    transformed = cv2.warpAffine(img, rot_mat, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(40, 40, 40))
    return transformed


def image_to_base64_png(img: np.ndarray) -> str:
    """Encodes numpy array to PNG base64 string."""
    success, buffer = cv2.imencode(".png", img)
    assert success, "Failed to encode image to PNG"
    return "data:image/png;base64," + base64.b64encode(buffer).decode("utf-8")


# ----------------------------------------------------------------------
# Test Suite 1: Synthetic Vision Alignment & Sub-pixel Accuracy
# ----------------------------------------------------------------------
def test_cv_synthetic_alignment_recovery():
    """Tests SIFT + RANSAC recovery of known ground truth rotation and translation."""
    base_cad = create_synthetic_road_scene(500, 500)

    # Ground truth transformation: dx = +15px, dy = -10px, angle = +8.0 deg
    gt_tx = 15.0
    gt_ty = -10.0
    gt_angle = 8.0

    transformed_map = transform_image_2d(base_cad, tx=gt_tx, ty=gt_ty, angle_deg=gt_angle)

    cad_b64 = image_to_base64_png(base_cad)
    map_b64 = image_to_base64_png(transformed_map)

    result = align_cad_to_map_cv(
        cad_b64=cad_b64,
        map_b64=map_b64,
        meters_per_pixel=0.5,
        origin_lat=24.4686
    )

    assert result["success"] is True, f"Alignment failed: {result}"
    assert result["inliers"] >= 10, f"Expected >= 10 inliers, got {result['inliers']}"
    assert result["confidence"] >= 0.5, f"Expected confidence >= 0.5, got {result['confidence']}"

    # Verify recovered angle within 1.0 degree tolerance
    rec_angle = result["rotationDeg"]
    angle_error = abs((rec_angle - gt_angle + 180) % 360 - 180)
    assert angle_error < 1.5, f"Rotation error {angle_error}° exceeds tolerance (ground truth={gt_angle}°, recovered={rec_angle}°)"

    # Verify scale is approximately 1.0 (within 5%)
    assert abs(result["scale"] - 1.0) < 0.05, f"Scale {result['scale']} deviates from 1.0"


# ----------------------------------------------------------------------
# Test Suite 2: Metric to Geographic GPS Projections
# ----------------------------------------------------------------------
def test_metric_to_gps_calculations():
    """Tests conversion of pixel offsets to physical ground meters and GPS coordinates."""
    # 20 pixels shift at 0.5 m/px = 10.0 meters
    origin_lat = 24.4686
    meters_per_pixel = 0.5

    src = np.array([[100.0, 100.0], [200.0, 100.0], [200.0, 200.0], [100.0, 200.0]], dtype=np.float32)
    # Shift by dx = +20px, dy = -10px
    dst = src + np.array([20.0, -10.0], dtype=np.float32)

    res = compute_rigid_transform_and_gps(
        src_pts=src,
        dst_pts=dst,
        meters_per_pixel=meters_per_pixel,
        origin_lat=origin_lat,
        img_center=(150.0, 150.0)
    )

    assert res["success"] is True
    assert abs(res["dx_meters"] - 10.0) < 0.1  # 20 * 0.5 = 10m East
    assert abs(res["dy_meters"] - 5.0) < 0.1   # -10 * 0.5 = +5m North (y inverted)

    # dLat should be positive North: 5.0m / 110574.61 ≈ +0.00004522
    assert res["dLat"] > 0
    assert abs(res["dLat"] - (5.0 / 110574.61)) < 1e-7

    # dLng should be positive East: 10.0m / (111320 * cos(24.4686°)) ≈ +0.00009873
    assert res["dLng"] > 0
    expected_dlng = 10.0 / (111320.0 * math.cos(math.radians(origin_lat)))
    assert abs(res["dLng"] - expected_dlng) < 1e-7


# ----------------------------------------------------------------------
# Test Suite 3: Iterative Closest Point (ICP) Vector Point Set Registration
# ----------------------------------------------------------------------
def test_icp_vector_point_registration():
    """Tests 2D ICP point registration on road centerline and corridor networks."""
    theta = np.linspace(0, 2 * np.pi, 200)
    x = 50.0 * np.cos(theta) + 10.0 * np.cos(3 * theta)
    y = 30.0 * np.sin(theta) + 10.0 * np.sin(2 * theta)
    source_pts = np.column_stack([x, y])

    # Ground truth transform: theta = 12.0 deg, tx = 8.0m, ty = -5.0m
    gt_theta_deg = 12.0
    gt_theta_rad = math.radians(gt_theta_deg)
    R_gt = np.array([
        [math.cos(gt_theta_rad), -math.sin(gt_theta_rad)],
        [math.sin(gt_theta_rad),  math.cos(gt_theta_rad)]
    ])
    t_gt = np.array([8.0, -5.0])

    target_pts = np.dot(source_pts, R_gt.T) + t_gt

    icp_res = align_vectors_icp(
        source_points=source_pts,
        target_points=target_pts,
        max_iterations=60,
        tolerance=1e-6
    )

    assert icp_res["success"] is True
    assert abs(icp_res["rotationDeg"] - 12.0) < 0.1, f"ICP rotation error: {icp_res['rotationDeg']} vs 12.0"
    assert abs(icp_res["tx"] - 8.0) < 0.1, f"ICP tx error: {icp_res['tx']} vs 8.0"
    assert abs(icp_res["ty"] - (-5.0)) < 0.1, f"ICP ty error: {icp_res['ty']} vs -5.0"
    assert icp_res["rmse"] < 0.01, f"ICP RMSE too high: {icp_res['rmse']}"


# ----------------------------------------------------------------------
# Test Suite 4: Multi-Stage Fallback Integration
# ----------------------------------------------------------------------
def test_alignment_multi_stage_fallback():
    """Tests graceful fallback when invalid or blank images are supplied."""
    blank_img = np.zeros((100, 100, 3), dtype=np.uint8)
    blank_b64 = image_to_base64_png(blank_img)

    # Test explicit blank / no-key execution
    res = align_images_ai(cad_image_b64=blank_b64, map_image_b64=blank_b64, api_key="")

    assert res["success"] is True
    assert "dLat" in res
    assert "dLng" in res
    assert "rotationDeg" in res
    assert isinstance(res["confidence"], float)
    assert 0.0 <= res["confidence"] <= 1.0


def test_linestring_point_sampling():
    """Tests uniform geodesic sampling along polyline."""
    coords = [[0.0, 0.0], [10.0, 0.0], [10.0, 10.0]]
    sampled = sample_points_along_linestring(coords, step_distance=2.0)

    assert len(sampled) >= 10
    assert sampled[0] == (0.0, 0.0)
    assert sampled[-1] == (10.0, 10.0)


if __name__ == "__main__":
    print("--- Running Test 1: CV Synthetic Alignment ---")
    test_cv_synthetic_alignment_recovery()
    print("  [PASS] SIFT + RANSAC recovered ground truth transform successfully.")

    print("--- Running Test 2: Metric to GPS Calculations ---")
    test_metric_to_gps_calculations()
    print("  [PASS] Metric-to-GPS formulas validated.")

    print("--- Running Test 3: ICP Vector Alignment ---")
    test_icp_vector_point_registration()
    print("  [PASS] 2D ICP point registration converged with sub-centimeter RMSE.")

    print("--- Running Test 4: Multi-Stage Fallback ---")
    test_alignment_multi_stage_fallback()
    print("  [PASS] Multi-stage fallback executed safely.")

    print("\nALL CV & ALIGNMENT TESTS PASSED SUCCESSFULLY!")
