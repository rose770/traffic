import sys
import os
import uvicorn
from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure line-buffering on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True, write_through=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True, write_through=True)

from app.config import PORT, HOST, DIST_DIR
from app.database import initialize_db
from app.logging_config import setup_logging, get_logger
from app.error_handlers import register_error_handlers
from app.middleware import RequestTracingMiddleware
from app.routers import (
    auth_router,
    permits_router,
    reports_router,
    cad_router,
    geotiff_router,
    ai_router,
    system_router
)

# 1. Initialize logging and database schema
setup_logging()
initialize_db()

logger = get_logger("app.main")

# 2. Create FastAPI instance
app = FastAPI(
    title="Amanah Madinah Traffic & Construction Management Platform",
    description="Python Backend with Advanced Logging, Telemetry & Geospatial CAD Pipeline",
    version="1.1.0"
)

# 3. Enable CORS & Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"]
)
register_error_handlers(app)
app.add_middleware(RequestTracingMiddleware)

# 4. Include API Routers
app.include_router(auth_router)
app.include_router(permits_router)
app.include_router(reports_router)
app.include_router(cad_router)
app.include_router(geotiff_router)
app.include_router(ai_router)
app.include_router(system_router)

# 5. Mount Static Assets & SPA Routing
assets_dir = DIST_DIR / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/favicon.svg", include_in_schema=False)
def favicon_svg():
    fpath = DIST_DIR / "favicon.svg"
    return FileResponse(str(fpath)) if fpath.exists() else FileResponse(str(DIST_DIR / "index.html"))

@app.get("/icons.svg", include_in_schema=False)
def icons_svg():
    fpath = DIST_DIR / "icons.svg"
    return FileResponse(str(fpath)) if fpath.exists() else FileResponse(str(DIST_DIR / "index.html"))

@app.get("/logo.jpg", include_in_schema=False)
def logo_jpg():
    fpath = DIST_DIR / "logo.jpg"
    return FileResponse(str(fpath)) if fpath.exists() else FileResponse(str(DIST_DIR / "index.html"))

@app.get("/", include_in_schema=False)
def serve_root():
    return FileResponse(str(DIST_DIR / "index.html"))

@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str):
    direct_file = DIST_DIR / full_path
    if full_path and direct_file.is_file():
        return FileResponse(str(direct_file))
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Amanah Madinah API is running. Frontend dist/ not found."}

if __name__ == "__main__":
    server_port = int(os.getenv("PORT", "5000"))
    server_host = os.getenv("HOST", "127.0.0.1")
    print(f"Starting Amanah Madinah server on http://{server_host}:{server_port}", flush=True)
    config = uvicorn.Config(app=app, host=server_host, port=server_port, log_level="info")
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    server.run()
