"""
Amanah Madinah Platform Server Launcher.
"""
import sys
import uvicorn
from app.config import PORT, HOST
from main import app

if __name__ == "__main__":
    if sys.stdout and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
    if sys.stderr and hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(line_buffering=True)

    print("===========================================================", flush=True)
    print(" Amanah Madinah Smart Construction & Traffic Platform", flush=True)
    print(f" Serving at: http://{HOST}:{PORT}", flush=True)
    print(f" Telemetry:  http://{HOST}:{PORT}/api/system/health", flush=True)
    print(f" Logs API:   http://{HOST}:{PORT}/api/system/logs", flush=True)
    print("===========================================================", flush=True)

    uvicorn.run(app, host=HOST, port=PORT, log_config=None, install_signal_handlers=False)
