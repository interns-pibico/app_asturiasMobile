#!/usr/bin/env python3
"""
Enriquece las tablas de rutas con datos de elevación (ascenso_m, descenso_m)
usando Open-Elevation API o opentopodata.org como fallback.

Uso:
    python scripts/enrich_elevacion.py
    python scripts/enrich_elevacion.py --tipo senderismo
    python scripts/enrich_elevacion.py --force
    python scripts/enrich_elevacion.py --tipo senderismo --dry-run
"""
import argparse
import json
import math
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "dbname": "asturiasmap",
    "user": "asturiasuser",
    "password": "asturiasuser",
}

TABLE_MAP = {
    "ciclismo":      "rutas_ciclismo",
    "senderismo":    "rutas_senderismo",
    "sendas_verdes": "rutas_sendas_verdes",
    "carril_bici":   "rutas_carril_bici",
    "paseos":        "rutas_paseos",
}

OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
OPENTOPODATA_URL   = "https://api.opentopodata.org/v1/srtm90m"

MAX_POINTS_PER_ROUTE = 50
BATCH_SIZE = 10  # rutas por batch = 500 puntos


def decimated(coords_flat: list, max_pts: int) -> list:
    """Reduce lista de [lon,lat] a max_pts puntos uniformemente distribuidos."""
    n = len(coords_flat)
    if n <= max_pts:
        return coords_flat
    step = n / max_pts
    return [coords_flat[int(i * step)] for i in range(max_pts)]


def flatten_coords(geojson_coords) -> list:
    """Acepta LineString o MultiLineString coords → lista plana de [lon,lat]."""
    if not geojson_coords:
        return []
    if isinstance(geojson_coords[0][0], (int, float)):
        return geojson_coords  # LineString
    # MultiLineString: lista de listas
    flat = []
    for segment in geojson_coords:
        flat.extend(segment)
    return flat


def calc_desnivel(elevations: list[float]) -> tuple[float, float]:
    """Calcula ascenso y descenso acumulados en metros."""
    ascenso = descenso = 0.0
    for i in range(1, len(elevations)):
        delta = elevations[i] - elevations[i - 1]
        if delta > 0:
            ascenso += delta
        else:
            descenso += abs(delta)
    return ascenso, descenso


def derive_dificultad(ascenso: float) -> str:
    if ascenso < 300:
        return "easy"
    elif ascenso < 800:
        return "moderate"
    else:
        return "hard"


def post_json(url: str, payload: dict, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def get_elevations_open_elevation(locations: list[dict]) -> list[float] | None:
    """Llama Open-Elevation API. Devuelve lista de elevaciones o None si falla."""
    try:
        result = post_json(OPEN_ELEVATION_URL, {"locations": locations})
        return [r["elevation"] for r in result["results"]]
    except Exception as e:
        print(f"  [WARN] Open-Elevation falló: {e}", file=sys.stderr)
        return None


def get_elevations_opentopodata(locations: list[dict]) -> list[float] | None:
    """Fallback: opentopodata.org (max 100 pts, 1 req/s, GET con pipe-separated locs)."""
    try:
        all_elevs = []
        for i in range(0, len(locations), 100):
            chunk = locations[i : i + 100]
            locs_str = "|".join(f"{p['latitude']},{p['longitude']}" for p in chunk)
            url = f"{OPENTOPODATA_URL}?locations={locs_str}"
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            all_elevs.extend(r["elevation"] or 0.0 for r in result["results"])
            if i + 100 < len(locations):
                time.sleep(1.1)  # respetar rate limit
        return all_elevs
    except Exception as e:
        print(f"  [WARN] opentopodata falló: {e}", file=sys.stderr)
        return None


def process_table(cur, table: str, force: bool, dry_run: bool, municipio_id: int | None = None):
    condition = "" if force else "AND r.ascenso_m IS NULL"
    muni_cond = f"AND r.municipio_id = {municipio_id}" if municipio_id else ""
    cur.execute(f"""
        SELECT r.id, r.dificultad, ST_AsGeoJSON(r.geom) AS geojson
        FROM {table} r
        WHERE r.geom IS NOT NULL {condition} {muni_cond}
        ORDER BY r.id
    """)
    rows = cur.fetchall()
    if not rows:
        print(f"  No hay rutas pendientes en {table}")
        return

    print(f"  {len(rows)} rutas a procesar en {table}")

    # Preparar coordenadas decimadas por ruta
    route_pts = []
    for row in rows:
        geo = json.loads(row[2])
        flat = flatten_coords(geo.get("coordinates", []))
        pts = decimated(flat, MAX_POINTS_PER_ROUTE)
        route_pts.append((row[0], row[1], pts))

    # Procesar en batches
    batch_size = BATCH_SIZE
    for b_start in range(0, len(route_pts), batch_size):
        batch = route_pts[b_start : b_start + batch_size]
        # Construir lista flat de locations + índice de qué ruta pertenece cada punto
        locations = []
        route_indices = []
        for ridx, (rid, _, pts) in enumerate(batch):
            for pt in pts:
                locations.append({"latitude": pt[1], "longitude": pt[0]})
                route_indices.append(ridx)

        print(f"  Batch {b_start//batch_size + 1}: {len(locations)} puntos, {len(batch)} rutas...", end=" ", flush=True)

        elevs = get_elevations_open_elevation(locations)
        if elevs is None:
            print("→ fallback opentopodata...", end=" ", flush=True)
            elevs = get_elevations_opentopodata(locations)
        if elevs is None:
            print("FALLO — saltando batch")
            continue

        # Agrupar elevaciones por ruta
        from collections import defaultdict
        route_elevs: dict[int, list[float]] = defaultdict(list)
        for i, ridx in enumerate(route_indices):
            route_elevs[ridx].append(elevs[i])

        # Calcular y actualizar
        updates = []
        for ridx, (rid, dificultad_actual, _) in enumerate(batch):
            elev_list = route_elevs[ridx]
            if not elev_list:
                continue
            asc, desc = calc_desnivel(elev_list)
            dif_nueva = derive_dificultad(asc) if not dificultad_actual else dificultad_actual
            updates.append((round(asc, 1), round(desc, 1), dif_nueva, rid))
            print(f"\n    Ruta {rid}: ↑{asc:.0f}m ↓{desc:.0f}m dif={dif_nueva}", end="")

        print()

        if not dry_run:
            now = datetime.now(timezone.utc)
            for (asc, desc, dif, rid) in updates:
                cur.execute(f"""
                    UPDATE {table}
                    SET ascenso_m = %s, descenso_m = %s,
                        dificultad = COALESCE(NULLIF(dificultad, ''), %s),
                        enriched_at = %s
                    WHERE id = %s
                """, (asc, desc, dif, now, rid))

        time.sleep(0.5)  # pausa entre batches


def main():
    parser = argparse.ArgumentParser(description="Enriquecer rutas con datos de elevación")
    parser.add_argument("--tipo", choices=list(TABLE_MAP.keys()), help="Limitar a un tipo de ruta")
    parser.add_argument("--municipio-id", type=int, help="Limitar a un municipio (ej: 24 para Gijón)")
    parser.add_argument("--force", action="store_true", help="Re-calcular aunque ya tenga valor")
    parser.add_argument("--dry-run", action="store_true", help="Mostrar sin escribir en BD")
    args = parser.parse_args()

    tipos = [args.tipo] if args.tipo else list(TABLE_MAP.keys())

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        cur = conn.cursor()
        for tipo in tipos:
            table = TABLE_MAP[tipo]
            print(f"\n=== {tipo.upper()} ({table}) ===")
            process_table(cur, table, args.force, args.dry_run, args.municipio_id)
        if not args.dry_run:
            conn.commit()
            print("\nCambios guardados en BD.")
        else:
            print("\n[DRY-RUN] No se escribió nada en BD.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
