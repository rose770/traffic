import os
import sys
from pathlib import Path

# Ensure UTF-8 output
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from app.services.cad_parser import parse_cad_drawing

client = TestClient(app)

CAD_EXAMPLES = Path("cad_examples")
dxf_path = CAD_EXAMPLES / "road_detour_diagram (1).dxf"
dwg_path = CAD_EXAMPLES / "242206770.dwg"

print("\n--- Running CAD & GeoTIFF Integration Tests ---")

# 1. Test direct DXF parsing
if dxf_path.exists():
    with open(dxf_path, "rb") as f:
        dxf_bytes = f.read()
    res = parse_cad_drawing(dxf_bytes, dxf_path.name)
    print(f"  [PASS] Direct DXF parsed successfully: {len(res['geojson']['features'])} features, {len(res['layers'])} active layers")
    assert res["success"] is True
    assert len(res["geojson"]["features"]) > 0
    assert "keymap" in res

# 2. Test direct DWG parsing
if dwg_path.exists():
    with open(dwg_path, "rb") as f:
        dwg_bytes = f.read()
    res_dwg = parse_cad_drawing(dwg_bytes, dwg_path.name)
    print(f"  [PASS] DWG converted & parsed successfully: {len(res_dwg['geojson']['features'])} features, street: '{res_dwg['extractedInfo']['streetNameAr']}'")
    assert res_dwg["success"] is True
    assert len(res_dwg["geojson"]["features"]) > 0

# 3. Test /api/parse-dwg Endpoint via TestClient
if dxf_path.exists():
    with open(dxf_path, "rb") as f:
        api_res = client.post(
            "/api/parse-dwg",
            files={"dwgFile": (dxf_path.name, f, "application/dxf")},
            data={"crs": "utm37n"}
        )
    assert api_res.status_code == 200
    json_data = api_res.json()
    assert json_data["success"] is True
    print(f"  [PASS] POST /api/parse-dwg endpoint returned 200 OK with {json_data['totalFeatures']} features")

# 4. Test /api/cad-to-geojson Endpoint
if dxf_path.exists():
    with open(dxf_path, "rb") as f:
        ingest_res = client.post(
            "/api/cad-to-geojson",
            files={"file": (dxf_path.name, f, "application/dxf")},
            data={"source_epsg": "EPSG:32637"}
        )
    assert ingest_res.status_code == 200
    ingest_json = ingest_res.json()
    assert ingest_json.get("type") == "FeatureCollection"
    print(f"  [PASS] POST /api/cad-to-geojson returned FeatureCollection with {len(ingest_json['features'])} features")

# 5. Test /api/ai-align Endpoint
mock_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
align_res = client.post("/api/ai-align", json={"cadImage": mock_img, "mapImage": mock_img})
assert align_res.status_code == 200
align_json = align_res.json()
assert align_json["success"] is True
assert "dLat" in align_json and "dLng" in align_json and "rotationDeg" in align_json
print(f"  [PASS] POST /api/ai-align returned alignment vector: dLat={align_json['dLat']}, dLng={align_json['dLng']}, rot={align_json['rotationDeg']}")

print("\n==================================================")
print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
print("==================================================\n")
