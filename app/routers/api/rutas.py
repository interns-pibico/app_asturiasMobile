from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.ruta import get_rutas_by_municipio

router = APIRouter(tags=["rutas"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]
TipoType = Literal["ciclismo", "senderismo", "sendas_verdes", "carril_bici", "paseos"]


@router.get("/rutas/{municipio_id}")
async def get_rutas(
    municipio_id: int,
    db: DbSession,
    response: Response,
    tipo: TipoType = Query(default="senderismo"),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Rutas de un municipio filtradas por tipo, con paginación."""
    items, total = await get_rutas_by_municipio(db, municipio_id, tipo, limit, offset)
    response.headers["X-Total-Count"] = str(total)
    return {"municipio_id": municipio_id, "tipo": tipo, "total": total, "items": items}
