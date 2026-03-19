# app_asturiasMobile — Guía del Proyecto

## Descripción

Web app **mobile-first** para explorar el mapa de Asturias y sus municipios con estética y feel de **videojuego móvil estilo Paper Mario**.

- **URL local**: http://localhost:8002
- **Base de datos**: `asturiasmap` (compartida con `app_example`, usuario `asturiasuser` con acceso completo de escritura)
- **Puerto**: 8002

---

## Visual Design: Paper Mario Style

| Elemento | Implementación |
|---|---|
| Cel-shading | `MeshToonMaterial` (Three.js nativo) |
| Bordes cómic | BackSide scale hack `OL()` (sin EffectComposer) |
| Cámara | Ortográfica isométrica 45° posición (30,30,30) |
| Paleta | Colores saturados planos, sin texturas complejas |
| POIs | Sprites CanvasTexture + emoji (billboard) |
| Mapa base | Leaflet 1.9.4 integrado en libro 3D (FASE 3) |

---

## Flujo de la Aplicación

```
GET /
  ↓
Libro 3D (Three.js) — portada animada, apertura ~6.5s
  ↓ [FASE 3 — libro abierto]
Mapa Leaflet (página derecha) — 78 municipios coloreados
  ↓ [tap municipio → card → enlace explorar]
GET /explorar/{id}?cat=senderismo
  ↓
Vista 3D isométrica — terrain ExtrudeGeometry, POIs sprites, rutas TubeGeometry
  ↓ [bottom bar → 9 categorías]
GET /api/pois/{id}?categoria=restaurantes|ocio|tiendas|mercado
GET /api/rutas/{id}?tipo=ciclismo|senderismo|sendas_verdes|carril_bici|paseos
```

---

## Dominio

### Municipio
- 78 municipios (concejos) de Asturias
- Campos: `id`, `nombre`, `poblacion`, `geom` (MultiPolygon SRID 4326)
- Tabla: `municipios` en `asturiasmap`

### PuntoInteres
- Lugares de interés con coordenadas Point
- Campos: `osm_id`, `nombre`, `tipo`, `tags` (JSON), `geom`
- Categorías: restaurantes, ocio, tiendas, mercado
- Tabla: `puntos_interes` en `asturiasmap`

### Rutas OSM (5 tablas)
- `rutas_ciclismo` (114), `rutas_senderismo` (304), `rutas_sendas_verdes` (23), `rutas_carril_bici` (513), `rutas_paseos` (248 total / ~74 en Gijón tras filtro)
- Campos extra enriquecidos: `ascenso_m`, `descenso_m`, `wikidata_desc`, `enriched_at`

---

## API Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/municipios` | Lista todos los municipios |
| GET | `/api/municipios/geojson` | FeatureCollection GeoJSON (para Leaflet) |
| GET | `/api/municipios/{id}` | Detalle + geometría de un municipio |
| GET | `/api/pois/{id}?categoria=X&tipo=T&limit=N&offset=N` | POIs paginados + filtro server-side por tipo, header `X-Total-Count` |
| GET | `/api/rutas/{id}?tipo=X&limit=N&offset=N` | Rutas paginadas, header `X-Total-Count` |
| GET | `/api/mercado/{id}` | Proxy → api_mercadoAsturias:8001 |
| GET | `/api/v1/health/live` | Health check |
| GET | `/` | Vista libro 3D (book.html) |
| GET | `/explorar/{id}?cat=X` | Vista 3D isométrica (explorar.html) |

---

## Stack Técnico

| Capa | Tecnología |
|---|---|
| Backend | FastAPI async + SQLAlchemy 2.0 async |
| DB | PostgreSQL + PostGIS (BD `asturiasmap`, acceso completo con `asturiasuser`) |
| Mapa | Leaflet 1.9.4 (local vendor) |
| 3D | Three.js r170 (local vendor) |
| Chat bot | pibiCo API SSE (notebook `nb_4c0b0100c552`) |
| CSS | Mobile-first, dark game theme, sin frameworks |
| Process | Supervisor + Nginx (puerto 8002) |

---

## Estructura de Archivos Clave

```
app/
├── main.py                    ← create_app() factory
├── core/config.py             ← Settings (DATABASE_URL, port 8002, CHAT_*)
├── models/
│   ├── municipio.py           ← Tabla municipios (PostGIS)
│   ├── poi.py                 ← Tabla puntos_interes
│   └── ruta.py                ← 5 clases ORM rutas_* (PostGIS)
├── services/
│   ├── municipio.py           ← Queries PostGIS con ST_Centroid, ST_AsGeoJSON
│   ├── poi.py                 ← Query espacial ST_Within + paginación + count
│   └── ruta.py                ← ST_Intersects + paginación + filtro longitud
├── routers/
│   ├── pages.py               ← GET /, GET /explorar/{id}
│   └── api/
│       ├── municipios.py      ← /api/municipios[/geojson|/{id}]
│       ├── pois.py            ← /api/pois/{id}?categoria=X&offset=N
│       ├── rutas.py           ← /api/rutas/{id}?tipo=X&offset=N
│       ├── mercado.py         ← proxy → api_mercadoAsturias:8001
│       └── health.py          ← /api/v1/health/live
├── static/
│   ├── css/
│   │   ├── style.css          ← Variables Paper Mario, reset, botones
│   │   ├── book.css           ← Libro 3D + Leaflet container
│   │   ├── explorar.css       ← Canvas + bottom bar + sidebars + POI cards
│   │   └── guia.css           ← AstuGuía overlay, personaje, burbuja, chat, nombre input
│   ├── js/
│   │   ├── book.js            ← Three.js libro 3D + Leaflet FASE3
│   │   ├── explorar.js        ← Three.js escena isométrica (SPA, rutas, POIs, clusters)
│   │   ├── guia-utils.js      ← SVG personaje, typewriter, makeDraggable, loadPos
│   │   ├── guia-book.js       ← AstuGuía wizard 4 pasos + captura nombre (book.html)
│   │   ├── guia-explorar.js   ← AstuGuía comentarista modo compacto (explorar.html)
│   │   └── guia-chat.js       ← Chat directo pibiCo SSE + captura nombre + miniMd
│   └── vendor/
│       ├── leaflet/           ← Leaflet 1.9.4 (JS + CSS + imágenes)
│       ├── three/             ← Three.js r170 + EffectComposer + OutlinePass
│       └── fonts/             ← Inter woff2
└── templates/
    ├── base.html              ← window.ASTUGUIA_CHAT config inline (condicional)
    └── pages/
        ├── book.html          ← Vista libro 3D (data-root, #guia-overlay wizard)
        └── explorar.html      ← Vista 3D (data-municipio-*, #guia-overlay compacto)
```

---

## Convenciones

- **NUNCA CDN externos** — todo en `static/vendor/`
- **Mobile-first CSS** — viewport sin user-scalable, touch-action
- **Lazy Three.js** — solo se carga en `/explorar/{id}`, no en el libro
- **BD compartida** — `asturiasuser` es propietario de todas las tablas; evitar modificar tablas creadas por `app_example` (`municipios`, `puntos_interes`)
- **Touch targets** — mínimo 44px (var --touch-min)
- **Pixel ratio** — `Math.min(devicePixelRatio, 1.5)` para GPU móvil
- **Restart obligatorio** — tras cambios en `services/*.py`, `models/*.py`, `main.py`: `sudo supervisorctl restart app_asturiasMobile`

---

## AstuGuía — Personaje Guía

Monigote interactivo arrastrable presente en ambas vistas.

### guia-book.js (wizard en book.html)
- **s0**: presenta AstuGuía + pregunta nombre del usuario
- Captura nombre → `sessionStorage('astuguia_player_name')` → `state.playerName`
- Wizard 4 pasos: tipo actividad → subtipo → zona → resultado con municipio recomendado
- Resultado personalizado con nombre: "¡Buah! Pa lo que busques, {nombre}, {municipio} ye lo tuyo"
- Botón "💬 Pregunta más" → abre `guia-chat.js`

### guia-chat.js (chat directo API)
- Llamada fetch a pibiCo API con streaming SSE
- `openChatMode()` → `showInitialGreeting()`: saluda con nombre si existe, si no pregunta (`_awaitingName=true`)
- `handleSend()` intercepta primer mensaje si `_awaitingName`: guarda nombre, responde sin llamar API
- `miniMd()` — render inline markdown (**bold**, *italic*, `code`)
- Detección municipio en respuesta → botón "🗺️ Ir a X" con categoría inteligente
- `detectCategory(text)` — detecta la categoría de destino según el contenido de la respuesta:
  - gastronomía/bar/sidra/comer → `comer`
  - tienda/compras/comercio → `tiendas`
  - mercado/productos locales → `mercado`
  - monumento/museo/visitar/cultura → `ocio`
  - rutas → `senderismo|ciclismo|carril_bici|sendas_verdes|paseos`
  - **fallback por defecto**: `ocio` (sugerencia general)
- **Categoría `'comer'` canónica** (NO `'restaurantes'`): coincide con el `Literal` del endpoint `/api/pois`
- Retry automático si `conversation_id` caducado (403 → reintento sin convId)
- `sessionStorage(CONV_KEY)` para mantener contexto entre mensajes

### guia-explorar.js (comentarista en explorar.html)
- Modo compacto `.guia-compact`; botón toggle 🧭
- Escucha eventos: `explorar:ready`, `explorar:categoryLoaded`, `explorar:poiSelected`
- `highlightSuggestedPin()` — burbuja ★ amarilla + anillo sobre item sugerido

### Persistencia nombre
- `sessionStorage('astuguia_player_name')` — compartido entre book.html y explorar.html durante la sesión
- Si el usuario va directo al chat (sin wizard): el chat pregunta el nombre antes de la primera consulta

---

## Desarrollo

```bash
cd /home/erpnext/.services/app_asturiasMobile
source venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

---

## Documentación AstuGuía (notebook pibiCo)

Archivos en `docs/astuguia/` — subir manualmente al notebook `nb_4c0b0100c552`:

| Archivo | Contenido |
|---|---|
| `system.md` | System prompt del bot |
| `categorias.md` | Descripción de las 9 categorías de exploración |
| `esquema_datos.md` | Esquema BD: municipios, POIs, rutas |
| `concejos_principales.md` | Resumen de 8 concejos clave (formato tabla) |
| `aviles.md` | Avilés (id=4) — ~770 palabras, 11 secciones |
| `somiedo.md` | Somiedo (id=65) — ~700 palabras, 9 secciones |
| `ponga.md` | Ponga (id=49) — ~730 palabras, 9 secciones |
| `villaviciosa.md` | Villaviciosa (id=74) — ~800 palabras, 10 secciones |
| `cabrales.md` | Cabrales (id=9) — ~820 palabras, 10 secciones |

**Formato docs de concejo**: ~800 palabras, secciones `##` cortas de 3-5 frases factuales, sin bullet points. Ver Gijón/Oviedo en `concejos_principales.md` como referencia de estilo.

---

## Roadmap Futuro

### AstuGuia — Mejorar RAG
- Sistema actual: pibiCo notebook con docs subidos manualmente
- Mejora propuesta: pgvector + Claude API para RAG propio
- `docs/astuguia/system.md` → system prompt del bot (subir al notebook manualmente)
- **Pendiente**: crear docs individuales para Gijón y Oviedo siguiendo el mismo formato

### PWA
- Solo añadir `manifest.json` + service worker
- viewport meta OK, theme-color en base.html

### Optimizaciones
- Redis para cachear `/api/municipios/geojson`
- Rate limiting en endpoints PostGIS pesados
- Escalar enriquecimiento elevación/Wikidata a todos los municipios
