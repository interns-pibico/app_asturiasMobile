# Documentación Técnica — app_asturiasMobile

> **Versión:** 1.2 · **Fecha:** 2026-03-12 · **Rol:** Senior Technical Writer / Arquitecto de Software
> **Formato:** Optimizado para Notion / exportable a Word

---

## Tabla de Contenidos

1. [Información General y Contexto](#1-información-general-y-contexto)
2. [Arquitectura y Flujo del Sistema](#2-arquitectura-y-flujo-del-sistema)
3. [Obtención y Gestión de Datos](#3-obtención-y-gestión-de-datos)
4. [Guía de Estilo y Diseño UI/UX](#4-guía-de-estilo-y-diseño-uiux)
5. [Documentación de la API](#5-documentación-de-la-api)
6. [Configuración y Despliegue](#6-configuración-y-despliegue)
7. [Mantenimiento y Escalabilidad](#7-mantenimiento-y-escalabilidad)

---

## 1. Información General y Contexto

### 1.1 Elevator Pitch

**app_asturiasMobile** es una aplicación web mobile-first para explorar el mapa de Asturias y sus 78 municipios (concejos). El usuario vive la experiencia como si manejara una guía de viaje mágica: un **libro 3D animado** que se abre para revelar el mapa interactivo de la región. Al tocar un municipio, transiciona a una **escena 3D isométrica** de estética _Paper Mario_ donde puede explorar puntos de interés (restaurantes, ocio, tiendas, mercados) y rutas deportivas (ciclismo, senderismo, sendas verdes, carril bici, paseos), con datos reales extraídos de OpenStreetMap.

### 1.2 Objetivo y Alcance

| Dimensión | Descripción |
|-----------|-------------|
| **Objetivo principal** | Visualización lúdica e inmersiva del territorio asturiano para turistas y residentes |
| **Usuarios objetivo** | Turistas con smartphone, ciclistas, senderistas, residentes que buscan ocio local |
| **Alcance geográfico** | 78 municipios de Asturias (Principado de Asturias, España) |
| **Acceso** | Web app responsive; sin autenticación de usuario final |
| **Fuentes de datos** | OpenStreetMap (POIs y rutas), Wikidata (descripciones), Open-Elevation (altimetría) |

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
| Templates | Jinja2 | 3.x |

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
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│  book.js + Three.js r170 (libro 3D)                             │
│  map embebido Leaflet 1.9.4 (página derecha del libro)          │
│  explorar.js + Three.js r170 (escena isométrica)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS  /mobile/
┌──────────────────────▼──────────────────────────────────────────┐
│                         NGINX                                     │
│  /mobile/  → proxy_pass 127.0.0.1:8002                         │
│  /mobile/static/vendor/ → immutable cache 365d                  │
│  /mobile/static/css|js/ → no-cache, must-revalidate             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    SUPERVISOR                                     │
│  [program:app_asturiasMobile]  autorestart=true                  │
│  gunicorn app.main:app -w {CPU} -k UvicornWorker                │
│                  bind 127.0.0.1:8002                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    FASTAPI APP                                    │
│  routers/pages.py      → GET /  · GET /explorar/{id}            │
│  routers/api/          → /api/municipios · /api/pois · ...      │
│  services/             → queries PostGIS async                   │
│  models/               → SQLAlchemy ORM (asturiasuser owner)    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ asyncpg / SQLAlchemy async
┌──────────────────────▼──────────────────────────────────────────┐
│              PostgreSQL + PostGIS  (BD: asturiasmap)             │
│  municipios · puntos_interes · rutas_ciclismo · ...             │
└─────────────────────────────────────────────────────────────────┘

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
```

### 2.2 Flujo de Usuario (User Flow)

```
Usuario abre /
        │
        ▼
[FASE 1] Libro 3D cerrado (Three.js)
        │  tap / click
        ▼
[FASE 2] Animación apertura del libro (Three.js + tweening manual)
        │  completada
        ▼
[FASE 3] Libro abierto — Leaflet cargado en página derecha
         Mapa de Asturias con 78 municipios coloreados
        │  tap municipio → event:book:fase3ready dispatched
        ▼
GET /explorar/{municipio_id}?cat=senderismo
        │
        ▼
[explorar.html] Escena 3D isométrica (Three.js OrthographicCamera)
  ┌─────────────────────────────────────────────────────┐
  │  - Platform terrain (ExtrudeGeometry + bevel)       │
  │  - POI sprites (billboard CanvasTexture + emojis)   │
  │  - Rutas 3D (TubeGeometry 3 capas glow)             │
  │  - Bottom bar: 9 categorías                         │
  │  - Sidebar izquierdo: POI detail / Route detail     │
  │  - Minimap Leaflet (trazado ruta en color cat.)     │
  │  - AstuGuía: personaje arrastrable + burbujas       │
  └─────────────────────────────────────────────────────┘
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
│   │   └── config.py                ← Settings: DATABASE_URL, PORT=8002, ROOT_PATH
│   ├── models/
│   │   ├── municipio.py             ← Tabla municipios (PostGIS MultiPolygon)
│   │   └── poi.py                   ← Tabla puntos_interes (Point)
│   ├── services/
│   │   ├── municipio.py             ← ST_Centroid, ST_AsGeoJSON, ST_Simplify
│   │   ├── poi.py                   ← ST_Within, paginación, count query
│   │   └── rutas.py                 ← ST_Intersects por municipio, paginación
│   └── routers/
│       ├── pages.py                 ← GET /, GET /explorar/{id}
│       └── api/
│           ├── municipios.py        ← /api/municipios[/geojson|/{id}]
│           ├── pois.py              ← /api/pois/{id}?categoria=X&offset=N
│           ├── rutas.py             ← /api/rutas/{id}?tipo=X&offset=N
│           ├── mercado.py           ← proxy → api_mercadoAsturias:8001
│           └── health.py            ← /api/v1/health/live
├── static/
│   ├── css/
│   │   ├── style.css                ← Variables Paper Mario, reset, botones
│   │   ├── book.css                 ← Libro 3D + transición libro→mapa
│   │   ├── explorar.css             ← Canvas + bottom bar + sidebars + POI cards
│   │   └── guia.css                 ← AstuGuía overlay, personaje, burbuja
│   ├── js/
│   │   ├── book.js                  ← Three.js libro 3D + Leaflet integrado
│   │   ├── explorar.js              ← Three.js escena isométrica (SPA, rutas, clusters)
│   │   ├── guia-utils.js            ← SVG personaje, typewriter, draggable, loadPos
│   │   ├── guia-book.js             ← AstuGuía wizard + captura nombre en book.html
│   │   ├── guia-explorar.js         ← AstuGuía comentarista en explorar.html
│   │   └── guia-chat.js             ← Chat directo pibiCo SSE + captura nombre + miniMd
│   └── vendor/
│       ├── leaflet/                 ← Leaflet 1.9.4 (JS + CSS + imágenes PNG)
│       ├── three/                   ← Three.js r170 + EffectComposer + OutlinePass
│       └── fonts/                   ← Inter Regular/Medium/Bold WOFF2
├── templates/
│   ├── base.html                    ← <!DOCTYPE>, meta viewport, ROOT_PATH
│   └── pages/
│       ├── book.html                ← Vista libro (data-root para ROOT_PATH)
│       └── explorar.html            ← Vista 3D (data-municipio-* attrs)
├── scripts/
│   ├── import_rutas_osm.py          ← ETL Overpass API → PostgreSQL
│   ├── enrich_elevacion.py          ← Open-Elevation → ascenso_m/descenso_m
│   ├── enrich_wikidata.py           ← Wikidata → wikidata_desc
│   └── update_rutas_monthly.sh      ← Cron mensual orquestador
└── docs/
    └── DOCUMENTACION_PROYECTO.md    ← Este archivo
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
| `get_pois_by_municipio(id, cat, limit, offset)` | `ST_Within(poi.geom, mun.geom)` | POIs paginados dentro del municipio |
| Retorna | `tuple[list[dict], int]` | Lista de POIs + total count (para `X-Total-Count`) |

#### `services/rutas.py`

| Función | PostGIS usada | Descripción |
|---------|--------------|-------------|
| `get_rutas_by_municipio(id, tipo, limit, offset)` | `ST_Intersects(ruta.geom, mun.geom)` | Rutas que cruzan o están dentro del municipio |
| Retorna | `tuple[list[dict], int]` | Lista de rutas + total count |

---

## 3. Obtención y Gestión de Datos

### 3.1 Modelo de Datos — ERD Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│  BD: asturiasmap (PostgreSQL + PostGIS) — acceso READ-ONLY          │
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

### 3.2 Recuentos de Registros

| Tabla | Registros | Tipo OSM | Observaciones |
|-------|-----------|----------|---------------|
| `municipios` | 78 | — | 78 concejos de Asturias |
| `puntos_interes` | variable | node/way | `osm_id` UNIQUE constraint |
| `rutas_ciclismo` | 114 | relation | — |
| `rutas_senderismo` | 304 | relation | — |
| `rutas_sendas_verdes` | 23 | relation | — |
| `rutas_carril_bici` | 513 | **way** | `osm_id` negativo (evita colisión con relation IDs); filtradas <50 m |
| `rutas_paseos` | 248 | way + relation | Filtrado: `distancia_m >= 30 m AND ST_NPoints >= 3`; ~74 devueltas para Gijón |

### 3.3 Fuentes de Datos

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

### 3.4 ETL Scripts

#### `scripts/import_rutas_osm.py`

```bash
# Uso
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

# Argumentos
--tipo         tipo de ruta a enriquecer
--municipio-id (opcional) filtrar por municipio
--force        re-procesa aunque ya tenga datos (enriched_at NOT NULL)
--dry-run      simula sin actualizar
```

#### `scripts/enrich_wikidata.py`

```bash
python enrich_wikidata.py --tipo senderismo
python enrich_wikidata.py --tipo ciclismo --force
```

#### `scripts/update_rutas_monthly.sh`

```bash
#!/bin/bash
# Orquestador mensual — ejecutado por cron: "0 3 1 * *"
# 1. Re-importa todas las rutas desde Overpass
# 2. Enriquece elevación (todas las tablas)
# 3. Enriquece Wikidata (todas las tablas)
```

**Cron entry:**
```cron
0 3 1 * * /home/erpnext/.services/app_asturiasMobile/scripts/update_rutas_monthly.sh >> /var/log/app_asturiasMobile/cron.log 2>&1
```

---

## 4. Guía de Estilo y Diseño UI/UX

### 4.1 Principios de Diseño

| Principio | Implementación |
|-----------|---------------|
| **Paper Mario aesthetic** | Cel-shading con `MeshToonMaterial`, bordes OutlinePass, paleta saturada plana |
| **Mobile-first** | Viewport sin `user-scalable`, `touch-action` declarada, targets mínimo 44 px |
| **Lúdico e inmersivo** | Libro 3D animado como punto de entrada, personaje AstuGuía arrastrable |
| **Sin texturas complejas** | Colores sólidos planos, sprites CanvasTexture generados en runtime |
| **Performance móvil** | `devicePixelRatio` limitado a 1.5, Three.js lazy (solo en `/explorar/`) |

### 4.2 Paleta de Colores — Variables CSS

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
```

### 4.3 Tipografía

| Uso | Fuente | Peso | Tamaño base |
|-----|--------|------|-------------|
| UI general | Inter | 400 Regular | 14 px |
| Labels activos | Inter | 500 Medium | 14 px |
| Títulos HUD | Inter | 700 Bold | 16–22 px |
| Badges | Inter | 700 Bold | 10 px |

Todos los ficheros WOFF2 en `static/vendor/fonts/`. Sin Google Fonts ni CDN.

### 4.4 Componentes UI Clave

#### Libro 3D (`book.html` + `book.js`)

```
Geometría:  PlaneGeometry (BW=3.2, BD=4.5, BT=0.55)
Fases:      FASE1 cerrado → FASE2 apertura (tween) → FASE3 abierto+Leaflet
Materiales: MeshStandardMaterial (páginas), MeshToonMaterial (tapa/lomo)
Cámara:     OrthographicCamera isométrica
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

```html
<!-- 9 botones, activo marcado por Jinja2 -->
<div id="cat-bottom-bar">
  <button class="cat-btn [active]" data-cat="senderismo">
    <span class="cat-icon">🥾</span>
    <span class="cat-label">Senderismo</span>
  </button>
  <!-- ... -->
</div>
```

- Icono visible solo en móvil (`<576 px`)
- `switchCategory(newCat)`: fly-up sprites → limpiar escena → `loadCategory()` (SPA sin reload)

#### Sidebars (POI y Ruta)

| Sidebar | ID | Apertura | Contenido |
|---------|----|---------|-----------|
| POI detail | `#poi-sidebar` | Clase `.open` | Nombre, tipo badge, opening_hours, dirección, minimap 260 px |
| Ruta detail | `#route-sidebar` | Clase `.open` | Nombre, distancia, desnivel ↑/↓, descripción Wikidata, minimap 220 px con trazado |

#### AstuGuía

```
Componentes: guia-utils.js    (SVG, typewriter, draggable, localStorage pos)
             guia-book.js     (wizard 4 pasos + captura nombre en book.html)
             guia-explorar.js (comentarista en explorar.html, modo compacto)
             guia-chat.js     (chat directo pibiCo SSE + captura nombre + miniMd)
Eventos:     book:fase3ready · explorar:ready · explorar:categoryLoaded · explorar:poiSelected
Persistencia: localStorage('guia_pos') para posición del personaje
             sessionStorage('astuguia_player_name') para nombre durante la sesión
```

**Flujo captura de nombre (Flujo A — wizard primero):**
```
s0 typewriter: "¡Qué pasa paisanu! … ¿Cómo te llames?"
  → input .guia-name-input + botón "¡Dale!" aparecen al terminar el typewriter
  → user escribe nombre → sessionStorage guardado + state.playerName
  → "¡Encantau de conocete {nombre}! ¿Búscote un rincón nel Paraíso?"
  → wizard completo → "💬 Pregunta más" → openChatMode()
  → showInitialGreeting(): "Hola {nombre}, ¿Qué ye lo que quies saber?"
```

**Flujo captura de nombre (Flujo B — chat primero):**
```
click monigote → openChatMode() → showInitialGreeting()
  → historial vacío + sin nombre en sessionStorage
  → appendMessage('bot', 'Hola, ¿Cómo te llames?') + _awaitingName = true
  → user escribe nombre → handleSend() intercepta (no llama API)
  → sessionStorage guardado → "¡Encantau de conocete {nombre}! ¿Qué ye lo que quies saber?"
  → conversación normal con API
```

### 4.5 Mobile-First: Breakpoints y Adaptaciones

| Breakpoint | Comportamiento |
|------------|---------------|
| `< 576 px` | Sidebar oculta, solo bottom bar, labels de categoría ocultos |
| `≥ 576 px` | Labels categoría visibles |
| `≥ 768 px` | Sidebar izquierda visible (colapsada 56 px, expandida 190 px) |
| Desktop | Mouse controls habilitados, sidebar expandida por defecto |

---

## 5. Documentación de la API

### 5.1 Convenciones Generales

- **Base URL local:** `http://localhost:8002`
- **Base URL producción:** `https://[dominio]/mobile`
- **Formato respuesta:** JSON (`application/json`)
- **Autenticación:** ninguna (API pública)
- **Paginación:** parámetros `limit` y `offset`; header `X-Total-Count` con total
- **Errores:** códigos HTTP estándar + body `{"detail": "mensaje"}`

### 5.2 Health Check

#### `GET /api/v1/health/live`

Comprueba que la aplicación responde.

**Response 200:**
```json
{"status": "ok"}
```

---

### 5.3 Municipios

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
  },
  ...
]
```

---

#### `GET /api/municipios/geojson`

Devuelve un GeoJSON `FeatureCollection` con geometrías simplificadas (tolerancia 0.001°) para renderizar en Leaflet.

**Response 200:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "id": 24,
        "nombre": "Gijón",
        "poblacion": 271843
      }
    },
    ...
  ]
}
```

---

#### `GET /api/municipios/{id}`

Devuelve el detalle de un municipio con geometría de mayor resolución (tolerancia 0.0001°).

**Path params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer | ID del municipio |

**Response 200:**
```json
{
  "id": 24,
  "nombre": "Gijón",
  "poblacion": 271843,
  "centroide_lon": -5.661,
  "centroide_lat": 43.532,
  "geojson": "{\"type\":\"MultiPolygon\",\"coordinates\":[...]}"
}
```

**Response 404:**
```json
{"detail": "Municipio no encontrado"}
```

---

### 5.4 Puntos de Interés

#### `GET /api/pois/{municipio_id}?categoria=X&tipo=T&limit=N&offset=N`

Devuelve POIs dentro del municipio, paginados. El filtro `tipo` permite filtrar server-side por subtipo OSM.

**Path params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `municipio_id` | integer | ID del municipio |

**Query params:**

| Param | Tipo | Default | Valores posibles |
|-------|------|---------|-----------------|
| `categoria` | string | — | `restaurantes`, `ocio`, `tiendas`, `mercado` |
| `tipo` | string | `null` | Subtipo OSM: `restaurant`, `museum`, `bakery`, etc. (ver `CAT_FILTER_TAGS` en `explorar.js`) |
| `limit` | integer | 20 | 1–100 |
| `offset` | integer | 0 | ≥ 0 |

**Response headers:**
```
X-Total-Count: 47
```

**Response 200:**
```json
[
  {
    "osm_id": 123456789,
    "nombre": "Restaurante El Retiro",
    "tipo": "restaurant",
    "lon": -5.661,
    "lat": 43.532,
    "tags": {
      "cuisine": "asturian",
      "opening_hours": "Mo-Su 13:00-23:00",
      "addr:street": "Calle Mayor, 5",
      "phone": "+34 985 123 456"
    }
  },
  ...
]
```

**Categorías y tipos OSM asociados:**

| Categoría | Tipos OSM incluidos |
|-----------|-------------------|
| `restaurantes` | restaurant, bar, cafe, fast_food, pub, food_court, biergarten |
| `ocio` | cinema, theatre, museum, artwork, park, playground, sports_centre, swimming_pool, nightclub |
| `tiendas` | supermarket, clothes, shoes, books, electronics, bakery, butcher, florist |
| `mercado` | marketplace, market_place (vía proxy `api_mercadoAsturias`) |

---

### 5.5 Rutas

#### `GET /api/rutas/{municipio_id}?tipo=X&limit=N&offset=N`

Devuelve rutas que intersectan con el municipio, paginadas.

**Path params:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `municipio_id` | integer | ID del municipio |

**Query params:**

| Param | Tipo | Default | Valores posibles |
|-------|------|---------|-----------------|
| `tipo` | string | — | `ciclismo`, `senderismo`, `sendas_verdes`, `carril_bici`, `paseos` |
| `limit` | integer | 20 | 1–100 |
| `offset` | integer | 0 | ≥ 0 |

**Response headers:**
```
X-Total-Count: 12
```

**Response 200:**
```json
[
  {
    "id": 1,
    "osm_id": 987654321,
    "nombre": "Ruta del Cervigón",
    "distancia_m": 12450.5,
    "ascenso_m": 340.2,
    "descenso_m": 338.7,
    "wikidata_desc": "Ruta costera que conecta...",
    "enriched_at": "2026-03-10T03:15:00",
    "geojson": "{\"type\":\"MultiLineString\",\"coordinates\":[...]}"
  },
  ...
]
```

**Campos enriquecidos** (`null` si aún no procesados):

| Campo | Fuente | Descripción |
|-------|--------|-------------|
| `ascenso_m` | Open-Elevation | Desnivel positivo acumulado en metros |
| `descenso_m` | Open-Elevation | Desnivel negativo acumulado en metros |
| `wikidata_desc` | Wikidata EntityData | Descripción en español de la entidad OSM |
| `enriched_at` | Sistema | Timestamp de la última actualización |

---

### 5.6 Mercado (Proxy)

#### `GET /api/mercado/{municipio_id}`

Intermediario hacia `api_mercadoAsturias`, servicio independiente con su propia base de datos (`mercado_asturias`, usuario `mercado_user`), corriendo en puerto 8001.

**Flujo interno:**
1. Resuelve el nombre del municipio desde `asturiasmap` usando el `municipio_id`
2. Convierte el nombre a slug (minúsculas, sin tildes, guiones)
3. Llama a `http://localhost:8001/v1/municipios/{slug}/comercios` vía httpx async
4. Devuelve la respuesta envuelta con metadatos del municipio

**Response 200:**
```json
{
  "municipio_id": 24,
  "municipio_nombre": "Gijón",
  "slug": "gijon",
  "total": 12,
  "items": [...]
}
```

**Comportamiento ante fallos:**
- API no disponible (timeout/conexión) → `{"total": 0, "items": [], "error": "API no disponible"}`
- Municipio sin datos en mercado → `{"total": 0, "items": []}`

> **Nota arquitectural:** `api_mercadoAsturias` es un microservicio independiente con BD propia (`mercado_asturias`). No comparte base de datos con `asturiasmap`. La comunicación es exclusivamente HTTP REST entre los dos servicios locales.

---

### 5.7 Páginas (SSR)

#### `GET /`

Devuelve `book.html` — libro 3D animado con Leaflet embebido. Punto de entrada principal.

#### `GET /explorar/{municipio_id}?cat=X`

Devuelve `explorar.html` — escena 3D isométrica del municipio.

**Query params:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `cat` | string | `senderismo` | Categoría inicial a cargar |

Los datos del municipio se inyectan como atributos `data-*` en el elemento raíz para evitar petición adicional al cargar.

---

### 5.8 Códigos de Error

| Código HTTP | Significado |
|-------------|-------------|
| 200 | OK |
| 404 | Municipio, POI o ruta no encontrado |
| 422 | Parámetro inválido (validación Pydantic) |
| 500 | Error interno del servidor |
| 503 | Base de datos no disponible |

---

## 6. Configuración y Despliegue

### 6.1 Instalación Local

```bash
# Clonar / acceder al directorio
cd /home/erpnext/.services/app_asturiasMobile

# Crear entorno virtual
python3.13 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Arrancar en desarrollo
uvicorn app.main:app --reload --port 8002
```

### 6.2 Variables de Entorno / Configuración

El archivo `app/core/config.py` usa `pydantic-settings` y carga desde `.env`:

```env
# .env  (en raíz del proyecto, NO subir a git)
DATABASE_URL=postgresql+asyncpg://user:password@localhost/asturiasmap
PORT=8002
ROOT_PATH=              # vacío en local; /mobile en producción
```

| Variable | Tipo | Default | Descripción |
|----------|------|---------|-------------|
| `DATABASE_URL` | string | — | Conexión asyncpg a PostgreSQL |
| `PORT` | integer | 8002 | Puerto de escucha |
| `ROOT_PATH` | string | `""` | Prefijo nginx (`/mobile` en producción) |

> **Nota:** `ROOT_PATH` se inyecta en las plantillas Jinja2 como `data-root` en el elemento `#app-book` / `#app-explorar`. El JS lo lee con `dataset.root || ''` para construir URLs correctas tanto en local como en producción.

### 6.3 Configuración Supervisor

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

**Comandos útiles:**

```bash
sudo supervisorctl restart app_asturiasMobile   # reiniciar tras cambios en Python
sudo supervisorctl status app_asturiasMobile    # ver estado
sudo supervisorctl tail -f app_asturiasMobile   # logs en tiempo real
```

> **Importante:** Tras cualquier cambio en `services/*.py`, `models/*.py`, `main.py` o `core/config.py`, es **obligatorio** reiniciar con `supervisorctl restart`.

### 6.4 Configuración Nginx

```nginx
# /etc/nginx/sites-available/app_asturiasMobile
location /mobile/ {
    proxy_pass         http://127.0.0.1:8002/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}

# Estáticos vendor y fuentes — cache agresiva (contenido inmmutable)
location /mobile/static/vendor/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/vendor/;
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# CSS y JS propios — nunca cachear (permite deploys instantáneos)
location /mobile/static/css/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/css/;
    add_header Cache-Control "no-cache, must-revalidate";
}

location /mobile/static/js/ {
    alias /home/erpnext/.services/app_asturiasMobile/static/js/;
    add_header Cache-Control "no-cache, must-revalidate";
}
```

> **Regla crítica de caché:** Los archivos `vendor/` y `fonts/` pueden usar `immutable` (no cambian nunca). Los archivos CSS y JS propios **nunca deben usar `immutable`** — usar `no-cache, must-revalidate`. Si hay caché agresiva existente, añadir cache-busting `?v=X` en los `<script src>` y `<link href>`.

### 6.5 Dependencias Python (`requirements.txt`)

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
httpx           # proxy mercado
```

---

## 7. Mantenimiento y Escalabilidad

### 7.1 Operaciones de Mantenimiento Habituales

| Tarea | Comando / Acción |
|-------|-----------------|
| Reiniciar app tras cambios Python | `sudo supervisorctl restart app_asturiasMobile` |
| Ver logs de error | `sudo tail -f /var/log/app_asturiasMobile/error.log` |
| Actualizar rutas OSM manualmente | `python scripts/import_rutas_osm.py --tipo ciclismo` |
| Enriquecer elevación un municipio | `python scripts/enrich_elevacion.py --tipo senderismo --municipio-id 24` |
| Forzar re-enriquecimiento Wikidata | `python scripts/enrich_wikidata.py --tipo ciclismo --force` |
| Cache-busting CSS/JS | Incrementar `?v=X` en `<script src>` / `<link href>` en el template |
| Reload nginx | `sudo nginx -t && sudo systemctl reload nginx` |

### 7.2 Limitaciones Conocidas

| Limitación | Descripción | Impacto |
|------------|-------------|---------|
| **BD compartida** | `asturiasmap` es compartida con `app_example`. `asturiasuser` es propietario de todas las tablas y tiene acceso completo. Precaución: no modificar tablas que `app_example` use activamente (`municipios`, `puntos_interes`) sin coordinación | Medio — riesgo de conflicto entre apps si se modifica el esquema compartido |
| **Enriquecimiento parcial** | Elevación y Wikidata ejecutados solo para algunos municipios (ej. Gijón id=24) | Medio — rutas sin `ascenso_m`/`descenso_m` muestran `null` en sidebar |
| **Overpass API rate limit** | Sin API key, límite de peticiones por IP | Bajo — scripts ETL son de ejecución mensual |
| **Open-Elevation fallback** | El servicio primario puede estar caído; fallback OpenTopoData también puede fallar | Bajo — datos de elevación pueden quedar incompletos |
| **devicePixelRatio limitado** | Forzado a max 1.5 para rendimiento móvil. Pantallas de alta densidad pueden verse menos nítidas | Bajo — decisión de diseño deliberada |
| **Sin autenticación** | API completamente pública. Sin rate limiting propio (depende de nginx) | Medio — potencial abuso de `/api/rutas/` (queries PostGIS pesadas) |
| **Sin caché de queries** | Cada petición ejecuta queries PostGIS en tiempo real | Medio — `ST_Intersects` sobre rutas puede ser lento en tablas grandes |

### 7.3 Roadmap Futuro

#### AstuGuía — Mejoras RAG (Prioridad Media)

El personaje guía **AstuGuía** está completamente implementado con wizard + chat conectado a pibiCo API (notebook `nb_4c0b0100c552`). La evolución propuesta es migrar a RAG propio:

| Componente | Estado actual | Evolución propuesta |
|------------|--------------|---------------------|
| LLM | pibiCo notebook (RAG externo) | Claude API (`claude-sonnet-4-6`) directo |
| Vector store | Gestionado por pibiCo | pgvector en `asturiasmap` |
| Base conocimiento | `docs/astuguia_system.md` subido manualmente | ETL automático desde OSM + Wikidata |
| UI | ✅ Chat SSE en monigote arrastrable | Sin cambios necesarios |
| Captura nombre | ✅ sessionStorage('astuguia_player_name') | Sin cambios necesarios |

**Tarea pendiente inmediata:**
- Subir `docs/astuguia_system.md` actualizado al notebook pibiCo `nb_4c0b0100c552`

#### PWA — Progressive Web App (Prioridad Media)

La arquitectura actual ya está preparada. Solo requiere:

```
1. manifest.json       ← nombre, iconos, theme_color, display: standalone
2. service-worker.js   ← cache first para vendor/, network first para API
3. <link rel="manifest"> en base.html
```

El `meta viewport` ya está configurado correctamente y no usa `user-scalable=no` (requerido para PWA).

#### Optimizaciones de Rendimiento (Prioridad Baja)

| Mejora | Descripción |
|--------|-------------|
| Redis cache | Cachear respuestas `/api/municipios/geojson` (cambia solo con ETL) |
| Rate limiting | `slowapi` o nginx `limit_req` para endpoints de queries pesadas |
| Índices PostGIS | `CREATE INDEX GIST` en columnas `geom` de tablas rutas (si no existen) |
| Paginación cursor | Sustituir `OFFSET` por cursor en tablas grandes (`rutas_paseos`) |
| Enriquecimiento completo | Escalar `enrich_elevacion.py` y `enrich_wikidata.py` a todos los municipios |

#### Nuevas Categorías OSM (Prioridad Baja)

La arquitectura de `explorar.js` permite añadir nuevas categorías simplemente:
1. Añadiendo la categoría a `ROUTE_CATS` o al set de categorías POI
2. Creando la tabla correspondiente en la BD
3. Añadiendo el botón en `#cat-bottom-bar` y la ruta API

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
| `sesion_2026-03-10_12-04.md` | 2026-03-10 | Fix paseos (footway/path + filtro 30m), highlight AstuGuía todas categorías, fix mouse pan X invertido |
| `sesion_2026-03-11_08-16.md` | 2026-03-11 | Migración RAG propio → widget pibiCo; fix CSP nginx; `docs/astuguia_system.md` creado |
| `sesion_2026-03-11_09-27.md` | 2026-03-11 | Chat integrado en monigote (guia-chat.js); fix 403 stale convId, dots nullificado, system_prompt |
| `sesion_2026-03-11_13-16.md` | 2026-03-11 | Personalidad AstuGuía: bable, `rnd()`, getTipComment 3 variantes/categoría |
| `sesion_2026-03-12_12-05.md` | 2026-03-12 | Markdown en chat: miniMd() inline, fix bug pérdida formato en onDone |
| `sesion_2026-03-12_13-06.md` | 2026-03-12 | Captura nombre usuario: wizard s0 + sessionStorage, flujo A y B, fix input compacto |
| `sesion_2026-03-12_14-49.md` | 2026-03-12 | Verificación filtro server-side ocio y tiendas: mecanismo ya genérico, sin cambios necesarios |

---

## Apéndice B — Referencia Rápida de Comandos

```bash
# Arranque desarrollo
cd /home/erpnext/.services/app_asturiasMobile
source venv/bin/activate
uvicorn app.main:app --reload --port 8002

# Producción — reiniciar
sudo supervisorctl restart app_asturiasMobile

# ETL — importar rutas
python scripts/import_rutas_osm.py --tipo senderismo
python scripts/import_rutas_osm.py --tipo ciclismo
python scripts/import_rutas_osm.py --tipo sendas_verdes
python scripts/import_rutas_osm.py --tipo carril_bici
python scripts/import_rutas_osm.py --tipo paseos

# ETL — enriquecer elevación
python scripts/enrich_elevacion.py --tipo senderismo
python scripts/enrich_elevacion.py --tipo ciclismo
# ... (repetir para cada tipo)

# ETL — enriquecer Wikidata
python scripts/enrich_wikidata.py --tipo senderismo
# ... (repetir para cada tipo)

# Logs
sudo tail -f /var/log/app_asturiasMobile/error.log
sudo tail -f /var/log/app_asturiasMobile/access.log
```

---

*Última actualización: 2026-03-12. Para actualizaciones, editar directamente este archivo y mantener sincronizado con los cambios del proyecto.*
