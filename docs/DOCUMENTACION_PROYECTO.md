# Documentación Técnica — app_asturiasMobile

> **Versión:** 1.5 · **Fecha:** 2026-03-19 · **Rol:** Senior Technical Writer / Arquitecto de Software
> **Formato:** Optimizado para presentación / exportable a Notion o Word

---

## Tabla de Contenidos

1. [Información General y Contexto](#1-información-general-y-contexto)
2. [Arquitectura y Flujo del Sistema](#2-arquitectura-y-flujo-del-sistema)
3. [AstuGuía — IA Conversacional](#3-astuguía--ia-conversacional)
4. [Gamificación — Pasaporte, Trofeos y Estadísticas](#4-gamificación--pasaporte-trofeos-y-estadísticas)
5. [Obtención y Gestión de Datos](#5-obtención-y-gestión-de-datos)
6. [Guía de Estilo y Diseño UI/UX](#6-guía-de-estilo-y-diseño-uiux)
7. [Documentación de la API](#7-documentación-de-la-api)
8. [Configuración y Despliegue](#8-configuración-y-despliegue)
9. [Mantenimiento y Escalabilidad](#9-mantenimiento-y-escalabilidad)

---

## 1. Información General y Contexto

### 1.1 Elevator Pitch

**app_asturiasMobile** es una aplicación web mobile-first para explorar el mapa de Asturias y sus 78 municipios (concejos). El usuario vive la experiencia como si manejara una guía de viaje mágica: un **libro 3D animado** que se abre para revelar el mapa interactivo de la región. Al tocar un municipio, transiciona a una **escena 3D isométrica** de estética _Paper Mario_ donde puede explorar puntos de interés (restaurantes, ocio, tiendas, mercados) y rutas deportivas (ciclismo, senderismo, sendas verdes, carril bici, paseos), con datos reales extraídos de OpenStreetMap.

La aplicación incluye **AstuGuía**, un personaje interactivo con IA conversacional que responde en tiempo real sobre cualquiera de los 78 concejos usando datos directos de la base de datos combinados con conocimiento cultural. El sistema de **gamificación** premia la exploración con sellos de pasaporte, trofeos desbloqueables y estadísticas de viaje.

### 1.2 Objetivo y Alcance

| Dimensión | Descripción |
|-----------|-------------|
| **Objetivo principal** | Visualización lúdica e inmersiva del territorio asturiano para turistas y residentes |
| **Usuarios objetivo** | Turistas con smartphone, ciclistas, senderistas, residentes que buscan ocio local |
| **Alcance geográfico** | 78 municipios de Asturias (Principado de Asturias, España) |
| **Acceso** | Web app responsive; sin autenticación de usuario final |
| **Fuentes de datos** | OpenStreetMap (POIs y rutas), Wikidata (descripciones), Open-Elevation (altimetría), Open-Meteo (meteorología), api_mercadoAsturias (comercios de mercado) |

### 1.3 Stack Tecnológico Completo

#### Backend

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Framework web | FastAPI | 0.115+ |
| Runtime Python | Python | 3.13 |
| Servidor ASGI | Gunicorn + UvicornWorker | — |
| ORM / queries | SQLAlchemy 2.0 async | 2.0+ |
| Driver PostgreSQL | asyncpg | — |
| Extensión geo | GeoAlchemy2 | — |
| HTTP cliente async | httpx | — |
| Templates | Jinja2 | 3.x |
| IA chat | OpenAI API (gpt-4o-mini) + pibiCo notebook proxy | — |

#### Base de Datos

| Componente | Detalle |
|------------|---------|
| Motor | PostgreSQL + PostGIS |
| Base de datos | `asturiasmap` (compartida con `app_example`; `asturiasuser` es propietario con acceso completo de escritura) |
| Tipos geoespaciales | MultiPolygon, Point, LineString, MultiLineString (SRID 4326) |
| Driver async | asyncpg vía SQLAlchemy async engine |

#### Frontend (todo local, sin CDN externos)

| Biblioteca | Versión | Ubicación |
|------------|---------|-----------|
| Three.js | r170 | `static/vendor/three/` |
| Leaflet | 1.9.4 | `static/vendor/leaflet/` |
| EffectComposer + OutlinePass | r170 | `static/vendor/three/` |
| Fuente Inter | WOFF2 | `static/vendor/fonts/` |

> **Sin excepciones de red:** todo tráfico externo pasa por el backend FastAPI. `weather.js` llama a `/api/weather` (mismo origen); el servidor proxia Open-Meteo. Nunca hay llamadas externas desde el navegador.

#### Infraestructura

| Componente | Detalle |
|------------|---------|
| Process manager | Supervisor (`autorestart=true`) |
| Reverse proxy | Nginx |
| Puerto local | 8002 |
| Proxy path producción | `/mobile/` |
| Logs | `/var/log/app_asturiasMobile/` |

---

## 2. Arquitectura y Flujo del Sistema

### 2.1 Diagrama de Arquitectura (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                            │
│  book.js + Three.js r170 (libro 3D)                                 │
│  explorar.js + Three.js r170 (escena isométrica)                    │
│  guia-chat.js → POST /api/guia/chat (SSE streaming)                 │
│  passport.js / trophies.js / stats.js (localStorage)               │
│  weather.js → GET /api/weather (proxy backend, cache 30min)        │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTPS  /mobile/
┌──────────────────────▼──────────────────────────────────────────────┐
│                         NGINX                                         │
│  /mobile/  → proxy_pass 127.0.0.1:8002                             │
│  proxy_buffering off; proxy_read_timeout 120s (SSE)                 │
│  /mobile/static/vendor/ → immutable cache 365d                      │
│  /mobile/static/css|js/ → no-cache, must-revalidate                 │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                    SUPERVISOR                                         │
│  [program:app_asturiasMobile]  autorestart=true                      │
│  gunicorn app.main:app -w {CPU} -k UvicornWorker                    │
│                  bind 127.0.0.1:8002                                 │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│                    FASTAPI APP                                        │
│  routers/pages.py      → GET /  · GET /explorar/{id}                │
│  routers/api/          → /api/municipios · /api/pois · ...          │
│  routers/api/guia.py   → POST /api/guia/chat  (SSE streaming)       │
│  services/guia.py      → fast-path + OpenAI + pibiCo proxy          │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ asyncpg / SQLAlchemy async
┌──────────────────────▼──────────────────────────────────────────────┐
│              PostgreSQL + PostGIS  (BD: asturiasmap)                 │
│  municipios · puntos_interes · rutas_ciclismo · ...                 │
└─────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │  SERVICIOS EXTERNOS (ETL / scripts)  │
        │  Overpass API   → import_rutas_osm   │
        │  Open-Elevation → enrich_elevacion   │
        │  Wikidata API   → enrich_wikidata    │
        └──────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │  api_mercadoAsturias  (puerto 8001)  │
        │  BD propia: mercado_asturias         │
        │  /v1/municipios/{slug}/comercios     │
        │  ← proxy desde /api/mercado/{id}    │
        └──────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │  pibiCo API (externo)                │
        │  Notebook: nb_4c0b0100c552           │
        │  Modelo: gpt-oss:20b (RAG notebooks) │
        │  ← proxy desde /api/guia/chat        │
        └──────────────────────────────────────┘

        ┌──────────────────────────────────────┐
        │  OpenAI API (externo)                │
        │  Modelo: gpt-4o-mini                 │
        │  Tool calling (fallback fast-path)   │
        │  ← directo desde services/guia.py   │
        └──────────────────────────────────────┘
```

### 2.2 Flujo de Usuario (User Flow)

```
Usuario abre /
        │
        ▼
[FASE 1] Libro 3D cerrado (Three.js)
        │  tap / click
        ▼
[FASE 2] Animación apertura del libro (Three.js + tweening manual ~6.5s)
        │  completada (o saltada vía sessionStorage.bookReady)
        ▼
[FASE 3] Libro abierto — Leaflet cargado en página derecha
         Mapa de Asturias con 78 municipios coloreados
         + AstuGuía wizard: saluda, pregunta nombre, recomienda municipio
        │  tap municipio → card → enlace explorar
        ▼
GET /explorar/{municipio_id}?cat=senderismo
        │
        ▼
[explorar.html] Escena 3D isométrica (Three.js OrthographicCamera)
  ┌─────────────────────────────────────────────────────────────────┐
  │  - Platform terrain (ExtrudeGeometry + bevel)                   │
  │  - POI sprites (billboard CanvasTexture + emojis por subtipo)  │
  │  - Rutas 3D (TubeGeometry 3 capas glow por categoría)          │
  │  - Bottom bar: 9 categorías (SPA sin reload)                   │
  │  - Sidebar izquierdo: POI detail / Route detail + minimap       │
  │  - AstuGuía comentarista con IA (fast-path <100ms si DB)       │
  │  - Widget meteorológico (Open-Meteo, esquina superior der.)     │
  │  + stamp pasaporte al entrar al municipio                       │
  └─────────────────────────────────────────────────────────────────┘
        │  btn-back → sessionStorage.bookReady='1'
        ▼
GET /  (libro ya abierto, salta animación)
```

### 2.3 Estructura de Archivos Clave

```
app_asturiasMobile/
├── app/
│   ├── main.py                      ← create_app() factory, lifespan DB pool
│   ├── core/
│   │   └── config.py                ← Settings: DATABASE_URL, PORT=8002, ROOT_PATH, CHAT_*
│   ├── models/
│   │   ├── municipio.py             ← Tabla municipios (PostGIS MultiPolygon)
│   │   ├── poi.py                   ← Tabla puntos_interes (Point)
│   │   └── ruta.py                  ← 5 clases ORM rutas_* (PostGIS)
│   ├── services/
│   │   ├── municipio.py             ← ST_Centroid, ST_AsGeoJSON, ST_Simplify
│   │   ├── poi.py                   ← ST_Within, paginación, count query
│   │   ├── rutas.py                 ← ST_Intersects por municipio, paginación
│   │   ├── mercado.py               ← httpx proxy → api_mercadoAsturias:8001
│   │   └── guia.py                  ← IA: fast-path + tools BD + OpenAI + pibiCo proxy
│   └── routers/
│       ├── pages.py                 ← GET /, GET /explorar/{id}
│       └── api/
│           ├── municipios.py        ← /api/municipios[/geojson|/{id}]
│           ├── pois.py              ← /api/pois/{id}?categoria=X&offset=N
│           ├── rutas.py             ← /api/rutas/{id}?tipo=X&offset=N
│           ├── mercado.py           ← proxy → api_mercadoAsturias:8001
│           ├── guia.py              ← POST /api/guia/chat (SSE StreamingResponse)
│           ├── weather.py           ← GET /api/weather?lat=X&lon=Y (proxy Open-Meteo)
│           └── health.py            ← /api/v1/health/live
├── static/
│   ├── css/
│   │   ├── style.css                ← Variables Paper Mario, reset, pasaporte, trofeos
│   │   ├── book.css                 ← Libro 3D + transición libro→mapa
│   │   ├── explorar.css             ← Canvas + bottom bar + sidebars + POI cards
│   │   └── guia.css                 ← AstuGuía overlay, personaje, burbuja, chat
│   ├── js/
│   │   ├── book.js                  ← Three.js libro 3D + Leaflet integrado
│   │   ├── explorar.js              ← Three.js escena isométrica (SPA, rutas, clusters)
│   │   ├── guia-utils.js            ← SVG personaje, typewriter, draggable, loadPos
│   │   ├── guia-book.js             ← AstuGuía wizard + captura nombre en book.html
│   │   ├── guia-explorar.js         ← AstuGuía comentarista en explorar.html
│   │   ├── guia-chat.js             ← Chat SSE + captura nombre + miniMd + NAV detection
│   │   ├── weather.js               ← Widget meteorológico (proxy /api/weather, ES module)
│   │   ├── passport.js              ← Pasaporte de sellos + PDF download
│   │   ├── trophies.js              ← Sistema de trofeos/logros (10 badges)
│   │   └── stats.js                 ← Panel estadísticas del viajero
│   └── vendor/
│       ├── leaflet/                 ← Leaflet 1.9.4 (JS + CSS + imágenes PNG)
│       ├── three/                   ← Three.js r170 + EffectComposer + OutlinePass
│       └── fonts/                   ← Inter Regular/Medium/Bold WOFF2
├── templates/
│   ├── base.html                    ← DOCTYPE, viewport, window.ASTUGUIA_CONTEXT, pasaporte HTML
│   └── pages/
│       ├── book.html                ← Vista libro (data-root, weather-book widget)
│       └── explorar.html            ← Vista 3D (data-municipio-*, weather-explorar widget)
├── scripts/
│   ├── import_rutas_osm.py          ← ETL Overpass API → PostgreSQL
│   ├── enrich_elevacion.py          ← Open-Elevation → ascenso_m/descenso_m
│   ├── enrich_wikidata.py           ← Wikidata → wikidata_desc
│   └── update_rutas_monthly.sh      ← Cron mensual orquestador
└── docs/
    ├── DOCUMENTACION_PROYECTO.md    ← Este archivo
    ├── astuguia/                    ← Docs para el notebook pibiCo (RAG)
    │   ├── system.md                ← System prompt maestro (condensado ~1500 tokens)
    │   ├── asturias_general.md      ← Historia, clima, geografía, UNESCO
    │   ├── gastronomia.md           ← Fabada, sidra, quesos (contexto cultural)
    │   ├── senderismo.md            ← Rutas famosas: Cares, Senda del Oso, GR-E1
    │   ├── ciclismo.md              ← Rutas ciclistas destacadas
    │   ├── mercados.md              ← Cuándo usar buscar_mercados, 5 categorías, cobertura
    │   ├── oviedo.md                ← Historia, prerrománico, cultura
    │   ├── gijon.md                 ← Eventos, museos, contexto urbano
    │   ├── llanes.md                ← Gulpiyuri, Bufones, Pindal
    │   ├── ribadesella.md           ← Descenso del Sella, Costa Jurásica
    │   ├── cangas_del_narcea.md     ← Oso pardo, vino DOP, Muniellos
    │   ├── aviles.md                ← Costa / ciudad industrial reconvertida
    │   ├── somiedo.md               ← Interior / Parque Natural
    │   ├── ponga.md                 ← Interior / alta montaña
    │   ├── villaviciosa.md          ← Costa / sidra
    │   └── cabrales.md              ← Interior / Picos de Europa
    └── sesiones/                    ← Histórico de sesiones de desarrollo
```

### 2.4 Lógica de Negocio — Capas de Servicios

#### `services/municipio.py`

| Función | PostGIS usada | Descripción |
|---------|--------------|-------------|
| `get_all_municipios()` | `ST_Centroid(geom)` | Lista con centroide para el mapa |
| `get_municipios_geojson()` | `ST_AsGeoJSON(ST_Simplify(geom,0.001))` | FeatureCollection simplificada para Leaflet |
| `get_municipio_by_id(id)` | `ST_AsGeoJSON(ST_Simplify(geom,0.0001))` | Detalle con geometría de mayor resolución |

#### `services/poi.py`

| Función | PostGIS usada | Descripción |
|---------|--------------|-------------|
| `get_pois_by_municipio(id, cat, tipo, limit, offset)` | `ST_Within(poi.geom, mun.geom)` | POIs paginados dentro del municipio, filtro server-side por tipo |
| Retorna | `tuple[list[dict], int]` | Lista de POIs + total count (para `X-Total-Count`) |

#### `services/rutas.py`

| Función | PostGIS usada | Descripción |
|---------|--------------|-------------|
| `get_rutas_by_municipio(id, tipo, limit, offset)` | `ST_Intersects(ruta.geom, mun.geom)` | Rutas que cruzan o están dentro del municipio |
| Retorna | `tuple[list[dict], int]` | Lista de rutas + total count |

---

## 3. AstuGuía — IA Conversacional

### 3.1 Descripción General

AstuGuía es un personaje interactivo arrastrable presente en ambas vistas. Combina un wizard de recomendación (book.html) con un chat conversacional en tiempo real (explorar.html y book.html). El chat usa un sistema de tres niveles de respuesta ordenados por latencia:

```
┌─────────────────────────────────────────────────────────────────────┐
│  NIVEL 1 — FAST-PATH  (< 100 ms)                                    │
│  Detección de keyword + municipio → consulta BD directa → respuesta  │
│  hardcodeada en bable asturiano con datos reales.                    │
│  Cubre: los 78 municipios × 9 categorías × keywords de búsqueda.    │
├─────────────────────────────────────────────────────────────────────┤
│  NIVEL 2 — OPENAI Phase 1+2  (5-15 s)                              │
│  OpenAI gpt-4o-mini con 5 tools BD (fase 1: selección de tool).     │
│  Fase 2: streaming de respuesta narrativa sobre los datos obtenidos. │
│  Cubre: preguntas sobre municipios sin keyword fast-path detectado.  │
├─────────────────────────────────────────────────────────────────────┤
│  NIVEL 3 — PIBICO PROXY  (variable)                                 │
│  Proxy SSE hacia pibiCo notebook nb_4c0b0100c552 (gpt-oss:20b).    │
│  RAG sobre docs culturales. Cubre: preguntas generales sobre         │
│  historia, gastronomía, geografía, cultura de Asturias.             │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Arquitectura del Bridge `/api/guia/chat`

```
Frontend JS (guia-chat.js)
        │
        │  POST /api/guia/chat  {message, municipio_id, categoria, municipio_nombre, ...}
        ▼
routers/api/guia.py
        │  GuiaChatRequest (Pydantic)
        │  StreamingResponse (text/event-stream)
        ▼
services/guia.py — stream_openai_agent()
        │
        ├─ _try_fast_path()  ──────────────────────────────────────────┐
        │      │                                                        │
        │      ├─ _detect_municipio_from_text(msg)                     │
        │      │      → static dict 10 municipios                      │
        │      │      → _detect_municipio_db(msg) [78 municipios, BD]  │
        │      │                                                        │
        │      ├─ _detect_fast_path(msg, cat, mid)                     │
        │      │      → keyword matching (_FP_COMER, _FP_OCIO, etc.)  │
        │      │      → catch-all (_FP_CATCH_ALL) si hay categoria     │
        │      │                                                        │
        │      └─ _execute_tool(tool_name, params)                     │
        │             → buscar_pois / buscar_rutas / buscar_mercados   │
        │             → _build_fast_response() → SSE stream hardcoded  │◄─ NIVEL 1
        │
        ├─ OpenAI Phase 1 (tool selection)  ──────────────────────────┐
        │      gpt-4o-mini, max_completion_tokens=50                   │
        │      Elige tool y parámetros basándose en el mensaje         │
        │                                                              │
        ├─ _execute_tool() → datos BD reales                          │
        │                                                              │
        └─ OpenAI Phase 2 (narrative streaming) ─────────────────────►  NIVEL 2
               gpt-4o-mini, stream=True, con datos BD en prompt
               yield chunks → SSE data events

        Si ningún fast-path ni municipio detectado:
        └─ stream_pibico() ──────────────────────────────────────────►  NIVEL 3
               httpx SSE proxy → pibiCo notebook
               build_system_prompt(): system.md + docs/*.md + CONTEXTO_ACTUAL BD
               build_db_context(): counts de POIs/rutas del municipio actual
```

### 3.3 Fast-Path — Detección y Tools

#### Municipio Detection

1. **Static dict** (`_MUNICIPIO_TEXT_TO_ID`): 10 municipios más comunes → O(1)
2. **DB cache** (`_detect_municipio_db`): carga los 78 municipios de la BD al primer uso, ordenados por `LENGTH(nombre) DESC` (evita que "Cangas" matchee antes que "Cangas del Narcea"). Normalización: sin acentos, minúsculas.

#### Keyword Sets

| Set | Keywords representativos | Tool resultado |
|-----|--------------------------|----------------|
| `_FP_COMER` | restaurante, comer, sidra, espicha, pote, fabada, gastronomía, dónde comer | `buscar_pois(cat=comer)` |
| `_FP_OCIO` | monumento, museo, qué hacer, actividades, excursiones, imprescindible | `buscar_pois(cat=ocio)` |
| `_FP_TIENDAS` | tienda, compras, comercio | `buscar_pois(cat=tiendas)` |
| `_FP_CICLISMO` | ciclismo, bicicleta, ruta en bici | `buscar_rutas(tipo=ciclismo)` |
| `_FP_SENDERISMO` | senderismo, senda, trekking | `buscar_rutas(tipo=senderismo)` |
| `_FP_MERCADO` | mercado, feria, productos locales | `buscar_mercados(municipio_id)` |
| `_FP_CATCH_ALL` | qué hay, qué puedo, recomiéndame, dónde puedo... | Usa `categoria` del contexto actual |

#### Catch-All (Regla 9)

Cuando el mensaje contiene frases genéricas de exploración (`_FP_CATCH_ALL`) y la página tiene `categoria` en el contexto → se usa la categoría actual del explorador sin necesidad de keywords específicos.

```python
_CAT_TO_TOOL = {
    "comer":          ("buscar_pois",   "comer"),
    "ocio":           ("buscar_pois",   "ocio"),
    "tiendas":        ("buscar_pois",   "tiendas"),
    "ciclismo":       ("buscar_rutas",  "ciclismo"),
    "senderismo":     ("buscar_rutas",  "senderismo"),
    "sendas_verdes":  ("buscar_rutas",  "sendas_verdes"),
    "carril_bici":    ("buscar_rutas",  "carril_bici"),
    "paseos":         ("buscar_rutas",  "paseos"),
    "mercado":        ("buscar_mercados", None),
}
```

#### Respuesta sin resultados

Si la tool DB devuelve 0 resultados, el fast-path **siempre** genera un mensaje hardcodeado (nunca cae a OpenAI):

> _"Lo siento, nun tengo información sobre esto en **Concejo**. Pero pues explorar por tu cuenta. [NAV:Concejo]"_

### 3.4 Tools del Agente

| Tool | Parámetros | Fuente datos | Descripción |
|------|-----------|-------------|-------------|
| `buscar_pois` | `municipio_id`, `categoria`, `tipo?` | `puntos_interes` | POIs: restaurantes, ocio, tiendas |
| `buscar_rutas` | `municipio_id`, `tipo` | `rutas_*` (5 tablas) | Rutas deportivas por tipo |
| `buscar_mercados` | `municipio_id`, `categoria?` | api_mercadoAsturias:8001 | Comercios de mercado con 5 subcategorías |
| `buscar_por_producto` | `producto` | `puntos_interes` + `rutas_*` | Búsqueda genérica sin municipio |

### 3.5 Sistema RAG (pibiCo Nivel 3)

#### Tres fuentes de conocimiento (prioridad)

1. **CONTEXTO_ACTUAL** (BD en tiempo real) — counts, nombres de rutas, POIs del concejo activo → SIEMPRE prevalece para datos concretos
2. **Docs del notebook** (RAG pibiCo) — contexto cultural, histórico, narrativo; rutas famosas fuera de la BD
3. **Conocimiento general** — fallback para preguntas que ninguna fuente anterior cubre

#### Documentos en el notebook `nb_4c0b0100c552`

| Documento | Contenido | Decisión |
|-----------|-----------|----------|
| `system.md` | System prompt maestro (~1500 tokens, condensado) | Inyectado en CADA llamada |
| `asturias_general.md` | Historia, clima, geografía, UNESCO | RAG |
| `gastronomia.md` | Fabada, sidra, quesos (no en BD) | RAG |
| `senderismo.md` | Ruta del Cares, Senda del Oso, GR-E1 | RAG |
| `ciclismo.md` | Rutas ciclistas destacadas | RAG |
| `mercados.md` | Guía de uso de `buscar_mercados` | RAG |
| `oviedo.md` | Historia, prerrománico, monumentos | RAG |
| `gijon.md` | Eventos, museos, contexto urbano | RAG |
| `llanes.md` | Gulpiyuri, Bufones, Pindal | RAG |
| `ribadesella.md` | Descenso del Sella, Costa Jurásica | RAG |
| `cangas_del_narcea.md` | Oso pardo, vino DOP, Muniellos | RAG |
| `aviles.md` | Ciudad industrial reconvertida, NIEMEYER | RAG |
| `somiedo.md` | Parque Natural, oso cantábrico | RAG |
| `ponga.md` | Alta montaña, paisajes vírgenes | RAG |
| `villaviciosa.md` | Capital de la sidra, Castro | RAG |
| `cabrales.md` | Picos de Europa, queso Cabrales DOP | RAG |

> **No subir al notebook**: `concejos_principales.md` (redundante con CONTEXTO_ACTUAL) · `frases_fijas.md` (documentación para devs)

### 3.6 Frontend del Chat (`guia-chat.js`)

#### CONV_KEY — Aislamiento por página

```javascript
const CONV_KEY = 'aguia_conv_' + window.location.pathname.replace(/\//g, '_').replace(/^_/, '');
// /           → aguia_conv_
// /explorar/24 → aguia_conv_explorar_24
```

Cada URL mantiene su propio historial de conversación en `sessionStorage`.

#### Detección de navegación (`detectCategory` + `detectMercadoSubcat`)

El chat analiza la respuesta del bot para proponer un botón de navegación inteligente:

| Contenido de respuesta | Categoría destino | Contexto |
|------------------------|-------------------|---------|
| restaurante / comer / bar / gastronomía | `comer` | — |
| tienda / compras / comercio | `tiendas` | — |
| mercado / queso / sidra (compra) / llagar / quesería | `mercado` + subcat | detectMercadoSubcat |
| monumento / museo / visitar / cultura / arte | `ocio` | — |
| senderismo / senda / trekking | `senderismo` | — |
| ciclismo / bicicleta / en bici | `ciclismo` | — |
| carril bici / ciclocarril | `carril_bici` | — |
| senda verde / vía verde | `sendas_verdes` | — |
| paseo / caminata / caminar | `paseos` | — |
| **sin keywords específicos** | `ocio` (fallback) | — |

#### Subcategorías de mercado (`detectMercadoSubcat`)

| Texto detectado | Slug | URL resultante |
|-----------------|------|----------------|
| sidra / llagar / cerveza | `sidra-bebidas` | `/explorar/{id}?cat=mercado&cat_filter=sidra-bebidas` |
| queso / Cabrales / embutido | `gastro` | `/explorar/{id}?cat=mercado&cat_filter=gastro` |
| artesanía / cerámica | `artesania` | `/explorar/{id}?cat=mercado&cat_filter=artesania` |
| dulce / repostería | `dulce` | `/explorar/{id}?cat=mercado&cat_filter=dulce` |
| huerta / fabe / verdura | `huerta-campo` | `/explorar/{id}?cat=mercado&cat_filter=huerta-campo` |

#### Botón de navegación — comportamiento por contexto

| Contexto | Comportamiento del botón |
|----------|-------------------------|
| `book.html` | `"🗺️ Ir a {municipio}"` → navega al municipio en la categoría detectada |
| `explorar.html` | `"🗺️ Ir a la categoría {Cat} de {Concejo}"` → cambia de categoría sin salir del concejo |

#### Captura de nombre — dos flujos

**Flujo A (wizard primero):**
```
s0 typewriter → pregunta nombre → input + "¡Dale!" → sessionStorage guardado
→ wizard 4 pasos → "💬 Pregunta más" → openChatMode()
→ showInitialGreeting(): "Hola {nombre}, ¿Qué ye lo que quies saber?"
```

**Flujo B (chat primero, sin wizard):**
```
click monigote → openChatMode() → showInitialGreeting()
→ historial vacío + sin nombre → "Hola, ¿Cómo te llames?" + _awaitingName=true
→ primer mensaje interceptado por handleSend() (sin llamar API)
→ sessionStorage guardado → "¡Encantau de conocete {nombre}!"
→ conversación normal con API
```

### 3.7 Seguridad

- La **API key de pibiCo** nunca se expone al frontend. Está en `.env` y solo la lee `services/guia.py`.
- La **API key de OpenAI** también en `.env`, nunca en el cliente.
- El `conversation_id` de pibiCo se pasa al frontend (no es secreto) y se guarda en `sessionStorage`.
- Retry automático: si el `conversation_id` caduca (403), el cliente reintenta sin él.

### 3.8 Contexto de Página (`window.ASTUGUIA_CONTEXT`)

Inyectado por `base.html` desde Jinja2 en cada renderizado:

```javascript
window.ASTUGUIA_CONTEXT = {
  municipio_id:     24,         // null en book.html
  municipio_nombre: "Gijón",   // null en book.html
  categoria:        "senderismo" // null en book.html
};
```

El frontend lo envía en cada request a `/api/guia/chat` junto con `municipio_nombre` para personalizar respuestas.

---

## 4. Gamificación — Pasaporte, Trofeos y Estadísticas

### 4.1 Descripción General

Sistema de gamificación completamente client-side usando `localStorage`. No requiere autenticación ni backend adicional. Los datos persisten entre sesiones del mismo navegador.

```
localStorage keys:
  passport_visited       → { municipio_id: { nombre, fecha } }
  astuguia_trophies      → { badge_id: { fecha } }
  astuguia_cat_counts    → { ciclismo: 3, senderismo: 7, ... }
  astuguia_poi_count     → 42
  astuguia_route_count   → 18
  astuguia_sidreru       → "true" / null
```

### 4.2 Pasaporte de Concejos (`passport.js`)

**Sello automático** al entrar a `/explorar/{id}`: `stampPassport(municipio_id, municipio_nombre)`

**Panel visual** (dos páginas en paralelo):
- **Cubierta**: fondo verde oscuro `#1a3a1a`, borde dorado, contador `X / 78`
- **Página izquierda** (`.pp-page-left`): grid de trofeos desbloqueados/bloqueados
- **Lomo** (`.pp-spine`): separador estilo encuadernación
- **Página derecha** (`.pp-page-right`): grid de sellos por concejo, estilo sello postal

**Descarga PDF**: `downloadPdf()` genera un layout de dos columnas (trofeos + sellos) usando `@media print` con `#passport-print-area` como hermano directo de `<body>` (evita el bug de PDF en blanco causado por `overflow:hidden` de paneles padres).

### 4.3 Sistema de Trofeos (`trophies.js`)

10 badges desbloqueables automáticamente al cumplir las condiciones:

| Badge | Icono | Condición |
|-------|-------|-----------|
| Primer Paso | 👣 | Visitar 1 concejo |
| Explorador | 🗺️ | Visitar 10 concejos |
| Gran Viajero | ✈️ | Visitar 25 concejos |
| Leyenda Asturiana | 👑 | Visitar los 78 concejos |
| Costeru | 🌊 | Visitar 5 concejos costeros |
| Senderista | 🥾 | Cargar la categoría senderismo 5 veces |
| Ciclista | 🚴 | Cargar la categoría ciclismo 5 veces |
| Sidreru | 🍺 | Entrar en un bar o sidrería |
| Mercader | 🏪 | Explorar el mercado local 1 vez |
| Curioso | 🔍 | Abrir 10 puntos de interés |

Los trofeos se verifican (`checkAndUnlock`) al cargar categorías, abrir POIs y visitar municipios. Al desbloquear se muestra un toast flotante.

### 4.4 Estadísticas del Viajero (`stats.js`)

Panel con métricas acumuladas:

| Métrica | Fuente |
|---------|--------|
| Concejos visitados (X/78) + barra progreso | `passport_visited` |
| Puntos de interés explorados | `astuguia_poi_count` |
| Rutas cargadas | `astuguia_route_count` |
| Categoría favorita | `astuguia_cat_counts` (max) |
| Categorías exploradas (ranking) | `astuguia_cat_counts` |

### 4.5 Widget Meteorológico (`weather.js`)

- **API**: Open-Meteo — **gratuita, sin API key, sin límite para uso no comercial**
- **Acceso**: a través del proxy backend `GET /api/weather?lat=X&lon=Y` (mismo origen, sin restricciones CSP)
- **Datos**: temperatura actual, min/max del día, código WMO → emoji (☀️ ⛅ 🌧️ ❄️...)
- **Caché**: `sessionStorage` 30 minutos por coordenadas — evita peticiones repetidas al navegar
- **Integración**:
  - `book.html`: `initWeatherMulti()` con 3 ciudades fijas → panel vertical top-left
    - Gijón (43.532, -5.660) · Oviedo (43.361, -5.859) · Avilés (43.556, -5.949)
  - `explorar.html`: `initWeather(lat, lon)` con centroide real del municipio → HUD header
- **Fallo**: silencioso — el widget queda vacío sin romper la experiencia

---

## 5. Obtención y Gestión de Datos

### 5.1 Modelo de Datos — ERD Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│  BD: asturiasmap (PostgreSQL + PostGIS)                             │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐
│      municipios       │
├───────────────────────┤
│ id          INTEGER PK│
│ nombre      TEXT      │
│ poblacion   INTEGER   │
│ geom        GEOMETRY  │  ← MultiPolygon SRID 4326
└──────────┬────────────┘
           │ ST_Within / ST_Intersects
    ┌──────┴────────────────────────────────────────┐
    │                                               │
    ▼                                               ▼
┌─────────────────────┐          ┌─────────────────────────────┐
│   puntos_interes    │          │     rutas_* (5 tablas)      │
├─────────────────────┤          ├─────────────────────────────┤
│ id       BIGINT PK  │          │ id          BIGINT PK       │
│ osm_id   BIGINT UNQ │          │ osm_id      BIGINT UNIQUE   │
│ nombre   TEXT       │          │ nombre      TEXT             │
│ tipo     TEXT       │          │ distancia_m FLOAT           │
│ tags     JSONB      │          │ geom        GEOMETRY         │
│ geom     GEOMETRY   │          │   (MultiLineString 4326)    │
│          (Point)    │          │ ascenso_m   FLOAT  ← enrich │
└─────────────────────┘          │ descenso_m  FLOAT  ← enrich │
                                  │ wikidata_desc TEXT ← enrich │
                                  │ enriched_at  TIMESTAMP      │
                                  └─────────────────────────────┘

Tablas rutas: rutas_ciclismo · rutas_senderismo · rutas_sendas_verdes
              rutas_carril_bici · rutas_paseos
```

### 5.2 Recuentos de Registros

| Tabla | Registros | Tipo OSM | Observaciones |
|-------|-----------|----------|---------------|
| `municipios` | 78 | — | 78 concejos de Asturias |
| `puntos_interes` | variable | node/way | `osm_id` UNIQUE constraint |
| `rutas_ciclismo` | 114 | relation | — |
| `rutas_senderismo` | 304 | relation | — |
| `rutas_sendas_verdes` | 23 | relation | — |
| `rutas_carril_bici` | 513 | **way** | `osm_id` negativo (evita colisión con relation IDs); filtradas <50 m |
| `rutas_paseos` | 248 | way + relation | Filtrado: `distancia_m >= 30 m AND ST_NPoints >= 3`; ~74 devueltas para Gijón |

### 5.3 Fuentes de Datos

#### OpenStreetMap (Overpass API)

- **URL base:** `https://overpass-api.de/api/interpreter`
- **Formato respuesta:** JSON
- **Queries:** filtros case-insensitive con `[tag~"regex",i]` (sintaxis Overpass QL)
- **Tipos soportados:** `ciclismo`, `senderismo`, `sendas_verdes`, `carril_bici`, `paseos`

#### Open-Elevation / OpenTopoData

- **Open-Elevation:** POST batch hasta BATCH_SIZE=10 puntos, 50 puntos por ruta (submuestreo)
- **Fallback:** OpenTopoData GET `?locations=lat,lon|lat,lon|...`
- **Resultado:** ascenso acumulado y descenso acumulado en metros

#### Wikidata EntityData

- **URL patrón:** `https://www.wikidata.org/wiki/Special:EntityData/{QID}.json`
- **Estrategia:** busca QID en `tags.wikidata` o `tags.name:etymology:wikidata`
- **Rate limit:** pausa 1 segundo entre peticiones

#### Open-Meteo (meteorología)

- **URL:** `https://api.open-meteo.com/v1/forecast` (accedida desde el servidor, no desde el browser)
- **Sin API key, sin coste** — open source, uso no comercial ilimitado
- **Datos:** temperatura actual + min/max diario + `weather_code` WMO
- **Proxy:** `GET /api/weather?lat=X&lon=Y` en FastAPI → evita restricciones CSP del navegador
- **Caché:** sessionStorage 30 minutos en el cliente — una sola petición al servidor por ubicación y sesión

### 5.4 ETL Scripts

#### `scripts/import_rutas_osm.py`

```bash
python import_rutas_osm.py --tipo ciclismo
python import_rutas_osm.py --tipo carril_bici
python import_rutas_osm.py --tipo paseos

# Argumentos
--tipo         ciclismo|senderismo|sendas_verdes|carril_bici|paseos
--municipio-id (opcional) limitar a un municipio
--dry-run      simula sin insertar
```

**Flujo interno:**
1. Consulta Overpass API con bbox de Asturias
2. Para relations: extrae `members` tipo `way` y concatena coordenadas
3. Para ways: `osm_id = -el.get("id")` (negativo para evitar colisión)
4. Calcula `distancia_m` con fórmula de Haversine
5. Filtra geometrías que intersectan con algún municipio via `ST_Intersects`
6. `INSERT ... ON CONFLICT (osm_id) DO UPDATE`

#### `scripts/enrich_elevacion.py`

```bash
python enrich_elevacion.py --tipo senderismo
python enrich_elevacion.py --tipo ciclismo --municipio-id 24
python enrich_elevacion.py --tipo carril_bici --force
```

#### `scripts/enrich_wikidata.py`

```bash
python enrich_wikidata.py --tipo senderismo
python enrich_wikidata.py --tipo ciclismo --force
```

#### `scripts/update_rutas_monthly.sh`

**Cron entry:**
```cron
0 3 1 * * /home/erpnext/.services/app_asturiasMobile/scripts/update_rutas_monthly.sh >> /var/log/app_asturiasMobile/cron.log 2>&1
```

---

## 6. Guía de Estilo y Diseño UI/UX

### 6.1 Principios de Diseño

| Principio | Implementación |
|-----------|---------------|
| **Paper Mario aesthetic** | Cel-shading con `MeshToonMaterial`, bordes OutlinePass, paleta saturada plana |
| **Mobile-first** | Viewport sin `user-scalable`, `touch-action` declarada, targets mínimo 44 px |
| **Lúdico e inmersivo** | Libro 3D animado como punto de entrada, personaje AstuGuía arrastrable |
| **Sin texturas complejas** | Colores sólidos planos, sprites CanvasTexture generados en runtime |
| **Performance móvil** | `devicePixelRatio` limitado a 1.5, Three.js lazy (solo en `/explorar/`) |
| **Gamificación** | Sellos de pasaporte, trofeos, estadísticas — refuerzo positivo de la exploración |

### 6.2 Paleta de Colores — Variables CSS

```css
/* Fondo y superficies */
--bg-dark:        #1a0a2e;   /* Fondo general — púrpura oscuro */
--bg-panel:       #2d1b4e;   /* Paneles y sidebars */
--bg-overlay:     rgba(26, 10, 46, 0.85);

/* Acento principal */
--accent-yellow:  #ffd700;   /* Dorado Paper Mario — botones, badges */
--accent-gold:    #b8860b;   /* Dorado oscuro — bordes activos */

/* Texto */
--text-primary:   #f5f0e8;   /* Texto principal — crema cálido */
--text-secondary: #c8b89a;   /* Texto secundario — sepia claro */
--text-muted:     #8a7560;   /* Texto terciario — sepia oscuro */

/* Colores categorías — sprites POI */
--cat-restaurantes: #f0b0a0;
--cat-ocio:         #a0d0d0;
--cat-tiendas:      #f0c898;
--cat-mercado:      #d0b0e8;
--cat-ciclismo:     #90d4a0;
--cat-senderismo:   #f0d080;
--cat-sendas-verdes:#80cbc4;
--cat-carril-bici:  #ffc947;
--cat-paseos:       #ce93d8;

/* Colores rutas — TubeGeometry glow */
--route-ciclismo:     #1565ff;
--route-senderismo:   #00e676;
--route-sendas-verdes:#00bfa5;
--route-carril-bici:  #ff8f00;
--route-paseos:       #aa00ff;

/* Interacción */
--touch-min:      44px;      /* Target táctil mínimo */

/* Pasaporte */
--passport-green: #1a3a1a;   /* Cubierta pasaporte */
--passport-gold:  #b8960c;   /* Borde pasaporte */
```

### 6.3 Tipografía

| Uso | Fuente | Peso | Tamaño base |
|-----|--------|------|-------------|
| UI general | Inter | 400 Regular | 14 px |
| Labels activos | Inter | 500 Medium | 14 px |
| Títulos HUD | Inter | 700 Bold | 16–22 px |
| Badges | Inter | 700 Bold | 10 px |

Todos los ficheros WOFF2 en `static/vendor/fonts/`. Sin Google Fonts ni CDN.

### 6.4 Componentes UI Clave

#### Libro 3D (`book.html` + `book.js`)

```
Geometría:  PlaneGeometry (BW=3.2, BD=4.5, BT=0.55)
Fases:      FASE1 cerrado → FASE2 apertura (tween) → FASE3 abierto+Leaflet
Materiales: MeshStandardMaterial (páginas), MeshToonMaterial (tapa/lomo)
Cámara:     OrthographicCamera isométrica
Ornamentos: Cruz de la Victoria (CanvasTexture), Rosa de los Vientos
```

#### Escena 3D Isométrica (`explorar.js`)

```
Cámara:       OrthographicCamera  posición (30, 30, 30) → target (0, 0, 0)
Platform:     ExtrudeGeometry depth=1.5 + rotateX(-π/2) + position.y=-0.75
Superficie Y: ≈ 0.75 (top del terrain) · Sprites: targetY=1.0 · Rutas: y=1.1
Rutas:        TubeGeometry 3 capas (core + halo mid + halo outer)
POI sprites:  CanvasTexture 128 px · círculo color + emoji · billboard
Clusters:     grid hash threshold=0.55 · expand en anillo radio 0.9
Controls:     Touch pinch-zoom (ZOOM_MIN=5, MAX=35) · pan 1 dedo · doble tap reset
              Mouse wheel zoom · drag pan · mouseleave cancel
```

#### Bottom Bar de Categorías

- 9 botones; activo marcado por Jinja2 en renderizado SSR
- `switchCategory(newCat)`: fly-up sprites → limpiar escena → `loadCategory()` (SPA sin reload)
- Icono solo en móvil (`< 576 px`); icono + texto en tablet/desktop

#### Sidebars (POI y Ruta)

| Sidebar | ID | Apertura | Contenido |
|---------|----|---------|-----------|
| POI detail | `#poi-sidebar` | Clase `.open` | Nombre, tipo badge, opening_hours, dirección, minimap 260 px |
| Ruta detail | `#route-sidebar` | Clase `.open` | Nombre, distancia, desnivel ↑/↓, descripción Wikidata, minimap 220 px con trazado |

#### Pasaporte (`#passport-panel`)

```
Panel:   min(95vw, 740px) × min(85vh, 560px)
Layout:  flex-row (≥640px) / flex-col (<640px)
Cubierta: verde #1a3a1a + borde dorado #b8960c
Página izq: crema #f8f3e8 + grid trofeos
Lomo:    10px gradiente marrón
Página der: grid sellos estilo sello postal
```

#### AstuGuía (personaje)

```
Componentes: guia-utils.js    (SVG, typewriter, draggable, localStorage pos)
             guia-book.js     (wizard 4 pasos + captura nombre en book.html)
             guia-explorar.js (comentarista en explorar.html, modo compacto)
             guia-chat.js     (chat directo SSE + captura nombre + miniMd)
Eventos:     book:fase3ready · explorar:ready · explorar:categoryLoaded · explorar:poiSelected
Persistencia: localStorage('guia_pos') para posición del personaje
             sessionStorage('astuguia_player_name') para nombre durante la sesión
             sessionStorage(CONV_KEY) para historial de conversación por página
```

### 6.5 Mobile-First: Breakpoints y Adaptaciones

| Breakpoint | Comportamiento |
|------------|---------------|
| `< 576 px` | Sidebar oculta, solo bottom bar, labels de categoría ocultos |
| `≥ 576 px` | Labels categoría visibles |
| `≥ 640 px` | Pasaporte en layout horizontal (dos páginas en paralelo) |
| `≥ 768 px` | Sidebar izquierda visible (colapsada 56 px, expandida 190 px) |
| Desktop | Mouse controls habilitados, sidebar expandida por defecto |

---

## 7. Documentación de la API

### 7.1 Convenciones Generales

- **Base URL local:** `http://localhost:8002`
- **Base URL producción:** `https://[dominio]/mobile`
- **Formato respuesta:** JSON (`application/json`)
- **Autenticación:** ninguna (API pública)
- **Paginación:** parámetros `limit` y `offset`; header `X-Total-Count` con total
- **Errores:** códigos HTTP estándar + body `{"detail": "mensaje"}`

### 7.2 Health Check

#### `GET /api/v1/health/live`

**Response 200:**
```json
{"status": "ok"}
```

---

### 7.3 Municipios

#### `GET /api/municipios`

Lista todos los municipios de Asturias.

**Response 200:**
```json
[
  {
    "id": 24,
    "nombre": "Gijón",
    "poblacion": 271843,
    "centroide_lon": -5.661,
    "centroide_lat": 43.532
  }
]
```

---

#### `GET /api/municipios/geojson`

FeatureCollection GeoJSON simplificada (tolerancia 0.001°) para Leaflet.

---

#### `GET /api/municipios/{id}`

Detalle con geometría de mayor resolución (tolerancia 0.0001°).

**Response 404:** `{"detail": "Municipio no encontrado"}`

---

### 7.4 Puntos de Interés

#### `GET /api/pois/{municipio_id}?categoria=X&tipo=T&limit=N&offset=N`

| Param | Valores posibles |
|-------|-----------------|
| `categoria` | `comer`, `ocio`, `tiendas`, `mercado` |
| `tipo` | Subtipo OSM: `restaurant`, `museum`, `bakery`, etc. (filtro server-side) |
| `limit` | 1–100 (default 20) |
| `offset` | ≥ 0 (default 0) |

**Response headers:** `X-Total-Count: 47`

**Response 200:** lista de POIs con campos `osm_id`, `nombre`, `tipo`, `lon`, `lat`, `tags` (JSON con `opening_hours`, `addr:street`, `phone`, `website`...)

**Categorías y tipos OSM:**

| Categoría | Tipos OSM incluidos |
|-----------|-------------------|
| `comer` | restaurant, bar, cafe, fast_food, pub, food_court, biergarten |
| `ocio` | cinema, theatre, museum, artwork, park, playground, sports_centre, swimming_pool |
| `tiendas` | supermarket, clothes, shoes, books, electronics, bakery, butcher, florist |
| `mercado` | marketplace (vía proxy `api_mercadoAsturias`) |

---

### 7.5 Rutas

#### `GET /api/rutas/{municipio_id}?tipo=X&limit=N&offset=N`

| Param | Valores posibles |
|-------|-----------------|
| `tipo` | `ciclismo`, `senderismo`, `sendas_verdes`, `carril_bici`, `paseos` |

**Response headers:** `X-Total-Count: 12`

**Response 200:** lista con `id`, `osm_id`, `nombre`, `distancia_m`, `ascenso_m`, `descenso_m`, `wikidata_desc`, `enriched_at`, `geojson`

---

### 7.6 Mercado (Proxy)

#### `GET /api/mercado/{municipio_id}?categoria=X`

Proxy hacia `api_mercadoAsturias:8001`.

| Param `categoria` | Descripción |
|-------------------|-------------|
| `gastro` | Quesos, embutidos, conservas |
| `sidra-bebidas` | Sidrerías, llagares, bebidas |
| `artesania` | Cerámica, tejidos, artesanía local |
| `dulce` | Repostería, pastelerías |
| `huerta-campo` | Verduras, fabes, productos de huerta |
| _(vacío)_ | Todos los comercios |

**Flujo interno:**
1. Resuelve nombre del municipio → slug (sin tildes, guiones)
2. Si `categoria` → llama `/v1/municipios/{slug}/categorias/{cat}/comercios`
3. Si no → llama `/v1/municipios/{slug}/comercios`

---

### 7.7 Meteorología (Proxy)

#### `GET /api/weather?lat=X&lon=Y`

Proxy hacia Open-Meteo. Resuelve las restricciones CSP del navegador manteniendo toda la comunicación externa en el servidor.

| Param | Tipo | Descripción |
|-------|------|-------------|
| `lat` | float | Latitud (ej. 43.532) |
| `lon` | float | Longitud (ej. -5.660) |

**Coste:** ninguno. Open-Meteo es gratuita, open source y sin API key para uso no comercial.

**Response 200:**
```json
{
  "current": {
    "temperature_2m": 14.2,
    "weather_code": 0
  },
  "daily": {
    "temperature_2m_max": [17.1],
    "temperature_2m_min": [9.3]
  }
}
```

**Response 502:** si Open-Meteo no responde → `{}` (el widget queda vacío silenciosamente).

---

### 7.8 AstuGuía Chat (Bridge IA)

#### `POST /api/guia/chat`

Endpoint SSE (Server-Sent Events) para el chat conversacional.

**Content-Type request:** `application/json`
**Content-Type response:** `text/event-stream`

**Request body:**
```json
{
  "message": "¿Qué rutas hay en Gijón?",
  "municipio_id": 24,
  "municipio_nombre": "Gijón",
  "categoria": "senderismo",
  "conversation_id": "conv_abc123",
  "context_type": "explorar_ready"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `message` | string | Mensaje del usuario |
| `municipio_id` | int \| null | ID del municipio actual (null en book.html) |
| `municipio_nombre` | str \| null | Nombre del municipio (evita lookup extra) |
| `categoria` | str \| null | Categoría activa en explorar.html |
| `conversation_id` | str \| null | ID de conversación pibiCo; null para nueva |
| `context_type` | string | `chat` \| `explorar_ready` \| `explorar_poi` \| ... |

**Flujo SSE response:**

```
event: progress
data: {"msg": "Buscando en Gijón..."}

data: ¡Buah! En Gijón

data:  tengo

data:  estas rutas...

data: [DONE]
```

El tag `[NAV:Concejo]` en el texto indica al frontend dónde crear el botón de navegación. Se extrae y elimina del texto visible.

**Reintentar conversación caducada:**
- Si el `conversation_id` caduca → pibiCo devuelve 403 → el frontend reintenta automáticamente con `conversation_id: null`
- El backend emite `event: conv_id\ndata: {nuevo_id}` al iniciar nueva conversación

---

### 7.8 Páginas (SSR)

#### `GET /`

Devuelve `book.html` — punto de entrada principal.

#### `GET /explorar/{municipio_id}?cat=X`

Devuelve `explorar.html`. Los datos del municipio se inyectan como `data-*` en el elemento raíz:
- `data-municipio-id`, `data-municipio-nombre`, `data-cat`
- `data-costero`, `data-geojson`, `data-lat`, `data-lon`

| Param `cat` | Default |
|-------------|---------|
| `senderismo` | si no se especifica |

---

### 7.9 Códigos de Error

| Código HTTP | Significado |
|-------------|-------------|
| 200 | OK |
| 404 | Municipio, POI o ruta no encontrado |
| 422 | Parámetro inválido (validación Pydantic) |
| 500 | Error interno del servidor |
| 503 | Base de datos no disponible |

---

## 8. Configuración y Despliegue

### 8.1 Instalación Local

```bash
cd /home/erpnext/.services/app_asturiasMobile

python3.13 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8002
```

### 8.2 Variables de Entorno

```env
# .env  (raíz del proyecto, NO subir a git)
DATABASE_URL=postgresql+asyncpg://asturiasuser:password@localhost/asturiasmap
PORT=8002
ROOT_PATH=              # vacío en local; /mobile en producción

# AstuGuía — IA
CHAT_API_KEY=pk-...      # API key pibiCo (NUNCA exponer al frontend)
CHAT_NOTEBOOK_ID=nb_4c0b0100c552
CHAT_BASE_URL=https://chat.pibi.co

# OpenAI (fast-path fallback)
OPENAI_API_KEY=sk-...
```

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión asyncpg a PostgreSQL |
| `PORT` | Puerto de escucha (8002) |
| `ROOT_PATH` | Prefijo nginx (`/mobile` en producción) |
| `CHAT_API_KEY` | API key pibiCo — solo backend |
| `CHAT_NOTEBOOK_ID` | ID del notebook RAG en pibiCo |
| `CHAT_BASE_URL` | URL base de la API pibiCo |
| `OPENAI_API_KEY` | API key OpenAI para fast-path fallback |

### 8.3 Configuración Supervisor

```ini
; /etc/supervisor/conf.d/app_asturiasMobile.conf
[program:app_asturiasMobile]
command=/home/erpnext/.services/app_asturiasMobile/venv/bin/gunicorn app.main:app
        --workers %(ENV_CPU_COUNT)s
        --worker-class uvicorn.workers.UvicornWorker
        --bind 127.0.0.1:8002
        --timeout 120
        --preload
        --log-level info
directory=/home/erpnext/.services/app_asturiasMobile
user=erpnext
autostart=true
autorestart=true
stderr_logfile=/var/log/app_asturiasMobile/error.log
stdout_logfile=/var/log/app_asturiasMobile/access.log
```

**Comandos:**
```bash
sudo supervisorctl restart app_asturiasMobile   # OBLIGATORIO tras cambios en Python
sudo supervisorctl status app_asturiasMobile
sudo supervisorctl tail -f app_asturiasMobile
```

### 8.4 Configuración Nginx

```nginx
location /mobile/ {
    proxy_pass         http://127.0.0.1:8002/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    # CRÍTICO para SSE (chat AstuGuía)
    proxy_buffering    off;
    proxy_read_timeout 120s;
}

# Vendor y fuentes — cache inmutable (nunca cambian)
location /mobile/static/vendor/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/vendor/;
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# CSS y JS propios — nunca cachear (deploys instantáneos)
location /mobile/static/css/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/css/;
    add_header Cache-Control "no-cache, must-revalidate";
}

location /mobile/static/js/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/js/;
    add_header Cache-Control "no-cache, must-revalidate";
}
```

> **Reglas críticas de caché:**
> - `proxy_buffering off` es **obligatorio** para que el SSE del chat fluya en tiempo real
> - Los archivos CSS/JS propios nunca usan `immutable`. Cache-busting con `?v=X` en `<script src>` si hay caché existente
> - `vendor/` y `fonts/` sí pueden usar `immutable` (nunca cambian)

### 8.5 Dependencias Python

```
fastapi>=0.115
uvicorn[standard]
gunicorn
sqlalchemy[asyncio]>=2.0
asyncpg
geoalchemy2
pydantic-settings
jinja2
python-multipart
httpx           # proxy mercado + cliente pibiCo
openai          # fast-path fallback
```

---

## 9. Mantenimiento y Escalabilidad

### 9.1 Operaciones de Mantenimiento Habituales

| Tarea | Comando / Acción |
|-------|-----------------|
| Reiniciar app tras cambios Python | `sudo supervisorctl restart app_asturiasMobile` |
| Ver logs de error | `sudo tail -f /var/log/app_asturiasMobile/error.log` |
| Actualizar rutas OSM manualmente | `python scripts/import_rutas_osm.py --tipo ciclismo` |
| Enriquecer elevación un municipio | `python scripts/enrich_elevacion.py --tipo senderismo --municipio-id 24` |
| Forzar re-enriquecimiento Wikidata | `python scripts/enrich_wikidata.py --tipo ciclismo --force` |
| Cache-busting CSS/JS | Incrementar `?v=X` en `<script src>` / `<link href>` en el template |
| Reload nginx | `sudo nginx -t && sudo systemctl reload nginx` |
| Actualizar docs notebook pibiCo | Subir manualmente desde interfaz web del notebook `nb_4c0b0100c552` |

### 9.2 Limitaciones Conocidas

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| **BD compartida** | `asturiasmap` compartida con `app_example`. No modificar `municipios` ni `puntos_interes` sin coordinación | Medio |
| **Enriquecimiento parcial** | Elevación y Wikidata ejecutados solo para algunos municipios (ej. Gijón) | Medio — rutas sin `ascenso_m` muestran `null` |
| **Gamificación client-only** | Pasaporte y trofeos en `localStorage` — se pierden al limpiar el navegador, no son portables entre dispositivos | Bajo — decisión de diseño para evitar autenticación |
| **Open-Meteo dependencia externa** | Gratuita y sin API key, pero depende de disponibilidad del servicio. Si falla → widget vacío, sin impacto en funcionalidad. El proxy backend aísla al cliente de cualquier error de red | Bajo |
| **Overpass API rate limit** | Sin API key, límite de peticiones por IP | Bajo — ETL de ejecución mensual |
| **Sin caché de queries** | Cada petición ejecuta queries PostGIS en tiempo real | Medio — `ST_Intersects` puede ser lento en tablas grandes |
| **Sin autenticación** | API completamente pública | Medio — potencial abuso de endpoints PostGIS pesados |
| **Notebook docs manuales** | Los docs del RAG pibiCo se suben manualmente. Sin automatización de upload | Bajo — cambios en docs son poco frecuentes |

### 9.3 Decisiones Arquitectónicas Clave

| Decisión | Motivo |
|----------|--------|
| **Fast-path antes de OpenAI** | Reduce latencia de 15-60s a <100ms para el 80% de las consultas sobre POIs y rutas de los 78 municipios |
| **API key en backend** | La key de pibiCo y OpenAI nunca llegan al navegador. El frontend solo maneja el `conversation_id` (no secreto) |
| **`setTimeout(0)` para `book:fase3ready`** | Garantiza que `guia-book.js` termina de registrar listeners antes de recibir el evento (evita race condition con el animation loop de Three.js) |
| **CONV_KEY por pathname** | Aísla el historial de conversación por página — explorar/24 y explorar/43 no comparten contexto |
| **`proxy_buffering off`** | Nginx sin buffering es obligatorio para SSE; sin esto, el chat no fluye en tiempo real |
| **Catch-all fast-path** | Frases genéricas ("qué hay", "recomiéndame") cuando hay categoría en contexto → responden con datos BD sin pasar por OpenAI |
| **Municipio detection por longitud de nombre** | Los 78 municipios se ordenan por `LENGTH(nombre) DESC` para que "Cangas del Narcea" matchee antes que "Cangas" |
| **Gamificación localStorage** | Sin autenticación, sin backend adicional, coste cero, experiencia inmediata |

### 9.4 Roadmap Futuro

#### PWA — Progressive Web App (Prioridad Media)

La arquitectura actual ya está preparada. Solo requiere:

```
1. manifest.json       ← nombre, iconos, theme_color, display: standalone
2. service-worker.js   ← cache first para vendor/, network first para API
3. <link rel="manifest"> en base.html
```

#### AstuGuía — Evolución a RAG Propio (Prioridad Baja)

| Componente | Estado actual | Evolución propuesta |
|------------|--------------|---------------------|
| LLM | pibiCo + OpenAI | Claude API (`claude-sonnet-4-6`) directo |
| Vector store | pibiCo RAG | pgvector en `asturiasmap` |
| Base conocimiento | docs manuales en notebook | ETL automático desde OSM + Wikidata |
| UI | ✅ Chat SSE en monigote | Sin cambios necesarios |

#### Optimizaciones de Rendimiento (Prioridad Baja)

| Mejora | Descripción |
|--------|-------------|
| Redis cache | Cachear `/api/municipios/geojson` (cambia solo con ETL) |
| Rate limiting | `slowapi` o nginx `limit_req` para endpoints PostGIS pesados |
| Índices PostGIS | `CREATE INDEX GIST` en columnas `geom` de tablas rutas |
| Enriquecimiento completo | Escalar elevación y Wikidata a todos los municipios |

#### Gamificación — Sincronización (Prioridad Baja)

- Añadir endpoint de guardado en BD para hacer los datos portables entre dispositivos
- Requiere autenticación mínima (OAuth social)

#### Nuevas Categorías OSM (Prioridad Baja)

Categorías candidatas: rutas ecuestres, playas, miradores, patrimonio cultural.

---

## Apéndice A — Historial de Sesiones

| Sesión | Fecha | Contenido |
|--------|-------|-----------|
| `sesion_2026-03-03.md` | 2026-03-03 | Diorama 3D + fix caché nginx |
| `sesion_2026-03-04_s3.md` | 2026-03-04 | preview_login.html libro 3D + Leaflet |
| `sesion_2026-03-05.md` | 2026-03-05 | Fix flash marrón portada libro |
| `sesion_2026-03-06.md` | 2026-03-06 | Refactor → book.html como punto de entrada |
| `sesion_2026-03-06_explorar_mejoras.md` | 2026-03-06 | C-1 a C-8 + touch + rutas + fix y=1.1 |
| `sesion_2026-03-06_touch_controls.md` | 2026-03-06 | Pinch-zoom + pan cámara + fix minimapa |
| `sesion_2026-03-09_poi_sidebar.md` | 2026-03-09 | Sprites subtipo restaurantes + sidebar POI |
| `sesion_2026-03-09_emojis_poi.md` | 2026-03-09 | Emojis por subtipo ocio/tiendas/mercado |
| `sesion_2026-03-09_18-34.md` | 2026-03-09 | Sidebar recortado, rutas con metadatos, AstuGuía enriquecida |
| `sesion_2026-03-10_08-58.md` | 2026-03-10 | Enriquecimiento rutas + route-sidebar + desnivel |
| `sesion_2026-03-10_10-07.md` | 2026-03-10 | Limpieza datos OSM: fix queries, filtros longitud, elevación 100% |
| `sesion_2026-03-10_12-04.md` | 2026-03-10 | Fix paseos (footway/path + filtro 30m), highlight AstuGuía todas categorías, fix mouse pan |
| `sesion_2026-03-11_08-16.md` | 2026-03-11 | Migración RAG propio → widget pibiCo; fix CSP nginx |
| `sesion_2026-03-11_09-27.md` | 2026-03-11 | Chat integrado en monigote (guia-chat.js); fix 403 stale convId |
| `sesion_2026-03-11_13-16.md` | 2026-03-11 | Personalidad AstuGuía: bable, `rnd()`, getTipComment 3 variantes |
| `sesion_2026-03-12_12-05.md` | 2026-03-12 | Markdown en chat: miniMd() inline, fix bug pérdida formato |
| `sesion_2026-03-12_13-06.md` | 2026-03-12 | Captura nombre usuario: wizard s0 + sessionStorage, flujos A y B |
| `sesion_2026-03-12_14-49.md` | 2026-03-12 | Verificación filtro server-side ocio y tiendas |
| `sesion_2026-03-13_09-26.md` | 2026-03-13 | **Bridge IA** `/api/guia/chat` unificado; `services/guia.py`; CONTEXTO_ACTUAL BD; API key en backend |
| `sesion_2026-03-13_11-34.md` | 2026-03-13 | Optimización notebook pibiCo: auditoría docs, `proxy_buffering off`, índice municipio_id, system.md condensado |
| `sesion_2026-03-13_18-41.md` | 2026-03-13 | Docs 5 concejos (Avilés, Somiedo, Ponga, Villaviciosa, Cabrales); fix `detectCategory` fallback `ocio` |
| `sesion_2026-03-18_12-19.md` | 2026-03-18 | Tool `buscar_mercados`; `mercados.md`; proxy mercado con `?categoria=`; fix filtros mercado con `data-cat` slugs; `detectMercadoSubcat` |
| `sesion_2026-03-19_12-25.md` | 2026-03-19 | **Fast-path 78 municipios** (BD cache); CONV_KEY por pathname; botón categoría en explorar vs municipio en book; empty→hardcoded; keywords ampliados; catch-all contexto; fix chat se cerraba al escribir; fix monigote race condition |
| `sesion_2026-03-19.md` | 2026-03-19 | Rediseño pasaporte: dos páginas en paralelo; fix PDF en blanco (`#passport-print-area` fuera del panel) |

---

## Apéndice B — Referencia Rápida de Comandos

```bash
# Arranque desarrollo
cd /home/erpnext/.services/app_asturiasMobile
source venv/bin/activate
uvicorn app.main:app --reload --port 8002

# Producción — reiniciar (OBLIGATORIO tras cambios Python)
sudo supervisorctl restart app_asturiasMobile

# ETL — importar rutas
python scripts/import_rutas_osm.py --tipo senderismo
python scripts/import_rutas_osm.py --tipo ciclismo
python scripts/import_rutas_osm.py --tipo sendas_verdes
python scripts/import_rutas_osm.py --tipo carril_bici
python scripts/import_rutas_osm.py --tipo paseos

# ETL — enriquecer elevación
python scripts/enrich_elevacion.py --tipo senderismo
# ... (repetir para cada tipo)

# ETL — enriquecer Wikidata
python scripts/enrich_wikidata.py --tipo senderismo
# ... (repetir para cada tipo)

# Logs
sudo tail -f /var/log/app_asturiasMobile/error.log
sudo tail -f /var/log/app_asturiasMobile/access.log

# Test bridge AstuGuía
curl -N -X POST http://localhost:8002/api/guia/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"qué rutas hay?","context_type":"explorar_ready","municipio_id":24,"categoria":"senderismo"}'
```

---

*Última actualización: 2026-03-19 · Para actualizar, editar este archivo y mantener sincronizado con los cambios del proyecto.*
