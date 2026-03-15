import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DIFICULTAD_LABELS = {
    "easy": "Fácil",
    "moderate": "Moderado",
    "hard": "Difícil",
    "expert": "Experto",
}


async def get_rutas_by_municipio(
    db: AsyncSession,
    municipio_id: int,
    tipo: str,
    limit: int = 30,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Rutas de un municipio por tipo, con paginación."""
    _TABLE_MAP = {
        "ciclismo":      "rutas_ciclismo",
        "senderismo":    "rutas_senderismo",
        "sendas_verdes": "rutas_sendas_verdes",
        "carril_bici":   "rutas_carril_bici",
        "paseos":        "rutas_paseos",
    }
    table = _TABLE_MAP.get(tipo, "rutas_senderismo")

    extra_filter = ""
    if tipo == "paseos":
        extra_filter = "AND (r.distancia_m IS NULL OR r.distancia_m >= 30) AND ST_NPoints(r.geom) >= 3"

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM {table} r WHERE r.municipio_id = :mid {extra_filter}"),
        {"mid": municipio_id},
    )
    total = count_result.scalar() or 0

    query = text(f"""
        SELECT
            r.id, r.osm_id, r.nombre, r.tipo, r.distancia_m, r.dificultad,
            ST_Y(ST_Centroid(r.geom)) AS lat,
            ST_X(ST_Centroid(r.geom)) AS lon,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(r.geom, 0.0001)) AS coords_geojson,
            r.tags->>'network'     AS network,
            r.tags->>'surface'     AS surface,
            r.tags->>'description' AS descripcion,
            r.tags->>'website'     AS website,
            r.tags->>'operator'    AS operador,
            r.tags->>'from'        AS desde,
            r.tags->>'to'          AS hasta,
            r.ascenso_m,
            r.descenso_m,
            r.wikidata_desc
        FROM {table} r
        WHERE r.municipio_id = :mid {extra_filter}
        ORDER BY r.distancia_m DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    result = await db.execute(query, {"mid": municipio_id, "limit": limit, "offset": offset})
    rows = result.fetchall()
    items = [
        {
            "id": r.id,
            "osm_id": r.osm_id,
            "nombre": r.nombre or "Ruta sin nombre",
            "tipo": r.tipo or "",
            "distancia_m": float(r.distancia_m) if r.distancia_m else None,
            "distancia_km": round(float(r.distancia_m) / 1000, 1) if r.distancia_m else None,
            "dificultad": r.dificultad or "",
            "dificultad_label": DIFICULTAD_LABELS.get(r.dificultad or "", r.dificultad or ""),
            "lat": float(r.lat) if r.lat else None,
            "lon": float(r.lon) if r.lon else None,
            "coords": json.loads(r.coords_geojson)["coordinates"] if r.coords_geojson else [],
            "network":     r.network or "",
            "surface":     r.surface or "",
            "descripcion": r.descripcion or "",
            "website":     r.website or "",
            "operador":    r.operador or "",
            "desde":       r.desde or "",
            "hasta":       r.hasta or "",
            "ascenso_m":   round(r.ascenso_m) if r.ascenso_m else None,
            "descenso_m":  round(r.descenso_m) if r.descenso_m else None,
            "wikidata_desc": r.wikidata_desc or "",
        }
        for r in rows
    ]
    return items, total
