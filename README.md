# app_asturiasMobile

Mobile-first web application for exploring the municipalities of Asturias, featuring 3D isometric scenes, AI-powered guided tours, routes, and points of interest.

## Overview

`app_asturiasMobile` is a FastAPI application served at `/mobile/` on the pibiCo server. It provides a rich, mobile-optimised interface for discovering Asturian municipalities, hiking routes, and local markets — with an AI guide (streaming SSE) and real-time geospatial data from OpenStreetMap.

## Features

- Browse all 78 Asturian municipalities with geospatial data
- Points of interest (POIs) with categories and geolocation
- Hiking and cycling routes imported from OSM
- AI guide with streaming responses (SSE)
- Local market (mercado) integration via `api_mercadoAsturias`
- 3D isometric scenes per municipality using Three.js
- i18n support (Spanish, English, and more)
- Wikidata and elevation enrichment scripts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL + GeoAlchemy2 |
| Frontend | Jinja2, Three.js, Vanilla JS |
| Auth | JWT (python-jose, passlib/bcrypt) |
| i18n | Babel |
| Streaming | Server-Sent Events (SSE) |
| Server | Gunicorn + UvicornWorker, Nginx |

## Project Structure

```
app/
├── core/          # Config, logging, exceptions, security
├── db/            # Async SQLAlchemy session and base
├── middleware/    # i18n, request context
├── models/        # ORM models (municipio, poi, ruta)
├── routers/
│   ├── api/       # REST API (municipios, pois, rutas, guia, mercado)
│   └── v1/        # Health check
├── schemas/       # Pydantic schemas
├── services/      # Business logic (municipio, poi, ruta, guia, mercado)
├── static/        # JS, CSS, 3D assets
└── templates/     # Jinja2 HTML templates
scripts/           # OSM import, Wikidata/elevation enrichment, monthly updates
deploy/            # Nginx and Supervisor reference configs
migrations/        # Alembic migrations
```

## Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 14+ with PostGIS extension
- (Optional) Nginx + Supervisor for production

### 2. Clone and install

```bash
git clone https://github.com/interns-pibico/app_asturiasMobile.git
cd app_asturiasMobile

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in DATABASE_URL, SECRET_KEY, CHAT_* variables
```

### 3. Create the databases

```bash
# Main database (PostGIS required)
sudo -u postgres psql -c "CREATE USER asturiasuser WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE asturiasmap OWNER asturiasuser;"
sudo -u postgres psql -d asturiasmap -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Mercado database
sudo -u postgres psql -c "CREATE USER mercado_user WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE mercado_asturias OWNER mercado_user;"
```

### 4. Restore seed data

**`asturiasmap`** — download `seed_asturiasmap.sql.gz` from:
[📦 Download seed_asturiasmap.sql.gz](YOUR_LINK_HERE)
<!-- Replace YOUR_LINK_HERE with your Google Drive / Dropbox / etc. share link -->

```bash
gunzip -c seed_asturiasmap.sql.gz | psql -U asturiasuser -d asturiasmap
```

**`mercado_asturias`** — included in the repo at `data/seed_mercado_asturias.sql`:

```bash
psql -U mercado_user -d mercado_asturias < data/seed_mercado_asturias.sql
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Start the app

```bash
# Development
uvicorn app.main:app --reload --port 8002

# Production (Gunicorn + Nginx)
# See deploy/ for reference configs
gunicorn app.main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8002
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async URL (`postgresql+asyncpg://user:pass@host/asturiasmap`) |
| `SECRET_KEY` | JWT signing secret |
| `APP_ROOT_PATH` | Root path for reverse proxy (e.g. `/mobile`) |
| `APP_PORT` | Port to listen on (default `8002`) |
| `DEBUG` | Enable debug mode (`true`/`false`) |
| `DEFAULT_LOCALE` | Default locale (`es`) |
| `CHAT_API_KEY` | pibiCo API key for AstuGuía chat |
| `CHAT_NOTEBOOK_ID` | pibiCo notebook ID for AstuGuía RAG |
| `CHAT_BASE_URL` | pibiCo API base URL |

## License

MIT — see [LICENSE](LICENSE)
