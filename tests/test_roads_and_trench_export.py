import pytest
import io
import ezdxf
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_road_inspection_endpoint():
    # Central Madinah coordinates
    response = client.get("/api/roads/inspect?lat=24.4686&lng=39.6120")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "streetName" in data
    assert len(data["streetName"]) > 0
    assert "classification" in data
    assert "estimatedRowMeters" in data
    assert data["estimatedRowMeters"] > 0
    assert "centerline" in data
    assert len(data["centerline"]) >= 2


def test_trench_dxf_export_endpoint():
    payload = {
        "projectName": "Madinah Water Pipeline Trench",
        "streetName": "King Fahd Road",
        "roadClass": "Major Arterial",
        "trenchWidth": 0.80,
        "trenchDepth": 1.50,
        "lateralOffset": 2.00,
        "alignmentNodes": [
            [24.4680, 39.6110],
            [24.4685, 39.6120],
            [24.4690, 39.6130]
        ],
        "boundaryNodes": [
            [24.4679, 39.6110],
            [24.4689, 39.6130],
            [24.4691, 39.6130],
            [24.4681, 39.6110]
        ],
        "roadCenterlineNodes": [
            [24.4675, 39.6105],
            [24.4695, 39.6135]
        ]
    }

    response = client.post("/api/cad/export-trench-dxf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/dxf"
    assert "Content-Disposition" in response.headers
    assert ".dxf" in response.headers["Content-Disposition"]

    dxf_bytes = response.content
    assert len(dxf_bytes) > 500

    # Parse DXF bytes to verify AutoCAD structure and layers
    stream = io.StringIO(dxf_bytes.decode("utf-8", errors="ignore"))
    doc = ezdxf.read(stream)

    assert doc.header["$INSUNITS"] == 4  # 4 = Meters
    layers = [l.dxf.name for l in doc.layers]
    assert "STREET_NAMES_REF" in layers
    assert "ROAD_REFERENCE" in layers
    assert "TRENCH_ALIGNMENT" in layers
    assert "TRENCH_BOUNDARY" in layers
    assert "DIMENSIONS_ANNOTATION" in layers

    # Verify modelspace entities
    msp = doc.modelspace()
    polylines = msp.query("LWPOLYLINE")
    assert len(polylines) >= 2  # Alignment and Boundary

    texts = msp.query("TEXT")
    assert len(texts) >= 1  # Street name

    mtexts = msp.query("MTEXT")
    assert len(mtexts) >= 1  # Specification annotations
