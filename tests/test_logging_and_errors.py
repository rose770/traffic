import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from app.logging_config import memory_log_handler, get_logger
from app.exceptions import (
    AppException,
    ValidationException,
    NotFoundException,
    CadParsingException,
    SpatialAlignmentException
)
from app.middleware import metrics_collector

logger = get_logger("tests.logging")


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ----------------------------------------------------------------------
# 1. Request Tracing & Correlation Header Tests
# ----------------------------------------------------------------------
def test_request_id_generation_and_headers(client):
    """Verifies X-Request-ID and X-Response-Time headers on API calls."""
    res = client.get("/api/system/health")
    assert res.status_code == 200
    assert "X-Request-ID" in res.headers
    assert "X-Response-Time" in res.headers

    # Verify UUID format of generated request ID
    req_id = res.headers["X-Request-ID"]
    assert len(req_id) >= 16


def test_custom_request_id_propagation(client):
    """Verifies that an incoming X-Request-ID is preserved and propagated back."""
    custom_trace_id = f"trace-ops-{uuid.uuid4().hex[:12]}"
    res = client.get("/api/system/health", headers={"X-Request-ID": custom_trace_id})
    assert res.status_code == 200
    assert res.headers["X-Request-ID"] == custom_trace_id


# ----------------------------------------------------------------------
# 2. In-Memory Ring Buffer & Log Query Tests
# ----------------------------------------------------------------------
def test_memory_log_recording_and_filtering(client):
    """Verifies logging into ring buffer and querying via /api/system/logs."""
    unique_tag = f"test-event-{uuid.uuid4().hex[:8]}"
    logger.info(f"Operational check event: {unique_tag}")
    logger.warning(f"Warning telemetry message: {unique_tag}")
    logger.error(f"Simulated error message: {unique_tag}")

    # Query via API with search filter
    res = client.get(f"/api/system/logs?search={unique_tag}")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_returned"] >= 3

    # Query with level=ERROR filter
    res_err = client.get(f"/api/system/logs?search={unique_tag}&level=ERROR")
    assert res_err.status_code == 200
    data_err = res_err.json()
    assert all(l["level"] == "ERROR" for l in data_err["logs"])


def test_clear_system_logs(client):
    """Verifies clearing the in-memory log ring buffer."""
    res = client.post("/api/system/logs/clear")
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Check logs are cleared (or only contains the clear event itself)
    logs_res = client.get("/api/system/logs")
    assert logs_res.status_code == 200
    assert logs_res.json()["total_returned"] <= 2


# ----------------------------------------------------------------------
# 3. Domain Exception Serialization & Bilingual Responses
# ----------------------------------------------------------------------
def test_domain_exception_structure():
    """Tests AppException serialization format."""
    exc = CadParsingException(
        message_en="Invalid polyline in layer DETOUR_AXIS",
        message_ar="خطأ في خط المسار في طبقة مسار التحويلة",
        details={"layer": "DETOUR_AXIS", "entity_count": 0}
    )
    d = exc.to_dict()
    assert d["success"] is False
    assert d["error"]["code"] == "CAD_PARSING_FAILED"
    assert d["error"]["status_code"] == 422
    assert d["error"]["details"]["layer"] == "DETOUR_AXIS"


def test_validation_error_response(client):
    """Tests Pydantic validation error handler formatting."""
    # Send empty body to a route requiring payload
    res = client.post("/api/auth/login", json={})
    assert res.status_code == 422
    data = res.json()
    assert data["success"] is False
    assert data["error"]["code"] == "REQUEST_VALIDATION_ERROR"
    assert "request_id" in data["error"]
    assert len(data["error"]["fields"]) >= 2  # username, password missing


# ----------------------------------------------------------------------
# 4. System Health & Telemetry Metrics Tests
# ----------------------------------------------------------------------
def test_system_health_endpoint(client):
    """Verifies detailed subsystem health probe."""
    res = client.get("/api/system/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ["healthy", "degraded"]
    assert "subsystems" in data
    assert data["subsystems"]["database"]["status"] == "healthy"
    assert data["subsystems"]["cad_engine"]["status"] == "healthy"
    assert data["subsystems"]["cv_engine"]["status"] == "healthy"
    assert "resources" in data
    assert "uptime_seconds" in data


def test_system_metrics_endpoint(client):
    """Verifies metrics collector throughput and latency stats."""
    # Generate some requests
    client.get("/api/permits")
    client.get("/api/system/health")

    res = client.get("/api/system/metrics")
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    metrics = data["metrics"]
    assert metrics["total_requests"] >= 2
    assert "uptime_seconds" in metrics
    assert "avg_response_time_ms" in metrics
    assert "status_breakdown" in metrics
    assert "2xx" in metrics["status_breakdown"]
