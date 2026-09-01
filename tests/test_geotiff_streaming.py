import pytest
from fastapi.testclient import TestClient
from main import app
from app.logging_config import memory_log_handler

client = TestClient(app)


def test_geotiff_survey_metadata():
    response = client.get("/api/geotiff/survey-metadata?lat=24.4686&lng=39.6120")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "surveyBounds" in data
    assert len(data["surveyBounds"]) == 2
    assert data["minZoomThreshold"] == 16
    assert "cogUrl" in data


def test_geotiff_full_retrieval_and_logging():
    memory_log_handler.clear()
    response = client.get("/api/geotiff/sample-survey.tif?lat=24.4686&lng=39.6120")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/tiff"
    assert response.headers["accept-ranges"] == "bytes"
    assert len(response.content) > 10000

    # Verify telemetry log recorded on retrieval
    logs = memory_log_handler.get_logs(search="geotiff.stream")
    assert len(logs) >= 1
    assert "Retrieved full GeoTIFF image" in logs[0]["message"]


def test_geotiff_range_request_and_logging():
    memory_log_handler.clear()
    headers = {"Range": "bytes=0-2047"}
    response = client.get("/api/geotiff/sample-survey.tif?lat=24.4686&lng=39.6120", headers=headers)
    assert response.status_code == 206
    assert response.headers["content-type"] == "image/tiff"
    assert "bytes 0-2047/" in response.headers["content-range"]
    assert len(response.content) == 2048

    # Verify telemetry log recorded on slice retrieval
    logs = memory_log_handler.get_logs(search="geotiff.stream")
    assert len(logs) >= 1
    assert "Retrieved GeoTIFF slice: bytes=0-2047" in logs[0]["message"]


def test_client_geotiff_telemetry_recording():
    memory_log_handler.clear()
    payload = {
        "level": "INFO",
        "module": "geotiff.stream",
        "message": "Retrieved & decoded GeoTIFF raster window [39.609, 24.465, 39.615, 24.471] (512x512px) for survey layer",
        "details": {"width": 512, "height": 512}
    }
    response = client.post("/api/system/logs/record", json=payload)
    assert response.status_code == 200

    logs = memory_log_handler.get_logs(search="geotiff.stream")
    assert len(logs) >= 1
    assert "Retrieved & decoded GeoTIFF raster window" in logs[0]["message"]
