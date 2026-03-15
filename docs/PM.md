# PM.md — Estado de Implementación: app_asturiasMobile

**Última actualización**: 2026-03-13
**Estado general**: ✅ Fases 0-5 completadas — Libro 3D + Explorar isométrico + Rutas OSM + AstuGuía chat + Docs concejos + Navegación categoría inteligente

---

## Fases de Implementación

### ✅ Fase 0: Scaffolding + PM Agent
**Estado**: Completado

- [x] Estructura de directorios creada
- [x] `CLAUDE.md` con guía completa del proyecto
- [x] `.env` apuntando a BD `asturiasmap` (app_example)
- [x] `requirements.txt` con geoalchemy2 incluido
- [x] Virtualenv (pendiente `pip install`)
- [x] PM agent configurado en `.claude/settings.json`
- [x] Archivos de i18n copiados del template
- [x] Middleware (i18n + request_context) copiados

### ✅ Fase 1: Backend FastAPI — APIs de datos
**Estado**: Completado + ampliado

- [x] `app/models/municipio.py` — Modelo Municipio con PostGIS
- [x] `app/models/poi.py` — Modelo PuntoInteres con PostGIS
- [x] `app/schemas/municipio.py` — MunicipioOut, MunicipioDetail, GeoJSON
- [x] `app/schemas/poi.py` — POIOut, POIListResponse
- [x] `app/services/municipio.py` — Queries: list, detail, GeoJSON
- [x] `app/services/poi.py` — Query ST_Within + `opening_hours` + `direccion` (addr:street/full)
- [x] `app/services/ruta.py` — Rutas con coords via ST_SimplifyPreserveTopology
- [x] `app/routers/api/municipios.py` — GET /api/municipios[/geojson|/{id}]
- [x] `app/routers/api/pois.py` — GET /api/pois/{id}?categoria=X
- [x] `app/routers/api/mercado.py` — GET /api/mercado/{id} (proxy a api_mercadoAsturias:8001)
- [x] `app/routers/api/rutas.py` — GET /api/rutas/{id}?tipo=ciclismo|senderismo|sendas_verdes|carril_bici|paseos
- [x] `app/models/ruta.py` — 4 clases ORM: RutaCiclismo, RutaSenderismo, RutaSedasVerdes, RutaCarrilBici, RutaPaseos
- [x] `scripts/import_rutas_osm.py` — import Overpass API para los 5 tipos (relations + ways)
- [x] `app/routers/v1/health.py` — Health live/ready
- [x] `app/main.py` — create_app() factory completo

### ✅ Fase 2: Punto de entrada — Libro 3D + Leaflet integrado
**Estado**: Completado (rediseñado 2026-03-05/06)

> La vista mapa Leaflet standalone fue reemplazada por un libro 3D interactivo
> que al abrirse revela el mapa Leaflet superpuesto sobre la hoja derecha.

- [x] Leaflet 1.9.4 en vendor/leaflet/
- [x] Three.js r170 en vendor/three/ (libro 3D)
- [x] `book.js` — libro 3D Three.js + Leaflet integrado en FASE 3
  - FASE 1: libro cerrado en mesa de madera, cámara top-down
  - FASE 2: animación apertura (portada + 3 páginas, ~6.5s)
  - FASE 3: libro abierto, div Leaflet superpuesto sobre hoja derecha (proyección 3D→2D)
- [x] GeoJSON de municipios desde `/api/municipios/geojson`
- [x] Tap municipio en mapa → card con nombre, población, enlace a Vista 3D
- [x] Botón expandir mapa (móvil) — `is-expanded` CSS class
- [x] Overlay orientación portrait (solo móvil)
- [x] Cruz de la Victoria procedural en portada (CanvasTexture)
- [x] Rosa de los vientos en página izquierda abierta
- [x] `book.css` — estilos libro, leaflet container, municipio card
- [x] `templates/pages/book.html` — template Jinja2, importmap dinámico, data-root
- [x] Patrón ROOT: `data-root="{{ request.scope.get('root_path', '') }}"` → funciona en local y `/mobile/`
- [x] `map.html`, `map.css`, `map.js` eliminados

### ✅ Fase 3: Vista Explorar — Diorama Isométrico por Categoría
**Estado**: Completado (reescrito completo desde explorar.js)
**Ruta**: `GET /explorar/{municipio_id}?cat={categoria}`

#### Arquitectura base
- [x] Three.js r170 ES modules con cámara **ortográfica isométrica** (posición 30,30,30)
- [x] Sin EffectComposer — outlines via BackSide scale hack `OL()`
- [x] MeshToonMaterial (cel-shading nativo)
- [x] Plataforma extruida desde GeoJSON real del municipio (ExtrudeGeometry)
- [x] Transform lon/lat → XZ con corrección cosLat, bbox clamp
- [x] Loading screen con barra de progreso animada
- [x] `explorar.css` + `explorar.html` + `explorar.js`

#### Sprites procedurales por categoría
- [x] Sprites 3D procedurales (no billboards): forma distinta por cat (casa, columna, cúpula, etc.)
- [x] Animación de caída (falling items) desde y=20 con ease + polvo al aterrizar
- [x] Raycaster click/tap → abre panel POI

#### Panel POI (detalle)
- [x] `#poi-detail-panel` con nombre, tipo, descripción, cuisine/dificultad
- [x] `#poi-address` — dirección extraída de `addr:street` + `addr:housenumber` (o `addr:full`)
- [x] `#poi-hours` — horario extraído de `opening_hours`
- [x] `#poi-minimap` — Leaflet mini-mapa con marker del POI
- [x] `#poi-web` — enlace a web del establecimiento

#### Barra inferior de categorías (C-2)
- [x] `#cat-bottom-bar` nav con 9 botones: Bici / Senderismo / Sendas / Carril Bici / Paseos / Restaurantes / Ocio / Tiendas / Mercado
- [x] Botón activo por Jinja2; navegación cambia `?cat=` sin recargar escena
- [x] Solo icono en móvil (<640px), icono+texto en tablet/desktop

#### Touch controls cámara (C-3 / touch session)
- [x] **Pinch 2 dedos** → zoom OrthographicCamera (ZOOM_MIN=5, ZOOM_MAX=35)
- [x] **1 dedo arrastrar** → pan isométrico con `camOffset`
- [x] **Doble tap** → reset vista original
- [x] Tap simple (<6px movimiento) dispara raycast POI
- [x] `{ passive: false }` en touchstart/touchmove; `e.preventDefault()` en drag

#### Rutas OSM — 5 categorías (C-5)
- [x] `buildRouteGlow(coords, color)` — TubeGeometry con 3 capas: core sólido + halo mid (0.35 opac) + halo outer (0.12 opac)
- [x] Funciona con LineString y MultiLineString; posición **y=1.1** (encima del terrain surface en y≈0.75)
- [x] `ROUTE_CATS` Set + `ROUTE_COLORS` map para los 5 tipos
- [x] Fallback a sprites si ninguna ruta tiene coords
- [x] 5 tablas importadas con datos reales de OSM via Overpass API:

| Categoría | Registros | Color glow |
|---|---|---|
| ciclismo | 114 | 0x1565ff |
| senderismo | 304 | 0x00e676 |
| sendas_verdes | 23 | 0x00bfa5 |
| carril_bici | 513 | 0xff8f00 |
| paseos | 248 | 0xaa00ff |

#### Filtro Mercado (C-6)
- [x] `#mercado-filter-panel` condicional (solo cat=mercado)
- [x] Filtrado client-side en `allMercadoItems` por nombre/dirección
- [x] `applyMercadoFilter()` — limpia escena y re-spawna filtrados
- [x] Colores sepia/beige (unificado con resto de filtros)

#### Filtros por subcategoría (C-7) — server-side
- [x] `#cat-filter-panel` condicional (cat restaurantes / ocio / tiendas)
- [x] `CAT_FILTER_TAGS` hardcoded en `explorar.js` (comer, ocio, tiendas — 5/8/8 tipos)
- [x] `updateFilterPanel(cat)` — rellena dinámicamente los tags y muestra/oculta ⚙️ btn
- [x] Click tag → `catFilterTipo = tag.dataset.tipo` → `reloadWithFilter()` → `fetchPage(0)`
- [x] `fetchPage` añade `&tipo=X` a la URL → backend filtra server-side con `AND TRIM(p.tipo) = :tipo`
- [x] `X-Total-Count` refleja el total filtrado; "Cargar más" funciona con filtro activo
- [x] Reset: `catFilterTipo = ''` en `switchCategory()` al cambiar de categoría
- [x] Backend: `services/poi.py` acepta `tipo: str | None`; `routers/api/pois.py` expone `tipo: str | None = Query(default=None)`

#### Vuelta al mapa sin animación (C-1)
- [x] `btn-back` → `sessionStorage.setItem('bookReady','1')` → `book.js` salta a FASE 3 directamente

### ✅ Fase 4: Deploy + Verificación
**Estado**: Completado

- [x] Virtualenv + `pip install -r requirements.txt`
- [x] Compilar traducciones i18n (`pybabel compile`)
- [x] Verificar `/api/municipios/geojson` con datos reales (78 features)
- [x] Configurar Supervisor (`app_asturiasMobile`) — puerto 8002
- [x] Proxy Nginx en `/mobile/` — `Cache-Control: no-cache, must-revalidate` (sin `immutable`)
- [ ] Test exhaustivo en navegador móvil real
- [ ] Validar 60fps en Android gama media (CPU throttle 6x)

### ✅ Fase 5: AstuGuía — Personaje Guía Interactivo
**Estado**: Completado (sesiones 2026-03-09 → 2026-03-12)

#### Arquitectura base del personaje
- [x] `guia-utils.js` — SVG_PERSONAJE, typewriter, makeDraggable (click vs drag umbral 5px), loadPos (localStorage)
- [x] `guia.css` — overlay fixed, personaje bounce/wiggle, burbuja estilo Paper Mario, botones sepia
- [x] Personaje arrastrable con persistencia posición en `localStorage('guia_pos')`
- [x] Bocadillo hint "¿Charramos?" anclado a la cabeza del personaje (`#guia-chat-hint`)

#### Wizard (guia-book.js — book.html)
- [x] **Captura de nombre**: s0 presenta AstuGuía + pregunta nombre en mismo panel (un solo typewriter)
- [x] Input + botón "¡Dale!" en `.guia-name-row` — compacto por defecto, mayor en modo expandido
- [x] `state.playerName` + `sessionStorage('astuguia_player_name')` — compartido con explorar.html durante la sesión
- [x] Wizard 4 pasos: tipo actividad (rutas/gastro/cultura/tiendas) → subtipo → zona (costa/interior/sorpresa) → resultado
- [x] Resultado personalizado con nombre: "¡Buah! Pa lo que busques, {nombre}, {municipio} ye lo tuyo"
- [x] Textos en bable asturiano con variantes `rnd([...])` para evitar repetición
- [x] Botón "💬 Pregunta más" → abre chat | "🗺️ Ir a X" → navega | "Ver en el mapa" → filtro Leaflet

#### Chat directo (guia-chat.js)
- [x] Llamada directa a pibiCo API con fetch + ReadableStream SSE (sin widget externo)
- [x] `showInitialGreeting()`: saluda con nombre si en sessionStorage, si no pregunta (`_awaitingName=true`)
- [x] `handleSend()` intercepta primer mensaje si `_awaitingName`: guarda nombre, responde localmente
- [x] `miniMd()` — render inline markdown en burbujas del bot (**bold**, *italic*, `code`)
- [x] Detección municipio + botón "🗺️ Ir a X" con navegación por categoría inteligente
- [x] `detectCategory(text)` — analiza respuesta del bot y elige cat de destino:
  - comer/sidra/restaurante → `comer` | tiendas → `tiendas` | mercado → `mercado`
  - monumento/museo/visitar → `ocio` | rutas → tipo de ruta específico
  - **fallback**: `ocio` (antes era `senderismo`)
- [x] Categoría `'comer'` canónica (coincide con `CategoriaType` Literal en `/api/pois`)
- [x] Retry 403 automático (conversation_id caducado)
- [x] Toggle maximizar/minimizar chat (`chat-expanded`)

#### Comentarista explorar (guia-explorar.js)
- [x] Modo compacto, toggle 🧭, textos bable, `getTipComment()` 3 variantes/categoría
- [x] `highlightSuggestedPin()` — burbuja ★ + anillo + proyección 3D→2D

---

## Decisiones Arquitectónicas

### Base de Datos
- **Decisión**: Reutilizar BD `asturiasmap` de app_example (read-only)
- **Motivo**: Los 78 municipios y POIs ya están cargados
- **Impacto**: No se crean migraciones que modifiquen esquema existente

### Puerto
- **Decisión**: Puerto 8002
- **Motivo**: app_example usa 8000, app_markets usa 52900

### Three.js Lazy Loading
- **Decisión**: Three.js solo se importa en `explorer.js` (Vista 3D)
- **Motivo**: El mapa Leaflet no necesita WebGL; cargar Three.js solo cuando se entra al municipio ahorra ~500KB en la carga inicial
- **Implementación**: `explorer.js` usa ES module import dinámico vía `<script type="module">`

### Cel-shading
- **Decisión**: MeshToonMaterial + BackSide scale hack (`OL()`)
- **Motivo**: MeshToonMaterial es nativo de Three.js (zero overhead); duplicar mesh con BackSide escalado 1.04 da bordes cómic sin EffectComposer
- **Trade-off**: Sin EffectComposer → mejor rendimiento mobile; el hack `OL()` es suficiente para el estilo Paper Mario

### Sprites para POIs
- **Decisión**: THREE.Sprite con CanvasTexture (emoji dibujado en canvas 2D)
- **Motivo**: Siempre miran a la cámara (billboard), muy eficiente en móvil, icon system sin dependencias externas

### Geometría de Terreno
- **Decisión**: ExtrudeGeometry del GeoJSON simplificado (tolerance 0.001°)
- **Motivo**: Representa el municipio real pero con bajo número de polígonos
- **Simplificación**: ST_SimplifyPreserveTopology a 0.001° en la query PostGIS

---

---

## Decisiones Arquitectónicas Adicionales (2026-03-06)

### Punto de entrada: Libro 3D en lugar de mapa plano
- **Decisión**: `GET /` sirve un libro 3D interactivo (Three.js) que al abrirse revela el mapa Leaflet
- **Motivo**: Experiencia más inmersiva y coherente con el estilo "videojuego móvil"
- **Trade-off**: Animación de ~6.5s antes de llegar al mapa; se acepta por el valor visual

### Patrón ROOT para rutas dinámicas
- **Decisión**: `const ROOT = document.getElementById('app-book').dataset.root || ''`
- **Motivo**: El app corre en `/mobile/` en producción y en `/` en local; hardcodear la ruta rompía uno de los entornos
- **Implementación**: `data-root="{{ request.scope.get('root_path', '') }}"` en el template

---

## Roadmap Futuro

### AstuGuia — Bot RAG
- **Prioridad**: Media (post-MVP)
- **Funcionalidad**: Chat bot guía turístico con conocimiento de Asturias
- **Stack propuesto**: pgvector (extensión de asturiasmap) + Claude API (claude-sonnet-4-6)
- **UI**: Botón flotante "🧭 AstuGuia" en el mapa, pantalla de chat overlay

### PWA
- **Prioridad**: Baja (quick win cuando esté estable)
- **Requisitos**: Solo añadir `manifest.json` + service worker básico
- **Nota**: El `viewport` meta y `theme-color` ya están en `base.html`

### Mejoras 3D
- Shader de agua animada para ríos/costa
- Árboles low-poly generados proceduralmente
- Transición suave entre municipios sin recargar página (SPA mode)

---

## Verificación Checklist

| Test | Estado |
|------|--------|
| `GET /` → 200, libro 3D visible | ✅ |
| `GET /explorar/{id}?cat=restaurantes` → 200, diorama isométrico | ✅ |
| `/api/municipios/geojson` retorna 78 features | ✅ |
| `/api/pois/{id}?categoria=restaurantes` devuelve `opening_hours` y `direccion` | ✅ |
| Libro 3D: animación apertura completa (~6.5s) | ✅ |
| Mapa Leaflet aparece al abrir libro | ✅ |
| Tap municipio → card → enlace `/explorar/{id}` | ✅ |
| ROOT dinámico funciona en local y `/mobile/` | ✅ |
| Botón "← Volver" salta animación libro (sessionStorage) | ✅ |
| Pinch-zoom + pan isométrico en touch | ✅ |
| Doble tap → reset cámara | ✅ |
| Panel POI muestra dirección y horario cuando existen | ✅ |
| Filtro subcategoría (ej. "Bar") re-spawna solo bares | ✅ |
| Filtro mercado funciona con panel sepia/beige | ✅ |
| Barra inferior cambia de categoría sin recargar escena | ✅ |
| 60fps en Android gama media (DevTools CPU throttle 6x) | 🔲 |
| Test exhaustivo en navegador móvil real | 🔲 |
| `/api/rutas/{id}?tipo=carril_bici` → rutas visibles en escena 3D | ✅ |
| Rutas sendas_verdes / carril_bici / paseos visibles con glow | ✅ |
| AstuGuía wizard: s0 pregunta nombre + captura input en mismo panel | ✅ |
| sessionStorage('astuguia_player_name') compartido entre book y explorar | ✅ |
| Chat: saluda con nombre si existe / pregunta nombre si no hay | ✅ |
| Chat: `_awaitingName` intercepta primer mensaje sin llamar a la API | ✅ |
| miniMd(): **bold**, *italic*, `code` en burbujas del bot | ✅ |
| Filtro `&tipo=X` server-side para ocio y tiendas (genérico — sin cambios extra) | ✅ |
| `detectCategory()` fallback `ocio` (antes `senderismo`) + keywords mejorados | ✅ |
| Botón "🗺️ Ir a X" navega a categoría correcta según contenido de respuesta | ✅ |
| docs/astuguia/aviles.md — Avilés (id=4) | ✅ |
| docs/astuguia/somiedo.md — Somiedo (id=65) | ✅ |
| docs/astuguia/ponga.md — Ponga (id=49) | ✅ |
| docs/astuguia/villaviciosa.md — Villaviciosa (id=74) | ✅ |
| docs/astuguia/cabrales.md — Cabrales (id=9) | ✅ |
| Subir 5 docs de concejo nuevos al notebook pibiCo | 🔲 |
| Crear docs/astuguia/gijon.md y oviedo.md (mismos concejos de concejos_principales.md) | 🔲 |
| 60fps en Android gama media (DevTools CPU throttle 6x) | 🔲 |
| Test exhaustivo en navegador móvil real | 🔲 |
