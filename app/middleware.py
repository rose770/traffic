"""
Request Tracing, Telemetry Metrics, and Diagnostics Middleware for Amanah Madinah Platform.
"""

import time
import uuid
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.logging_config import request_id_ctx, client_ip_ctx, get_logger

logger = get_logger("app.middleware")


# ----------------------------------------------------------------------
# 1. Real-Time Telemetry & Metrics Aggregator
# ----------------------------------------------------------------------
class SystemMetricsCollector:
    """In-memory aggregator for request throughput, latency distribution, and error rates."""

    def __init__(self, max_history: int = 1000):
        self.boot_time = time.time()
        self.total_requests = 0
        self.active_requests = 0
        self.total_latency_ms = 0.0
        self.status_counts: Dict[str, int] = defaultdict(int)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "count": 0,
            "total_ms": 0.0,
            "min_ms": 999999.0,
            "max_ms": 0.0,
            "errors": 0
        })
        self.recent_errors: deque = deque(maxlen=max_history)

    def record_start(self):
        self.active_requests += 1
        self.total_requests += 1

    def record_end(self, method: str, path: str, status_code: int, duration_ms: float, error_type: str = None):
        self.active_requests = max(0, self.active_requests - 1)
        self.total_latency_ms += duration_ms

        status_group = f"{status_code // 100}xx"
        self.status_counts[status_group] += 1
        self.status_counts[str(status_code)] += 1

        endpoint_key = f"{method} {path}"
        stats = self.endpoint_stats[endpoint_key]
        stats["count"] += 1
        stats["total_ms"] += duration_ms
        stats["min_ms"] = min(stats["min_ms"], duration_ms)
        stats["max_ms"] = max(stats["max_ms"], duration_ms)

        if status_code >= 400 or error_type:
            stats["errors"] += 1
            if error_type:
                self.recent_errors.append({
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "endpoint": endpoint_key,
                    "status_code": status_code,
                    "error_type": error_type,
                    "duration_ms": duration_ms
                })

    def get_summary(self) -> Dict[str, Any]:
        """Returns snapshot telemetry metrics dictionary."""
        now = time.time()
        uptime_seconds = round(now - self.boot_time, 2)
        avg_latency = round(self.total_latency_ms / self.total_requests, 2) if self.total_requests > 0 else 0.0
        error_total = self.status_counts.get("4xx", 0) + self.status_counts.get("5xx", 0)
        error_rate = round((error_total / self.total_requests) * 100.0, 2) if self.total_requests > 0 else 0.0

        formatted_endpoints = []
        for ep_key, stats in self.endpoint_stats.items():
            formatted_endpoints.append({
                "endpoint": ep_key,
                "requests": stats["count"],
                "errors": stats["errors"],
                "avg_ms": round(stats["total_ms"] / stats["count"], 2) if stats["count"] > 0 else 0.0,
                "min_ms": round(stats["min_ms"], 2) if stats["count"] > 0 else 0.0,
                "max_ms": round(stats["max_ms"], 2)
            })

        return {
            "uptime_seconds": uptime_seconds,
            "boot_time": datetime.fromtimestamp(self.boot_time, tz=timezone.utc).isoformat(),
            "total_requests": self.total_requests,
            "active_requests": self.active_requests,
            "avg_response_time_ms": avg_latency,
            "error_rate_pct": error_rate,
            "status_breakdown": dict(self.status_counts),
            "endpoints": sorted(formatted_endpoints, key=lambda x: x["requests"], reverse=True)[:15]
        }


# Global metrics collector instance
metrics_collector = SystemMetricsCollector()


# ----------------------------------------------------------------------
# 2. Pure ASGI Request Tracing & Correlation Middleware
# ----------------------------------------------------------------------
class RequestTracingMiddleware:
    """Pure ASGI middleware to inject tracking correlation IDs and record metrics without stream blocking."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        headers = dict(scope.get("headers", []))
        incoming_req_id = headers.get(b"x-request-id", b"").decode("latin1")
        req_id = incoming_req_id if (incoming_req_id and len(incoming_req_id) <= 64) else str(uuid.uuid4())

        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        token_req = request_id_ctx.set(req_id)
        token_ip = client_ip_ctx.set(client_ip)

        metrics_collector.record_start()
        start_time = time.perf_counter()

        path = scope.get("path", "")
        method = scope.get("method", "GET")

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                duration_ms = round((time.perf_counter() - start_time) * 1000.0, 3)

                # Inject correlation tracking headers
                headers_list = list(message.get("headers", []))
                headers_list.append((b"x-request-id", req_id.encode("latin1")))
                headers_list.append((b"x-response-time", f"{duration_ms:.2f}ms".encode("latin1")))
                message["headers"] = headers_list

                metrics_collector.record_end(method, path, status_code, duration_ms)

                if not path.startswith("/assets") and not path.endswith((".svg", ".jpg", ".png", ".ico")):
                    log_level = logging.WARNING if status_code >= 400 else logging.INFO
                    logger.log(log_level, f"{method} {path} -> {status_code} ({duration_ms:.2f}ms)")

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            request_id_ctx.reset(token_req)
            client_ip_ctx.reset(token_ip)
