from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.municipio import get_municipio_detail
from app.services.mercado import get_comercios_by_municipio

router = APIRouter(tags=["mercado"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


@router.get("/mercado/{municipio_id}")
async def get_mercado(municipio_id: int, db: DbSession):
    """Comercios locales del municipio vía api_mercadoAsturias."""
    municipio = await get_municipio_detail(db, municipio_id)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio no encontrado")
    data = await get_comercios_by_municipio(municipio["nombre"])
    return {"municipio_id": municipio_id, "municipio_nombre": municipio["nombre"], **data}
