import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_all_municipios(db: AsyncSession) -> list[dict]:
    """Return list of all municipios with centroid and basic info."""
    query = text("""
        SELECT
            id,
            nombre,
            poblacion,
            ST_Y(ST_Centroid(geom)) AS centroid_lat,
            ST_X(ST_Centroid(geom)) AS centroid_lon
        FROM municipios
        ORDER BY nombre
    """)
    result = await db.execute(query)
    rows = result.fetchall()
    return [
        {
            "id": r.id,
            "nombre": r.nombre,
            "poblacion": r.poblacion,
            "centroid_lat": float(r.centroid_lat) if r.centroid_lat else None,
            "centroid_lon": float(r.centroid_lon) if r.centroid_lon else None,
        }
        for r in rows
    ]


async def get_municipio_detail(db: AsyncSession, municipio_id: int) -> dict | None:
    """Return detail for a single municipio including simplified GeoJSON geometry."""
    query = text("""
        SELECT
            id,
            nombre,
            poblacion,
            ST_Y(ST_Centroid(geom)) AS centroid_lat,
            ST_X(ST_Centroid(geom)) AS centroid_lon,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001)) AS geojson
        FROM municipios
        WHERE id = :mid
    """)
    result = await db.execute(query, {"mid": municipio_id})
    row = result.fetchone()
    if not row:
        return None
    return {
        "id": row.id,
        "nombre": row.nombre,
        "poblacion": row.poblacion,
        "centroid_lat": float(row.centroid_lat) if row.centroid_lat else None,
        "centroid_lon": float(row.centroid_lon) if row.centroid_lon else None,
        "geojson": json.loads(row.geojson) if row.geojson else None,
    }


async def get_all_municipios_geojson(db: AsyncSession) -> dict:
    """Return FeatureCollection GeoJSON of all municipios (simplified for map)."""
    query = text("""
        SELECT
            id,
            nombre,
            poblacion,
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.002)) AS geojson
        FROM municipios
        ORDER BY nombre
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    features = []
    for r in rows:
        if r.geojson:
            features.append({
                "type": "Feature",
                "id": r.id,
                "properties": {
                    "id": r.id,
                    "nombre": r.nombre,
                    "poblacion": r.poblacion,
                },
                "geometry": json.loads(r.geojson),
            })

    return {"type": "FeatureCollection", "features": features}
