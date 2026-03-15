"""
AstuGuía — Bridge service: DB context builder + system prompt + pibiCo streaming proxy.
"""
from __future__ import annotations

import asyncio
import json
import time
from functools import lru_cache
from pathlib import Path
from typing import AsyncIterator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DOCS_DIR = Path(__file__).parent.parent.parent / "docs" / "astuguia"


@lru_cache(maxsize=1)
def _load_system_base() -> str:
    """Load system.md once and cache it."""
    p = DOCS_DIR / "system.md"
    return p.read_text(encoding="utf-8") if p.exists() else ""


@lru_cache(maxsize=1)
def _build_base_prompt_cached() -> str:
    """Cache the full prompt for the common case: no municipio, no player_name."""
    base = _load_system_base()
    ctx_block = "\n\n---\n\nCONTEXTO_ACTUAL:"
    flow = (
        "\n\n---\n\nINSTRUCCIÓN DE FLUJO (chat):\n"
        "Responde la pregunta del usuario sobre Asturias. "
        "Aplica el bloque de seguridad si la pregunta sale del ámbito. "
        "Incluye [NAV:X] solo si recomiendas un municipio específico."
    )
    return base + ctx_block + flow




# ── Route table names by category ──────────────────────────────────────────
ROUTE_TABLES = {
    "ciclismo": "rutas_ciclismo",
    "senderismo": "rutas_senderismo",
    "sendas_verdes": "rutas_sendas_verdes",
    "carril_bici": "rutas_carril_bici",
    "paseos": "rutas_paseos",
}

POI_CATS = {"comer", "ocio", "tiendas", "mercado"}

# ── In-memory cache for DB context ─────────────────────────────────────────
_db_context_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes


async def _fetch_municipio(db: AsyncSession, municipio_id: int) -> Optional[dict]:
    row = await db.execute(
        text("SELECT nombre, poblacion FROM municipios WHERE id = :id"),
        {"id": municipio_id},
    )
    muni = row.fetchone()
    if muni:
        return {"id": municipio_id, "nombre": muni[0], "poblacion": muni[1]}
    return None


async def _fetch_category_routes(db: AsyncSession, municipio_id: int, categoria: str) -> Optional[dict]:
    table = ROUTE_TABLES[categoria]
    # Usar municipio_id (índice btree) en vez de ST_Intersects: 45× más rápido
    r = await db.execute(
        text(f"""
            SELECT COUNT(*) FROM {table}
            WHERE municipio_id = :mid AND distancia_m >= 30
        """),
        {"mid": municipio_id},
    )
    total = r.scalar() or 0
    ex = await db.execute(
        text(f"""
            SELECT nombre, distancia_m, dificultad FROM {table}
            WHERE municipio_id = :mid AND distancia_m >= 30
            AND nombre IS NOT NULL
            ORDER BY distancia_m DESC LIMIT 3
        """),
        {"mid": municipio_id},
    )
    return {
        "categoria": categoria,
        "total": total,
        "ejemplos": [
            {
                "nombre": row[0],
                "distancia_km": round(row[1] / 1000, 1) if row[1] else None,
                "dificultad": row[2],
            }
            for row in ex.fetchall()
        ],
    }


async def _fetch_category_pois(db: AsyncSession, municipio_id: int, categoria: str) -> Optional[dict]:
    from app.services.poi import CATEGORIA_TIPOS
    tipos = CATEGORIA_TIPOS.get(categoria, [])
    if not tipos:
        return None
    r = await db.execute(
        text("""
            SELECT COUNT(*) FROM puntos_interes p
            JOIN municipios m ON ST_Within(p.geom, m.geom)
            WHERE m.id = :mid
            AND (
                TRIM(p.tipo) = ANY(:tipos)
                OR p.tags->>'amenity' = ANY(:tipos)
                OR p.tags->>'shop' = ANY(:tipos)
                OR p.tags->>'tourism' = ANY(:tipos)
                OR p.tags->>'historic' = ANY(:tipos)
            )
            AND p.nombre IS NOT NULL
        """),
        {"mid": municipio_id, "tipos": tipos},
    )
    count = r.scalar() or 0
    return {"categoria": categoria, "total": count, "ejemplos": []}


async def build_db_context(
    db: AsyncSession,
    context_type: str,
    municipio_id: Optional[int] = None,
    categoria: Optional[str] = None,
) -> dict:
    """Fetch real DB data for context. Returns JSON-serializable dict."""
    # Check cache first (keyed by municipio+categoria, context_type added after)
    cache_key = (municipio_id, categoria)
    now = time.monotonic()
    if cache_key in _db_context_cache:
        cached_at, cached_val = _db_context_cache[cache_key]
        if now - cached_at < _CACHE_TTL:
            cached_val["context_type"] = context_type
            return cached_val

    ctx: dict = {"context_type": context_type}

    # Decide which queries to run in parallel
    needs_muni = bool(municipio_id)
    needs_cat = (
        context_type == "chat"
        and bool(municipio_id)
        and bool(categoria)
    )

    if needs_muni and needs_cat:
        if categoria in ROUTE_TABLES:
            muni, cat_data = await asyncio.gather(
                _fetch_municipio(db, municipio_id),
                _fetch_category_routes(db, municipio_id, categoria),
            )
        elif categoria in POI_CATS:
            muni, cat_data = await asyncio.gather(
                _fetch_municipio(db, municipio_id),
                _fetch_category_pois(db, municipio_id, categoria),
            )
        else:
            muni = await _fetch_municipio(db, municipio_id)
            cat_data = None
        if muni:
            ctx["municipio"] = muni
        if cat_data:
            ctx["categoria_data"] = cat_data
    elif needs_muni:
        muni = await _fetch_municipio(db, municipio_id)
        if muni:
            ctx["municipio"] = muni

    _db_context_cache[cache_key] = (now, ctx)
    return ctx


def build_system_prompt(
    context_type: str,
    db_context: dict,
    player_name: Optional[str] = None,
) -> str:
    """Build system prompt combining system.md + dynamic context + flow instruction."""
    # Fast path: no dynamic data → return cached prompt
    has_dynamic = "municipio" in db_context or "categoria_data" in db_context or player_name
    if context_type == "chat" and not has_dynamic:
        return _build_base_prompt_cached()

    base = _load_system_base()

    parts = [base]

    # Add dynamic DB context block
    ctx_lines = ["\n\n---\n\nCONTEXTO_ACTUAL:"]
    if "municipio" in db_context:
        m = db_context["municipio"]
        ctx_lines.append(
            f"- Municipio: {m['nombre']} (id={m['id']}, {m.get('poblacion', '?')} hab.)"
        )
    if player_name:
        ctx_lines.append(f"- Nombre del usuario: {player_name}")
    if "categoria_data" in db_context:
        cd = db_context["categoria_data"]
        ctx_lines.append(
            f"- Categoría activa: {cd['categoria']} — {cd['total']} disponibles en este concejo"
        )
        for ej in cd.get("ejemplos", []):
            dist = f"{ej['distancia_km']} km" if ej.get("distancia_km") else ""
            dif = f"dificultad {ej['dificultad']}/5" if ej.get("dificultad") else ""
            extras = ", ".join(filter(None, [dist, dif]))
            ctx_lines.append(f"  · {ej['nombre']} ({extras})")
    parts.append("\n".join(ctx_lines))

    # Add flow instruction based on context_type
    FLOW_INSTRUCTIONS = {
        "chat": (
            "Responde la pregunta del usuario sobre Asturias. "
            "Aplica el bloque de seguridad si la pregunta sale del ámbito. "
            "Incluye [NAV:X] solo si recomiendas un municipio específico."
        ),
    }
    instruction = FLOW_INSTRUCTIONS.get(context_type, FLOW_INSTRUCTIONS["chat"])
    parts.append(
        f"\n\n---\n\nINSTRUCCIÓN DE FLUJO ({context_type}):\n{instruction}"
    )

    return "".join(parts)


import httpx

# Cliente HTTP persistente — reutiliza la conexión TLS con pibiCo
# Evita el overhead de DNS+TCP+TLS en cada petición (~150-400ms)
_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, keepalive_expiry=30),
        )
    return _http_client


async def stream_pibico(
    message: str,
    system_prompt: str,
    conversation_id: Optional[str],
    settings,
) -> AsyncIterator[tuple[str, Optional[str]]]:
    """
    Proxy streaming SSE to pibiCo.
    Yields (chunk_str, new_conversation_id_or_none).
    new_conversation_id is yielded only once on the first matching chunk.
    """
    headers = {
        "X-API-Key": settings.chat_api_key,
        "Content-Type": "application/json",
    }
    payload: dict = {
        "message": message,
        "notebook_id": settings.chat_notebook_id,
        "stream": True,
        "system_prompt": system_prompt,
    }
    if conversation_id:
        payload["conversation_id"] = conversation_id

    base = settings.chat_base_url.rstrip("/")
    url = f"{base}/api/v1/chat/completions"

    new_conv_id: Optional[str] = None
    conv_id_emitted = False

    client = _get_http_client()
    async with client.stream("POST", url, headers=headers, json=payload) as resp:
            # Try to get conversation_id from response headers first
            header_conv_id = resp.headers.get("X-Conversation-Id")

            async for line in resp.aiter_lines():
                trimmed = line.strip()
                if not trimmed:
                    yield ("\n", None)
                    continue
                if trimmed == "data: [DONE]":
                    break
                if not trimmed.startswith("data: "):
                    yield (line + "\n", None)
                    continue

                # Try to extract conversation_id from the JSON payload
                conv_to_emit: Optional[str] = None
                try:
                    data_str = trimmed[6:]
                    parsed = json.loads(data_str)
                    if not conv_id_emitted:
                        cid = (
                            parsed.get("conversation_id")
                            or header_conv_id
                        )
                        if cid:
                            new_conv_id = cid
                            conv_to_emit = cid
                            conv_id_emitted = True
                except Exception:
                    pass

                yield (line + "\n", conv_to_emit)
