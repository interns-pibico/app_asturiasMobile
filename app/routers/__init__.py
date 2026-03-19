from fastapi import APIRouter

from app.routers.api.municipios import router as municipios_router
from app.routers.api.pois import router as pois_router
from app.routers.api.rutas import router as rutas_router
from app.routers.api.mercado import router as mercado_router
from app.routers.api.guia import router as guia_router
from app.routers.api.weather import router as weather_router
from app.routers.v1.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/api/v1")
api_router.include_router(municipios_router, prefix="/api")
api_router.include_router(pois_router, prefix="/api")
api_router.include_router(rutas_router, prefix="/api")
api_router.include_router(mercado_router, prefix="/api")
api_router.include_router(guia_router, prefix="/api")
api_router.include_router(weather_router, prefix="/api")
