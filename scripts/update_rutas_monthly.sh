#!/bin/bash
set -e
VENV=/home/erpnext/.services/app_asturiasMobile/venv/bin/python3
SCRIPTS=/home/erpnext/.services/app_asturiasMobile/scripts
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M')]"

echo "$LOG_PREFIX === Inicio actualización mensual de rutas ==="

for TIPO in ciclismo senderismo sendas_verdes carril_bici paseos; do
  echo "$LOG_PREFIX Importando OSM: $TIPO"
  $VENV $SCRIPTS/import_rutas_osm.py --tipo $TIPO
done

echo "$LOG_PREFIX Enriqueciendo elevación..."
$VENV $SCRIPTS/enrich_elevacion.py

echo "$LOG_PREFIX Enriqueciendo Wikidata..."
$VENV $SCRIPTS/enrich_wikidata.py

echo "$LOG_PREFIX === Fin actualización ==="
