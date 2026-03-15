from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.poi import get_pois_by_municipio

router = APIRouter(tags=["pois"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]

CategoriaType = Literal["comer", "ocio", "tiendas"]


@router.get("/pois/{municipio_id}")
async def get_pois(
    municipio_id: int,
    db: DbSession,
    response: Response,
    categoria: CategoriaType = Query(default="comer"),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    tipo: str | None = Query(default=None),
):
    """POIs de un municipio filtrados por categoría, con paginación."""
    items, total = await get_pois_by_municipio(db, municipio_id, categoria, limit, offset, tipo=tipo)
    response.headers["X-Total-Count"] = str(total)
    return {
        "municipio_id": municipio_id,
        "categoria": categoria,
        "total": total,
        "items": items,
    }
