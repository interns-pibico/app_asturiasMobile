from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.municipio import (
    get_all_municipios,
    get_all_municipios_geojson,
    get_municipio_detail,
)

router = APIRouter(tags=["municipios"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("/municipios")
async def list_municipios(db: DbSession):
    """Lista todos los municipios con centroide y población."""
    return await get_all_municipios(db)


@router.get("/municipios/geojson")
async def municipios_geojson(db: DbSession):
    """FeatureCollection GeoJSON con todos los municipios (simplificado para Leaflet)."""
    return await get_all_municipios_geojson(db)


@router.get("/municipios/{municipio_id}")
async def get_municipio(municipio_id: int, db: DbSession):
    """Detalle de un municipio con geometría GeoJSON."""
    data = await get_municipio_detail(db, municipio_id)
    if not data:
        raise HTTPException(status_code=404, detail="Municipio no encontrado")
    return data
