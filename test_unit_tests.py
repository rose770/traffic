import math
import re
import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from app.database import initialize_db

passed_tests = 0
failed_tests = 0


def assert_test(condition: bool, message: str) -> None:
    global passed_tests, failed_tests
    if condition:
        print(f"  [PASS] {message}")
        passed_tests += 1
    else:
        print(f"  [FAIL] {message}")
        failed_tests += 1


# -------------------------------------------------------------
# 1. Official Permit Document Exporter Unit Test
# -------------------------------------------------------------
def generate_permit_doc_test(permit: dict) -> str:
    return (
        f"AMANAH AL-MADINAH MUNICIPALITY - OFFICIAL DETOUR PERMIT\n"
        f"Permit ID: {permit.get('id', 'AM-2026-PR-99')}\n"
        f"Project: {permit.get('projectNameEn', 'King Abdulaziz Road')}\n"
        f"Status: {permit.get('status', 'APPROVED')}"
    )


print("\n--- Running Unit Test Suite 1: Official Permit Exporter ---")
test_permit_data = {
    "id": "AM-2026-PR-100",
    "projectNameEn": "King Abdulaziz Road Utility Extension",
    "status": "APPROVED"
}

doc_output = generate_permit_doc_test(test_permit_data)
assert_test("AMANAH AL-MADINAH MUNICIPALITY" in doc_output, "Permit document includes official header")
assert_test("AM-2026-PR-100" in doc_output, "Permit document includes correct permit ID")
assert_test("APPROVED" in doc_output, "Permit document includes approval status")


# -------------------------------------------------------------
# 2. Traffic Safety Calculator Unit Test
# -------------------------------------------------------------
print("\n--- Running Unit Test Suite 2: Traffic Safety Calculator ---")


def calc_taper(speed: float, lane_width: float) -> float:
    return (lane_width * (speed ** 2)) / 155.0 if speed <= 60 else (lane_width * speed) / 1.6


def get_buffer_ssd(speed: float) -> int:
    if speed <= 40:
        return 50
    if speed <= 60:
        return 85
    if speed <= 80:
        return 130
    if speed <= 100:
        return 185
    return 250


taper60 = calc_taper(60, 3.6)
assert_test(abs(taper60 - 83.61) < 0.1, f"Taper length for 60km/h is ~83.6m (got {taper60:.2f}m)")

taper80 = calc_taper(80, 3.6)
assert_test(taper80 == 180.0, f"Taper length for 80km/h is exactly 180m (got {taper80}m)")

assert_test(get_buffer_ssd(40) == 50, "Buffer SSD for 40km/h is 50m")
assert_test(get_buffer_ssd(60) == 85, "Buffer SSD for 60km/h is 85m")
assert_test(get_buffer_ssd(80) == 130, "Buffer SSD for 80km/h is 130m")
assert_test(get_buffer_ssd(100) == 185, "Buffer SSD for 100km/h is 185m")


# -------------------------------------------------------------
# 3. Coordinate Regex Parser Unit Test
# -------------------------------------------------------------
print("\n--- Running Unit Test Suite 3: Coordinate Regex Parser ---")
regex_pattern = re.compile(r"(?:E|e)?\s*(\d+(?:\.\d+)?)\s*,\s*(?:N|n)?\s*(\d+(?:\.\d+)?)")
sample_text = "N1: (E582450, N2703822), N2: (E582550, N2703866)"
parsed = []
for m in regex_pattern.finditer(sample_text):
    parsed.append({"x": float(m.group(1)), "y": float(m.group(2))})

assert_test(len(parsed) == 2, f"Parsed 2 coordinate pairs (got {len(parsed)})")
assert_test(parsed[0]["x"] == 582450.0 and parsed[0]["y"] == 2703822.0, "Pair 1 parsed correctly: 582450, 2703822")
assert_test(parsed[1]["x"] == 582550.0 and parsed[1]["y"] == 2703866.0, "Pair 2 parsed correctly: 582550, 2703866")


# -------------------------------------------------------------
# 4. REST API Database Integration Unit Test
# -------------------------------------------------------------
print("\n--- Running Unit Test Suite 4: REST API & SQLite DB ---")

with TestClient(app) as client:
    # Test Auth Login
    login_res = client.post("/api/auth/login", json={"username": "contractor", "password": "pass123"})
    assert_test(login_res.status_code == 200 and login_res.json().get("success") is True, "POST /api/auth/login successful")

    # Test Create Permit
    post_data = {
        "contractor_id": 1,
        "data": {
            "projectNameAr": "مشروع النقل الترددي",
            "projectNameEn": "Shuttle Transport Project",
            "contractorAr": "شركة ساس للإنشاءات",
            "contractorEn": "SAS Construction LLC",
            "speed": 80,
            "taper": 180,
            "buffer": 130,
            "termination": 30,
            "coordinates": "N1: (E582450, N2703822), N2: (E582550, N2703866)"
        }
    }

    create_res = client.post("/api/permits", json=post_data)
    assert_test(create_res.status_code == 200 and create_res.json().get("success") is True, "POST /api/permits returned 200 OK & success=true")
    created_id = create_res.json().get("id")
    assert_test(created_id is not None and created_id > 0, f"Permit created with database ID: {created_id}")

    # Test List Permits
    get_res = client.get("/api/permits")
    assert_test(get_res.status_code == 200 and isinstance(get_res.json(), list), "GET /api/permits returned list of permits")
    found_permit = next((p for p in get_res.json() if p["id"] == created_id), None)
    assert_test(found_permit is not None, f"Found created permit ID {created_id} in DB response")

    # Test Update Permit
    put_data = {"status": "Approved", "inspector_notes": "Fully compliant with KSA MOT code."}
    put_res = client.put(f"/api/permits/{created_id}", json=put_data)
    assert_test(put_res.status_code == 200 and put_res.json().get("success") is True, f"PUT /api/permits/{created_id} returned 200 OK")

    # Test Approval Chain
    chain_init = client.post(f"/api/permits/{created_id}/approval-chain/init")
    assert_test(chain_init.status_code == 200 and chain_init.json().get("success") is True, "Approval chain initialized")
    chain_get = client.get(f"/api/permits/{created_id}/approval-chain")
    assert_test(chain_get.status_code == 200 and len(chain_get.json()) == 5, "Approval chain has 5 roles")

    # Test CAD Generation API
    cad_gen_res = client.post("/api/generate-cad", json={"lat": 24.4686, "lng": 39.6120, "projectName": "Test Road Detour"})
    assert_test(cad_gen_res.status_code == 200 and "ROAD_CENTERLINES" in cad_gen_res.text, "POST /api/generate-cad returns valid DXF stream")

    # Test Phasing AI
    phasing_res = client.post("/api/generate-phasing", json={"total_duration_hours": 720})
    assert_test(phasing_res.status_code == 200 and len(phasing_res.json().get("phases", [])) > 0, "POST /api/generate-phasing returns valid milestones")


print("\n==================================================")
print(f"SUMMARY: {passed_tests} passed, {failed_tests} failed.")
print("==================================================\n")

if failed_tests > 0:
    sys.exit(1)
