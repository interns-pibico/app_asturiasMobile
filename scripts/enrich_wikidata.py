#!/usr/bin/env python3
"""
Enriquece las tablas de rutas con descripciones de Wikidata.
Solo procesa rutas que tienen tags->>'wikidata' (QID) pero wikidata_desc IS NULL.

Uso:
    python scripts/enrich_wikidata.py
    python scripts/enrich_wikidata.py --tipo ciclismo
    python scripts/enrich_wikidata.py --dry-run
"""
import argparse
import json
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

WIKIDATA_URL = "https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"


def fetch_wikidata(qid: str) -> dict | None:
    url = WIKIDATA_URL.format(qid=qid)
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "asturiasMobile/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  [WARN] HTTP {e.code} para {qid}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  [WARN] Error {qid}: {e}", file=sys.stderr)
        return None


def extract_description(data: dict, qid: str) -> str | None:
    entities = data.get("entities", {})
    entity = entities.get(qid) or next(iter(entities.values()), None)
    if not entity:
        return None
    descs = entity.get("descriptions", {})
    # Preferir español, fallback a inglés
    for lang in ("es", "en"):
        if lang in descs:
            return descs[lang]["value"]
    return None


def process_table(cur, table: str, dry_run: bool, municipio_id: int | None = None) -> tuple[int, int]:
    muni_cond = f"AND municipio_id = {municipio_id}" if municipio_id else ""
    cur.execute(f"""
        SELECT id, tags->>'wikidata' AS qid
        FROM {table}
        WHERE tags->>'wikidata' IS NOT NULL
          AND wikidata_desc IS NULL
          {muni_cond}
        ORDER BY id
    """)
    rows = cur.fetchall()
    total = len(rows)
    enriched = 0

    if not rows:
        print(f"  No hay rutas pendientes en {table}")
        return 0, 0

    print(f"  {total} rutas con QID en {table}")

    for rid, qid in rows:
        qid = qid.strip()
        data = fetch_wikidata(qid)
        if not data:
            continue

        desc = extract_description(data, qid)
        if not desc:
            print(f"  [{qid}] Sin descripción en es/en")
            time.sleep(1)
            continue

        print(f"  [{qid}] ruta {rid}: {desc[:80]}")
        enriched += 1

        if not dry_run:
            now = datetime.now(timezone.utc)
            cur.execute(f"""
                UPDATE {table}
                SET wikidata_desc = %s, enriched_at = COALESCE(enriched_at, %s)
                WHERE id = %s
            """, (desc, now, rid))

        time.sleep(1.0)  # respetar rate limit Wikidata

    return total, enriched


def main():
    parser = argparse.ArgumentParser(description="Enriquecer rutas con descripciones de Wikidata")
    parser.add_argument("--tipo", choices=list(TABLE_MAP.keys()), help="Limitar a un tipo de ruta")
    parser.add_argument("--municipio-id", type=int, help="Limitar a un municipio (ej: 24 para Gijón)")
    parser.add_argument("--dry-run", action="store_true", help="Mostrar sin escribir en BD")
    args = parser.parse_args()

    tipos = [args.tipo] if args.tipo else list(TABLE_MAP.keys())

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    try:
        cur = conn.cursor()
        grand_total = grand_enriched = 0
        for tipo in tipos:
            table = TABLE_MAP[tipo]
            print(f"\n=== {tipo.upper()} ({table}) ===")
            total, enriched = process_table(cur, table, args.dry_run, args.municipio_id)
            grand_total += total
            grand_enriched += enriched

        print(f"\nResumen: {grand_enriched}/{grand_total} rutas enriquecidas con Wikidata.")

        if not args.dry_run:
            conn.commit()
            print("Cambios guardados en BD.")
        else:
            print("[DRY-RUN] No se escribió nada en BD.")
    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
