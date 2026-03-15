from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Categoría → tipos OSM
CATEGORIA_TIPOS = {
    "comer": ["restaurant", "pub", "cafe", "bar", "fast_food"],
    "ocio": ["viewpoint", "museum", "theatre", "arts_centre", "castle", "monument", "cinema", "memorial"],
    "tiendas": ["bakery", "supermarket", "clothes", "fashion", "kiosk", "deli", "cheese", "wine"],
}

# Labels para mostrar al usuario
TIPO_LABELS = {
    # Restaurantes
    "restaurant": "Restaurante", "pub": "Pub", "cafe": "Cafetería",
    "bar": "Bar", "fast_food": "Comida rápida",
    # Ocio
    "viewpoint": "Mirador", "museum": "Museo", "theatre": "Teatro",
    "arts_centre": "Centro de arte", "castle": "Castillo",
    "monument": "Monumento", "cinema": "Cine", "memorial": "Memorial",
    # Tiendas
    "bakery": "Panadería", "supermarket": "Supermercado",
    "clothes": "Tienda de ropa", "fashion": "Moda",
    "kiosk": "Kiosco", "deli": "Delicatessen",
    "cheese": "Quesería", "wine": "Vinoteca",
}

# Emojis por categoría para los sprites de la vista 3D
CATEGORIA_EMOJIS = {
    "comer": "🍽️",
    "ocio": "🏛️",
    "tiendas": "🛍️",
}


async def get_pois_by_municipio(
    db: AsyncSession,
    municipio_id: int,
    categoria: str,
    limit: int = 30,
    offset: int = 0,
    tipo: str | None = None,
) -> tuple[list[dict], int]:
    """Return POIs for a municipio filtered by category, with pagination."""
    tipos = CATEGORIA_TIPOS.get(categoria, [])
    if not tipos:
        return [], 0

    tipo_filter = "AND TRIM(p.tipo) = :tipo" if tipo else ""
    where = f"""
        FROM puntos_interes p
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
        {tipo_filter}
    """

    params_base = {"mid": municipio_id, "tipos": tipos}
    if tipo:
        params_base["tipo"] = tipo

    count_result = await db.execute(
        text(f"SELECT COUNT(*) {where}"),
        params_base,
    )
    total = count_result.scalar() or 0

    query = text(f"""
        SELECT
            p.osm_id AS id,
            p.nombre,
            TRIM(p.tipo) AS tipo,
            ST_Y(p.geom) AS lat,
            ST_X(p.geom) AS lon,
            p.tags->>'description' AS descripcion,
            p.tags->>'website' AS website,
            p.tags->>'cuisine' AS cuisine,
            p.tags->>'opening_hours' AS opening_hours,
            COALESCE(
                NULLIF(TRIM(COALESCE(p.tags->>'addr:street','') || ' ' || COALESCE(p.tags->>'addr:housenumber','')), ''),
                p.tags->>'addr:full'
            ) AS direccion
        {where}
        ORDER BY p.nombre
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(
        query,
        {**params_base, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()
    items = [
        {
            "id": r.id,
            "nombre": r.nombre,
            "tipo": r.tipo or "",
            "tipo_label": TIPO_LABELS.get(r.tipo or "", r.tipo or ""),
            "lat": float(r.lat),
            "lon": float(r.lon),
            "descripcion": r.descripcion,
            "website": r.website,
            "cuisine": r.cuisine,
            "opening_hours": r.opening_hours or None,
            "direccion": r.direccion or None,
        }
        for r in rows
    ]
    return items, total
