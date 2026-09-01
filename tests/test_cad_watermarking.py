import pytest
from app.services.cad_generator import (
    build_6node_dxf,
    build_watermarked_dxf_from_features,
    _generate_digital_signature
)


def test_signature_generation():
    sig = _generate_digital_signature("Test Project", "2026-08-30 09:00:00 UTC")
    assert sig.startswith("TAHCOM-CAD-")
    assert len(sig) > 15


def test_build_6node_dxf_structure():
    nodes = [
        {"lat": 24.4686, "lng": 39.6120, "x": 582500, "y": 2703800},
        {"lat": 24.4688, "lng": 39.6122, "x": 582520, "y": 2703820},
        {"lat": 24.4690, "lng": 39.6124, "x": 582540, "y": 2703840},
        {"lat": 24.4692, "lng": 39.6122, "x": 582520, "y": 2703860},
        {"lat": 24.4690, "lng": 39.6118, "x": 582480, "y": 2703840},
        {"lat": 24.4688, "lng": 39.6118, "x": 582480, "y": 2703820}
    ]
    placed_elements = [
        {"type": "stop_sign", "lat": 24.4686, "lng": 39.6120, "rotation": 45},
        {"type": "speed_limit_50", "lat": 24.4688, "lng": 39.6122, "rotation": 0}
    ]

    dxf = build_6node_dxf(
        nodes=nodes,
        placed_elements=placed_elements,
        project_name="King Abdulaziz Detour",
        lat=24.4686,
        lng=39.6120,
        editor_user="Eng. Fahad Al-Harbi"
    )

    assert "SECTION" in dxf
    assert "HEADER" in dxf
    assert "WORK_ZONE_BOUNDARY" in dxf
    assert "DETOUR_ROUTE" in dxf
    assert "NJB_BARRIER_LINE" in dxf
    assert "PLATFORM_DIGITAL_WATERMARK" in dxf
    assert "TAHCOM-CAD-" in dxf
    assert "EOF" in dxf


def test_build_watermarked_dxf_from_features():
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[39.6120, 24.4686], [39.6125, 24.4690]]
                },
                "properties": {
                    "layer": "DETOUR_TAPER",
                    "color": "#EF4444"
                }
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[39.6120, 24.4686], [39.6125, 24.4686], [39.6125, 24.4690], [39.6120, 24.4690], [39.6120, 24.4686]]]
                },
                "properties": {
                    "layer": "WORK_ZONE_BOUNDARY",
                    "color": "#0EA5E9"
                }
            }
        ]
    }

    placed_elements = [
        {"type": "concrete_njb_poster", "lat": 24.4686, "lng": 39.6120, "rotation": 90}
    ]

    dxf = build_watermarked_dxf_from_features(
        geojson=geojson,
        placed_elements=placed_elements,
        project_name="Madinah Central Detour",
        lat=24.4686,
        lng=39.6120
    )

    assert "SECTION" in dxf
    assert "DETOUR_ROUTE" in dxf
    assert "WORK_ZONE_BOUNDARY" in dxf
    assert "PLATFORM_DIGITAL_WATERMARK" in dxf
    assert "EOF" in dxf


def test_custom_labels_in_cad():
    labels = [
        {"text": "STA 0+150 EMERGENCY EXIT", "lat": 24.4686, "lng": 39.6120},
        {"text": "CHECKPOINT A", "lat": 24.4689, "lng": 39.6123}
    ]

    # Test build_6node_dxf
    dxf_6node = build_6node_dxf(
        nodes=[{"lat": 24.4686, "lng": 39.6120}, {"lat": 24.4688, "lng": 39.6122}, {"lat": 24.4690, "lng": 39.6124}],
        labels=labels,
        project_name="Label Verification Site",
        lat=24.4686,
        lng=39.6120
    )
    assert "ANNOTATIONS_AND_LABELS" in dxf_6node
    assert "STA 0+150 EMERGENCY EXIT" in dxf_6node
    assert "CHECKPOINT A" in dxf_6node

    # Test build_watermarked_dxf_from_features
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [39.6120, 24.4686]},
                "properties": {"text": "STA 0+150 EMERGENCY EXIT", "layer": "ANNOTATIONS_AND_LABELS"}
            }
        ]
    }
    dxf_watermarked = build_watermarked_dxf_from_features(
        geojson=geojson,
        labels=labels,
        project_name="Watermark Label Test",
        lat=24.4686,
        lng=39.6120
    )
    assert "ANNOTATIONS_AND_LABELS" in dxf_watermarked
    assert "STA 0+150 EMERGENCY EXIT" in dxf_watermarked

