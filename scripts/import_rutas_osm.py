#!/usr/bin/env python3
"""
Import rutas (ciclismo/senderismo) from Overpass API into asturiasmap.

Usage:
    python scripts/import_rutas_osm.py --tipo ciclismo
    python scripts/import_rutas_osm.py --tipo senderismo
"""
import argparse
import asyncio
import json
import math
import sys

import asyncpg
import httpx

DB_DSN = "postgresql://asturiasuser:asturiasuser@localhost/asturiasmap"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

QUERIES = {
    "ciclismo": """
[out:json][timeout:120];
area["ISO3166-2"="ES-AS"]["admin_level"="4"]->.asturias;
relation[type=route][route=bicycle](area.asturias);
out geom;
""",
    "senderismo": """
[out:json][timeout:120];
area["ISO3166-2"="ES-AS"]["admin_level"="4"]->.asturias;
relation[type=route][route~"hiking|walking|foot"](area.asturias);
out geom;
""",
    "sendas_verdes": """
[out:json][timeout:120];
area["ISO3166-2"="ES-AS"]["admin_level"="4"]->.asturias;
relation[type=route][route~"bicycle|foot"][name~"senda|verde|parque|natural|monte|bosque",i](area.asturias);
out geom;
""",
    "carril_bici": """
[out:json][timeout:120];
area["ISO3166-2"="ES-AS"]["admin_level"="4"]->.asturias;
(
  way[highway=cycleway](area.asturias);
  way[highway=path][bicycle=designated](area.asturias);
);
out geom;
""",
    "paseos": """
[out:json][timeout:120];
area["ISO3166-2"="ES-AS"]["admin_level"="4"]->.asturias;
(
  way[leisure=promenade](area.asturias);
  way[highway=pedestrian][name~"paseo|rambla|malecón|esplanad|alameda|bulevar|ribera|litoral|muro|playa",i](area.asturias);
  way[highway~"footway|path"][name~"paseo|rambla|malecón|esplanad|alameda|bulevar|ribera|litoral|muro|playa",i](area.asturias);
  relation[type=route][route~"foot|walking"][name~"paseo|rambla|litoral|ribera|muro",i](area.asturias);
);
out geom;
""",
}


def way_to_linestring(element: dict) -> str | None:
    """Build WKT LINESTRING from a way element's geometry."""
    geometry = element.get("geometry", [])
    if len(geometry) < 2:
        return None
    pts = ", ".join(f"{pt['lon']} {pt['lat']}" for pt in geometry)
    return f"LINESTRING({pts})"


def extract_distancia_way(tags: dict, geometry: list) -> float | None:
    """Compute distance from tags or haversine sum over way geometry."""
    dist_tag = tags.get("distance") or tags.get("length")
    if dist_tag:
        try:
            val = float(dist_tag.replace("km", "").replace("m", "").strip())
            return val * 1000 if val < 500 else val
        except ValueError:
            pass
    total = 0.0
    for i in range(1, len(geometry)):
        p1, p2 = geometry[i - 1], geometry[i]
        dlat = math.radians(p2["lat"] - p1["lat"])
        dlon = math.radians(p2["lon"] - p1["lon"])
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(p1["lat"])) *
             math.cos(math.radians(p2["lat"])) *
             math.sin(dlon / 2) ** 2)
        total += 6371000 * 2 * math.asin(math.sqrt(a))
    return total if total > 0 else None


def coords_to_linestring(members: list) -> str | None:
    """Extract coordinates from relation members and build WKT LINESTRING."""
    coords = []
    for m in members:
        if m.get("type") != "way":
            continue
        geometry = m.get("geometry", [])
        for pt in geometry:
            lat = pt.get("lat")
            lon = pt.get("lon")
            if lat is not None and lon is not None:
                coords.append((lon, lat))

    if len(coords) < 2:
        return None

    pts = ", ".join(f"{lon} {lat}" for lon, lat in coords)
    return f"LINESTRING({pts})"


def extract_distancia(tags: dict, members: list) -> float | None:
    """Try to compute distance from distance tag or member geometries."""
    dist_tag = tags.get("distance") or tags.get("length")
    if dist_tag:
        try:
            val = float(dist_tag.replace("km", "").replace("m", "").strip())
            # If value looks like km (< 1000), convert
            if val < 500:
                return val * 1000
            return val
        except ValueError:
            pass

    # Compute from geometry
    total = 0.0
    for m in members:
        if m.get("type") != "way":
            continue
        geometry = m.get("geometry", [])
        for i in range(1, len(geometry)):
            p1 = geometry[i - 1]
            p2 = geometry[i]
            dlat = math.radians(p2["lat"] - p1["lat"])
            dlon = math.radians(p2["lon"] - p1["lon"])
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(p1["lat"])) * math.cos(math.radians(p2["lat"])) * math.sin(dlon / 2) ** 2
            total += 6371000 * 2 * math.asin(math.sqrt(a))

    return total if total > 0 else None


async def find_municipio_id(conn: asyncpg.Connection, wkt: str) -> int | None:
    row = await conn.fetchrow(
        "SELECT id FROM municipios WHERE ST_Intersects(geom, ST_GeomFromText($1, 4326)) LIMIT 1",
        wkt,
    )
    return row["id"] if row else None


async def import_rutas(tipo: str):
    query = QUERIES.get(tipo)
    if not query:
        print(f"Tipo desconocido: {tipo}", file=sys.stderr)
        sys.exit(1)

    table = f"rutas_{tipo}"
    print(f"Fetching {tipo} routes from Overpass API...")

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(OVERPASS_URL, data={"data": query})
        resp.raise_for_status()
        data = resp.json()

    elements = data.get("elements", [])
    print(f"Found {len(elements)} elements")

    conn = await asyncpg.connect(DB_DSN)
    try:
        inserted = 0
        skipped = 0
        for el in elements:
            tags = el.get("tags", {})
            el_type = el.get("type", "relation")

            if el_type == "way":
                osm_id = -el.get("id")  # negative to avoid collision with relation IDs
                wkt = way_to_linestring(el)
                distancia_m = extract_distancia_way(tags, el.get("geometry", []))
                tipo_ruta = tags.get("highway") or tags.get("leisure") or tipo
            else:
                osm_id = el.get("id")
                members = el.get("members", [])
                wkt = coords_to_linestring(members)
                distancia_m = extract_distancia(tags, members)
                tipo_ruta = tags.get("route", tipo)

            if not wkt:
                skipped += 1
                continue

            # Skip micro-fragments for carril_bici (OSM way segmentation noise)
            if tipo == "carril_bici" and distancia_m and distancia_m < 50:
                skipped += 1
                continue

            # Skip very short paseos (datos basura OSM, < 30 m producen puntos en 3D)
            if tipo == "paseos" and distancia_m and distancia_m < 30:
                skipped += 1
                continue

            nombre = tags.get("name") or tags.get("name:es")
            dificultad = tags.get("sac_scale") or tags.get("difficulty")
            municipio_id = await find_municipio_id(conn, wkt)

            await conn.execute(
                f"""
                INSERT INTO {table}
                    (osm_id, nombre, tipo, distancia_m, dificultad, tags, geom, municipio_id)
                VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326), $8)
                ON CONFLICT (osm_id) DO UPDATE SET
                    nombre = EXCLUDED.nombre,
                    tipo = EXCLUDED.tipo,
                    distancia_m = EXCLUDED.distancia_m,
                    dificultad = EXCLUDED.dificultad,
                    tags = EXCLUDED.tags,
                    geom = EXCLUDED.geom,
                    municipio_id = EXCLUDED.municipio_id
                """,
                osm_id,
                nombre,
                tipo_ruta,
                distancia_m,
                dificultad,
                json.dumps(tags),
                wkt,
                municipio_id,
            )
            inserted += 1

            if inserted % 10 == 0:
                print(f"  Processed {inserted}...")
                await asyncio.sleep(0)  # yield

        print(f"Done: {inserted} inserted/updated, {skipped} skipped (no geometry)")
    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tipo", required=True,
        choices=["ciclismo", "senderismo", "sendas_verdes", "carril_bici", "paseos"])
    args = parser.parse_args()
    asyncio.run(import_rutas(args.tipo))
