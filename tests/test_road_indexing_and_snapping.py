"""
Unit and Integration Tests for Esri-Indexed Road Name Identification,
Vector Feature Snapping, and CAD DXF / GeoJSON Export.
"""

import io
import pytest
import ezdxf
from fastapi.testclient import TestClient
from main import app
from app.services.road_service import (
    query_viewport_road_network,
    identify_nearest_road,
    query_esri_reverse_geocode,
    export_roads_and_drawings_to_dxf
)

client = TestClient(app)


def test_roads_viewport_api():
    """Tests GET /api/roads/viewport returns valid GeoJSON FeatureCollection with classifications."""
    response = client.get("/api/roads/viewport?minLat=24.465&minLng=39.610&maxLat=24.472&maxLng=39.615")
    assert response.status_code == 200
    data = response.json()
    assert data.get("type") == "FeatureCollection"
    assert "features" in data
    assert isinstance(data["features"], list)
    assert len(data["features"]) > 0

    feat = data["features"][0]
    assert feat["type"] == "Feature"
    assert feat["geometry"]["type"] == "LineString"
    props = feat["properties"]
    assert "name" in props
    assert "functionalClass" in props
    assert "classificationAr" in props
    assert "lengthM" in props


def test_roads_identify_api():
    """Tests GET /api/roads/identify performs spatial hit-test and resolves street name."""
    # Test point in Madinah near King Abdulaziz Road corridor
    response = client.get("/api/roads/identify?lat=24.4688&lng=39.6175&radius=50.0")
    assert response.status_code == 200
    data = response.json()
    assert "found" in data
    assert "snapPoint" in data
    assert len(data["snapPoint"]) == 2

    if data.get("found"):
        feat = data["feature"]
        props = feat["properties"]
        assert props["name"] is not None
        assert len(props["name"]) > 0
        assert props.get("functionalClass") in ["MOTORWAY", "PRIMARY", "ARTERIAL", "COLLECTOR", "RESIDENTIAL", "PEDESTRIAN", "LOCAL"]


def test_esri_reverse_geocode():
    """Tests Esri reverse geocode API service returns official address/locality."""
    res = query_esri_reverse_geocode(24.4686, 39.6120)
    assert isinstance(res, dict)
    assert res.get("streetName") is not None
    assert len(res.get("streetName")) > 0
    # Should resolve to Arabic locality or fallback
    assert "district" in res or "error" in res


def test_export_roads_and_drawings_to_dxf():
    """Tests layered CAD DXF generation with ROAD_REFERENCE and USER_DRAWINGS."""
    road_features = [
        {
            "type": "Feature",
            "properties": {"name": "طريق الملك عبد العزيز", "functionalClass": "PRIMARY"},
            "geometry": {
                "type": "LineString",
                "coordinates": [[39.6120, 24.4680], [39.6125, 24.4685], [39.6130, 24.4690]]
            }
        }
    ]

    user_drawings = [
        {
            "type": "polyline",
            "layer": "site",
            "name": "Work Zone Alignment",
            "roadName": "طريق الملك عبد العزيز",
            "nodes": [
                {"lat": 24.4681, "lng": 39.6121},
                {"lat": 24.4684, "lng": 39.6124}
            ]
        },
        {
            "type": "polygon",
            "layer": "site",
            "name": "Excavation Parcel",
            "roadName": "طريق الملك عبد العزيز",
            "isClosed": True,
            "nodes": [
                {"lat": 24.4682, "lng": 39.6122},
                {"lat": 24.4683, "lng": 39.6123},
                {"lat": 24.4682, "lng": 39.6124}
            ]
        }
    ]

    dxf_bytes = export_roads_and_drawings_to_dxf(
        road_features=road_features,
        user_drawings=user_drawings,
        anchor_lat=24.4686,
        anchor_lng=39.6120,
        site_name="Test_Site_Plan"
    )

    assert isinstance(dxf_bytes, bytes)
    assert len(dxf_bytes) > 1000

    # Parse resulting DXF using ezdxf to strictly verify CAD compatibility
    doc = ezdxf.read(io.StringIO(dxf_bytes.decode("utf-8")))
    layer_names = [layer.dxf.name for layer in doc.layers]
    assert "ROAD_REFERENCE" in layer_names
    assert "USER_DRAWINGS" in layer_names

    # Check entities in modelspace
    msp = doc.modelspace()
    road_entities = [e for e in msp if e.dxf.layer == "ROAD_REFERENCE"]
    user_entities = [e for e in msp if e.dxf.layer == "USER_DRAWINGS"]

    assert len(road_entities) >= 2  # Polyline + Text entity
    assert len(user_entities) >= 2  # 2 user polylines


def test_export_dxf_endpoint():
    """Tests POST /api/roads/export-dxf HTTP endpoint."""
    payload = {
        "roadFeatures": [
            {
                "type": "Feature",
                "properties": {"name": "شارع قباء"},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[39.611, 24.467], [39.612, 24.468]]
                }
            }
        ],
        "userDrawings": [
            {
                "type": "polyline",
                "nodes": [{"lat": 24.4675, "lng": 39.6115}, {"lat": 24.4678, "lng": 39.6118}],
                "roadName": "شارع قباء"
            }
        ],
        "anchorLat": 24.4686,
        "anchorLng": 39.6120,
        "siteName": "Amanah_Test_Alignment"
    }

    res = client.post("/api/roads/export-dxf", json=payload)
    assert res.status_code == 200
    assert "application/dxf" in res.headers.get("Content-Type", "")
    assert len(res.content) > 1000
