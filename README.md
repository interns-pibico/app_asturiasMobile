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

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env with DATABASE_URL, SECRET_KEY, etc.

alembic upgrade head
uvicorn app.main:app --reload
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async connection string |
| `SECRET_KEY` | JWT signing secret |
| `APP_ROOT_PATH` | Root path for reverse proxy (e.g. `/mobile`) |
| `DEBUG` | Enable debug mode |
| `DEFAULT_LANGUAGE` | Default locale (`es`) |

## License

MIT — see [LICENSE](LICENSE)
