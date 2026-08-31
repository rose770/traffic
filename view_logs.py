#!/usr/bin/env python3
"""
Interactive CLI Log Viewer and Telemetry Monitor for Amanah Madinah Platform.

Usage:
    python view_logs.py                 # View latest 50 logs
    python view_logs.py --level ERROR   # Filter error logs only
    python view_logs.py --search CAD    # Search logs containing keyword
    python view_logs.py --follow        # Live stream real-time logs (like tail -f)
    python view_logs.py --metrics       # View system performance metrics & health
"""

import sys
import time
import argparse
import requests

# Terminal ANSI Colors
COLORS = {
    "DEBUG": "\033[36m",      # Cyan
    "INFO": "\033[32m",       # Green
    "WARNING": "\033[33m",    # Yellow
    "ERROR": "\033[31m",      # Red
    "CRITICAL": "\033[1;31m", # Bold Red
    "RESET": "\033[0m",
    "DIM": "\033[2m",
    "BOLD": "\033[1m"
}


def print_log_entry(entry: dict):
    level = entry.get("level", "INFO")
    color = COLORS.get(level, COLORS["RESET"])
    ts = entry.get("timestamp", "").replace("T", " ")[:19]
    logger_name = entry.get("logger", "app")
    req_id = entry.get("request_id", "-")
    req_str = f" [{COLORS['DIM']}req:{req_id[:8]}{COLORS['RESET']}]" if req_id != "-" else ""
    msg = entry.get("message", "")

    print(f"{COLORS['DIM']}{ts}{COLORS['RESET']} {color}{level:<7}{COLORS['RESET']} {COLORS['DIM']}{logger_name:<20}{COLORS['RESET']}{req_str} {msg}")

    if entry.get("has_exception") or "exception_msg" in entry:
        exc_type = entry.get("exception_type", "Exception")
        exc_msg = entry.get("exception_msg", "")
        print(f"   {COLORS['ERROR']}↳ {exc_type}: {exc_msg}{COLORS['RESET']}")


def show_metrics(base_url: str):
    try:
        res_h = requests.get(f"{base_url}/api/system/health", timeout=3)
        res_m = requests.get(f"{base_url}/api/system/metrics", timeout=3)

        if res_h.status_code != 200 or res_m.status_code != 200:
            print(f"{COLORS['ERROR']}Failed to fetch system metrics.{COLORS['RESET']}")
            return

        health = res_h.json()
        metrics = res_m.json().get("metrics", {})

        print(f"\n{COLORS['BOLD']}=== Amanah Madinah System Telemetry & Health ==={COLORS['RESET']}")
        print(f"Overall Status: {COLORS['INFO'] if health.get('status') == 'healthy' else COLORS['WARNING']}{health.get('status', 'unknown').upper()}{COLORS['RESET']}")
        print(f"Uptime:         {metrics.get('uptime_seconds', 0):.1f}s")
        print(f"Total Requests: {metrics.get('total_requests', 0)} (Active: {metrics.get('active_requests', 0)})")
        print(f"Avg Latency:    {metrics.get('avg_response_time_ms', 0):.2f} ms")
        print(f"Error Rate:     {metrics.get('error_rate_pct', 0):.2f}%")
        print(f"RSS Memory:     {health.get('resources', {}).get('rss_memory_mb', 0)} MB")
        print(f"\n{COLORS['BOLD']}Subsystems:{COLORS['RESET']}")
        for name, sub in health.get("subsystems", {}).items():
            st = sub.get("status", "unknown")
            st_color = COLORS["INFO"] if st == "healthy" else COLORS["ERROR"]
            print(f" • {name:<15}: {st_color}{st.upper()}{COLORS['RESET']}")
        print()
    except Exception as e:
        print(f"{COLORS['ERROR']}Error connecting to server: {e}{COLORS['RESET']}")


def main():
    parser = argparse.ArgumentParser(description="Amanah Madinah Real-Time Log Viewer")
    parser.add_argument("--url", default="http://127.0.0.1:5000", help="Backend base URL")
    parser.add_argument("--level", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], help="Filter by log level")
    parser.add_argument("--search", help="Search keyword in logs")
    parser.add_argument("--limit", type=int, default=50, help="Number of logs to fetch (default: 50)")
    parser.add_argument("--follow", "-f", action="store_true", help="Continuously poll and stream new logs")
    parser.add_argument("--metrics", "-m", action="store_true", help="Display system performance metrics")

    args = parser.parse_args()

    if args.metrics:
        show_metrics(args.url)
        return

    print(f"\n{COLORS['BOLD']}--- Amanah Madinah System Log Console [{args.url}] ---{COLORS['RESET']}")
    if args.level:
        print(f"Filter Level: {COLORS['WARNING']}{args.level}{COLORS['RESET']}")
    if args.search:
        print(f"Filter Search: '{args.search}'")
    print("-" * 75)

    seen_ids = set()

    def fetch_and_print():
        params = {"limit": args.limit}
        if args.level:
            params["level"] = args.level
        if args.search:
            params["search"] = args.search

        try:
            res = requests.get(f"{args.url}/api/system/logs", params=params, timeout=3)
            if res.status_code == 200:
                logs = res.json().get("logs", [])
                # Show in chronological order (oldest to newest)
                for entry in reversed(logs):
                    entry_id = entry.get("id") or (entry.get("timestamp") + entry.get("message"))
                    if entry_id not in seen_ids:
                        seen_ids.add(entry_id)
                        print_log_entry(entry)
            else:
                print(f"{COLORS['ERROR']}HTTP {res.status_code}: Failed to query logs{COLORS['RESET']}")
        except requests.exceptions.ConnectionError:
            print(f"{COLORS['ERROR']}Unable to connect to backend at {args.url}. Is it running?{COLORS['RESET']}")

    fetch_and_print()

    if args.follow:
        print(f"{COLORS['DIM']}Streaming logs in real-time (Press Ctrl+C to stop)...{COLORS['RESET']}")
        try:
            while True:
                time.sleep(1.5)
                fetch_and_print()
        except KeyboardInterrupt:
            print(f"\n{COLORS['DIM']}Log stream stopped.{COLORS['RESET']}")


if __name__ == "__main__":
    main()
