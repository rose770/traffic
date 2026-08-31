"""
Production Logging and Telemetry Subsystem for Amanah Madinah Platform.

Features:
- Contextual Request Tracing (UUID4 Request IDs via contextvars)
- Structured JSON Formatter for log management & SIEM integration
- ANSI Colored Console Formatter for interactive developer clarity
- Rotating File Handlers (app.log, error.log)
- Thread-safe Memory Ring Buffer for live API query & system dashboard
"""

import os
import sys
import json
import time
import logging
import threading
from pathlib import Path
from datetime import datetime, timezone
from contextvars import ContextVar
from typing import Dict, Any, List, Optional
from collections import deque

# Context variable for cross-correlating asynchronous request logs
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
client_ip_ctx: ContextVar[str] = ContextVar("client_ip", default="-")

# Directory for persistent log files
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(parents=True, exist_ok=True)


# ----------------------------------------------------------------------
# 1. Custom JSON Log Formatter
# ----------------------------------------------------------------------
class StructuredJSONFormatter(logging.Formatter):
    """Outputs log events as single-line JSON objects with standard telemetry fields."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get(),
            "client_ip": client_ip_ctx.get(),
            "process_id": record.process,
            "thread_id": record.thread,
            "source": f"{record.filename}:{record.lineno}"
        }

        # Include custom extra metadata if passed in logging call
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_entry["metadata"] = record.extra_data

        # Include exception trace if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Exception",
                "message": str(record.exc_info[1]) if record.exc_info[1] else "",
                "traceback": self.formatException(record.exc_info)
            }

        return json.dumps(log_entry, ensure_ascii=False)


# ----------------------------------------------------------------------
# 2. Colored Console Formatter
# ----------------------------------------------------------------------
class ColoredConsoleFormatter(logging.Formatter):
    """ANSI colored formatter for human-readable terminal output."""

    LEVEL_COLORS = {
        logging.DEBUG: "\033[36m",     # Cyan
        logging.INFO: "\033[32m",      # Green
        logging.WARNING: "\033[33m",   # Yellow
        logging.ERROR: "\033[31m",     # Red
        logging.CRITICAL: "\033[1;31m" # Bold Red
    }
    RESET = "\033[0m"
    DIM = "\033[2m"
    BOLD = "\033[1m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelno, self.RESET)
        time_str = datetime.fromtimestamp(record.created).strftime("%H:%M:%S.%f")[:-3]
        req_id = request_id_ctx.get()
        req_str = f" [{self.DIM}req:{req_id[:8]}{self.RESET}]" if req_id != "-" else ""

        level_badge = f"{color}{record.levelname:<7}{self.RESET}"
        logger_name = f"{self.DIM}{record.name}{self.RESET}"
        msg = record.getMessage()

        formatted = f"{self.DIM}{time_str}{self.RESET} {level_badge} {logger_name}{req_str} {msg}"

        if record.exc_info:
            formatted += f"\n{color}{self.formatException(record.exc_info)}{self.RESET}"

        return formatted


# ----------------------------------------------------------------------
# 3. Thread-Safe In-Memory Ring Buffer Handler
# ----------------------------------------------------------------------
class MemoryLogHandler(logging.Handler):
    """Retains the most recent log records in memory for real-time dashboard & API inspection."""

    def __init__(self, capacity: int = 500):
        super().__init__()
        self.capacity = capacity
        self.buffer: deque = deque(maxlen=capacity)
        self.lock = threading.RLock()

    def emit(self, record: logging.LogRecord):
        try:
            entry = {
                "id": f"{int(record.created * 1000)}-{record.msecs:.0f}",
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "request_id": request_id_ctx.get(),
                "client_ip": client_ip_ctx.get(),
                "filename": record.filename,
                "lineno": record.lineno,
                "has_exception": bool(record.exc_info)
            }
            if record.exc_info:
                entry["exception_type"] = record.exc_info[0].__name__ if record.exc_info[0] else "Exception"
                entry["exception_msg"] = str(record.exc_info[1]) if record.exc_info[1] else ""

            if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
                entry["metadata"] = record.extra_data

            with self.lock:
                self.buffer.append(entry)
        except Exception:
            self.handleError(record)

    def get_logs(
        self,
        level: Optional[str] = None,
        limit: int = 100,
        search: Optional[str] = None,
        request_id: Optional[str] = None,
        logger_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves and filters recent log entries."""
        with self.lock:
            logs = list(self.buffer)

        # Apply filters
        if level:
            level_upper = level.upper()
            logs = [l for l in logs if l["level"] == level_upper]

        if request_id:
            logs = [l for l in logs if request_id in l.get("request_id", "")]

        if logger_name:
            logs = [l for l in logs if logger_name.lower() in l.get("logger", "").lower()]

        if search:
            search_lower = search.lower()
            logs = [
                l for l in logs
                if search_lower in l.get("message", "").lower()
                or search_lower in l.get("logger", "").lower()
                or search_lower in l.get("request_id", "").lower()
            ]

        # Return most recent first
        return list(reversed(logs[-limit:]))

    def clear(self):
        """Clears the in-memory log buffer."""
        with self.lock:
            self.buffer.clear()


# Global in-memory log handler instance
memory_log_handler = MemoryLogHandler(capacity=1000)


_logging_initialized = False

# ----------------------------------------------------------------------
# 4. Master Logging Setup
# ----------------------------------------------------------------------
def setup_logging(level: int = logging.INFO):
    """Configures application-wide logging with Console, File, and In-Memory handlers."""
    global _logging_initialized
    if _logging_initialized:
        return
    _logging_initialized = True

    # Configure app namespace logger
    app_logger = logging.getLogger("app")
    app_logger.setLevel(level)
    app_logger.propagate = False

    # 1. Colored Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(ColoredConsoleFormatter())
    app_logger.addHandler(console_handler)

    # 2. In-Memory Ring Buffer Handler for Live Telemetry API
    app_logger.addHandler(memory_log_handler)

    app_logger.info("Advanced Logging & Telemetry Engine initialized successfully.")


# Convenience module logger factory
def get_logger(name: str) -> logging.Logger:
    """Returns a named logger under app namespace."""
    if not name.startswith("app"):
        name = f"app.{name}"
    return logging.getLogger(name)
