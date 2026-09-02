"""Amanah Madinah API Routers"""
from app.routers.auth import router as auth_router
from app.routers.permits import router as permits_router
from app.routers.reports import router as reports_router
from app.routers.cad import router as cad_router
from app.routers.geotiff import router as geotiff_router
from app.routers.ai import router as ai_router
from app.routers.system import router as system_router
from app.routers.roads import router as roads_router

__all__ = [
    "auth_router",
    "permits_router",
    "reports_router",
    "cad_router",
    "geotiff_router",
    "ai_router",
    "system_router",
    "roads_router"
]
