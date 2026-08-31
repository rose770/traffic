"""
Operational Monitoring, Health Probes, and Telemetry Router for Amanah Madinah Platform.
"""

import os
import sys
import time
import psutil
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Response, status

from app.logging_config import memory_log_handler, get_logger
from app.middleware import metrics_collector
from app.database import get_db

logger = get_logger("app.system")
router = APIRouter(prefix="/api/system", tags=["System Operations & Telemetry"])


# ----------------------------------------------------------------------
# 1. Detailed Subsystem Health Probe
# ----------------------------------------------------------------------
@router.get("/health")
def get_system_health():
    """Returns detailed health status across database, CAD parser, CV engine, and memory."""
    subsystems = {}
    is_healthy = True

    # 1. Database Probe
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM permits")
            row_p = cursor.fetchone()
            permits_count = row_p.get("count", 0) if isinstance(row_p, dict) else row_p[0]

            cursor.execute("SELECT COUNT(*) as count FROM users")
            row_u = cursor.fetchone()
            users_count = row_u.get("count", 0) if isinstance(row_u, dict) else row_u[0]

            subsystems["database"] = {
                "status": "healthy",
                "engine": "SQLite3",
                "permits_count": permits_count,
                "users_count": users_count
            }
    except Exception as db_err:
        is_healthy = False
        subsystems["database"] = {
            "status": "unhealthy",
            "error": str(db_err)
        }

    # 2. CAD Parser Engine Probe
    try:
        import ezdxf
        subsystems["cad_engine"] = {
            "status": "healthy",
            "ezdxf_version": ezdxf.__version__,
            "capabilities": ["DWG_TO_DXF", "AC1032_RECOVERY", "UTM_ZONE_37N_38N", "KEYMAP_EXTRACTION"]
        }
    except Exception as cad_err:
        is_healthy = False
        subsystems["cad_engine"] = {"status": "unhealthy", "error": str(cad_err)}

    # 3. Computer Vision Engine Probe
    try:
        import cv2
        subsystems["cv_engine"] = {
            "status": "healthy",
            "opencv_version": cv2.__version__,
            "capabilities": ["SIFT", "ORB", "RANSAC_AFFINE_PARTIAL_2D", "CANNY_ADAPTIVE", "ICP_KDTREE"]
        }
    except Exception as cv_err:
        is_healthy = False
        subsystems["cv_engine"] = {"status": "unhealthy", "error": str(cv_err)}

    # 4. Memory & Resource Probe
    try:
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        rss_mb = round(mem_info.rss / (1024 * 1024), 2)
        vms_mb = round(mem_info.vms / (1024 * 1024), 2)
        cpu_pct = process.cpu_percent(interval=None)
    except Exception:
        rss_mb, vms_mb, cpu_pct = 0.0, 0.0, 0.0

    metrics_summary = metrics_collector.get_summary()

    return {
        "status": "healthy" if is_healthy else "degraded",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "uptime_seconds": metrics_summary["uptime_seconds"],
        "subsystems": subsystems,
        "resources": {
            "rss_memory_mb": rss_mb,
            "virtual_memory_mb": vms_mb,
            "cpu_percent": cpu_pct,
            "python_version": sys.version.split()[0]
        }
    }


# ----------------------------------------------------------------------
# 2. Operational Metrics & Traffic Telemetry
# ----------------------------------------------------------------------
@router.get("/metrics")
def get_system_metrics():
    """Returns throughput, latency distribution, status code breakdown, and error statistics."""
    return {
        "success": True,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "metrics": metrics_collector.get_summary()
    }


# ----------------------------------------------------------------------
# 3. Real-Time Operational Log Querying
# ----------------------------------------------------------------------
@router.get("/logs")
def query_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARNING, ERROR, CRITICAL)"),
    limit: int = Query(100, ge=1, le=500, description="Max number of logs to return"),
    search: Optional[str] = Query(None, description="Text search in message, logger name, or request ID"),
    request_id: Optional[str] = Query(None, description="Filter by exact or partial correlation Request ID"),
    logger_name: Optional[str] = Query(None, description="Filter by module logger name")
):
    """Retrieves recent in-memory operational logs with multi-field filtering."""
    logs = memory_log_handler.get_logs(
        level=level,
        limit=limit,
        search=search,
        request_id=request_id,
        logger_name=logger_name
    )
    return {
        "success": True,
        "total_returned": len(logs),
        "filters": {
            "level": level,
            "limit": limit,
            "search": search,
            "request_id": request_id,
            "logger_name": logger_name
        },
        "logs": logs
    }


# ----------------------------------------------------------------------
# 4. Clear Log Buffer (Ops Utility)
# ----------------------------------------------------------------------
@router.post("/logs/clear")
def clear_system_logs():
    """Clears the live in-memory telemetry log buffer."""
    memory_log_handler.clear()
    logger.info("In-memory operational log buffer cleared by administrator.")
    return {"success": True, "message": "Log buffer cleared successfully."}
