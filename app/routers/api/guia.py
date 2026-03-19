"""
AstuGuía — Bridge endpoint: POST /api/guia/chat
Proxies requests to pibiCo API, injecting DB context and system prompt server-side.
"""
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.db.session import get_db_session
from app.services.guia import build_db_context, build_system_prompt, stream_openai_agent

router = APIRouter(prefix="/guia", tags=["guia"])

# ── Constantes recomendaciones ──
ZONA_COSTERO_IDS = [4, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 35, 38, 40, 54, 55, 68, 69, 73, 76]

TIPO_LABELS_REC = {
    "restaurant": "Restaurante",
    "cafe": "Cafetería",
    "bar": "Bar / Sidrería",
    "pub": "Pub",
    "fast_food": "Comida rápida",
}

SubtipoType = Literal["restaurant", "cafe", "bar", "pub", "fast_food"]
ZonaType = Literal["costero", "interior", "sorpresa"]

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


class GuiaChatRequest(BaseModel):
    message: str
    context_type: str = "chat"
    municipio_id: Optional[int] = None
    municipio_nombre: Optional[str] = None
    categoria: Optional[str] = None
    wizard_state: Optional[dict] = None
    poi_id: Optional[int] = None
    conversation_id: Optional[str] = None
    player_name: Optional[str] = None


@router.post("/chat")
async def guia_chat(
    req: GuiaChatRequest,
    db: DbSession,
    settings: Settings = Depends(get_settings),
):
    """
    AstuGuía — OpenAI agent with tool use.
    Builds system prompt server-side, then runs the agent loop with BD tools.
    """
    async def generate():
        db_context = await build_db_context(
            db,
            context_type=req.context_type,
            municipio_id=req.municipio_id,
            categoria=req.categoria,
        )
        system_prompt = build_system_prompt(
            req.context_type,
            db_context,
            player_name=req.player_name,
            message=req.message,
        )
        async for chunk in stream_openai_agent(
            req.message, system_prompt, req.conversation_id, settings,
            municipio_id=req.municipio_id,
            municipio_nombre=req.municipio_nombre,
            categoria=req.categoria,
            player_name=req.player_name,
        ):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/recommendations")
async def guia_recommendations(
    db: DbSession,
    subtipo: SubtipoType = Query(default="restaurant"),
    zona: ZonaType = Query(default="sorpresa"),
    cuisine: Optional[str] = Query(default=None),
    municipio: Optional[str] = Query(default=None),
):
    """
    Devuelve top 3 municipios recomendados según tipo de establecimiento, zona y cocina.
    Consulta POIs reales de la BD asturiasmap.
    """
    tipo_label = TIPO_LABELS_REC.get(subtipo, subtipo.capitalize())

    # Si se especifica municipio → buscar por nombre
    municipio_id = None
    if municipio:
        mq = await db.execute(
            text("SELECT id FROM municipios WHERE nombre ILIKE :pat LIMIT 1"),
            {"pat": f"%{municipio.strip()}%"},
        )
        row = mq.fetchone()
        if row:
            municipio_id = row[0]

    async def run_query(zona_ids: Optional[list[int]], muni_id: Optional[int]) -> list[dict]:
        conditions = [
            "(TRIM(p.tipo) = :subtipo OR p.tags->>'amenity' = :subtipo)",
            "p.nombre IS NOT NULL",
        ]
        params: dict = {"subtipo": subtipo}

        if cuisine == "regional":
            conditions.append("p.tags->>'cuisine' = 'regional'")
        elif cuisine == "other":
            conditions.append("(p.tags->>'cuisine' IS NULL OR p.tags->>'cuisine' != 'regional')")

        if muni_id is not None:
            conditions.append("m.id = :muni_id")
            params["muni_id"] = muni_id
        elif zona_ids is not None:
            conditions.append("m.id = ANY(:zona_ids)")
            params["zona_ids"] = zona_ids

        where_clause = " AND ".join(conditions)
        q = text(f"""
            SELECT m.id, m.nombre, COUNT(*) AS num_pois
            FROM puntos_interes p
            JOIN municipios m ON ST_Within(p.geom, m.geom)
            WHERE {where_clause}
            GROUP BY m.id, m.nombre
            ORDER BY num_pois DESC
            LIMIT 5
        """)
        result = await db.execute(q, params)
        return [
            {"id": r.id, "nombre": r.nombre, "num_pois": int(r.num_pois), "tipo_label": tipo_label}
            for r in result.fetchall()
        ]

    # Determinar zona_ids
    if zona == "costero":
        zona_ids = ZONA_COSTERO_IDS
    elif zona == "interior":
        # Todos los ids que NO son costeros — obtenemos de la BD
        all_ids_result = await db.execute(
            text("SELECT id FROM municipios WHERE id != ALL(:coastal)"),
            {"coastal": ZONA_COSTERO_IDS},
        )
        zona_ids = [r[0] for r in all_ids_result.fetchall()]
    else:
        zona_ids = None  # sorpresa → sin filtro

    # Si tenemos municipio_id → query por municipio (ignora zona)
    if municipio_id is not None:
        rows = await run_query(None, municipio_id)
        if rows:
            return rows
        # Fallback: sin filtro municipio, con zona
        rows = await run_query(zona_ids, None)
        return rows

    rows = await run_query(zona_ids, None)
    return rows
