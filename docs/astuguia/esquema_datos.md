# AstuGuía — Esquema de Datos

## Base de datos: asturiasmap (PostgreSQL + PostGIS)

### Tabla: municipios
- 78 municipios (concejos) de Asturias
- Campos: id, nombre, poblacion, geom (MultiPolygon SRID 4326)
- Consulta disponible: id, nombre, población

### Tabla: puntos_interes
- Lugares de interés con coordenadas Point
- Campos: osm_id, nombre, tipo, tags (JSON), geom
- Categorías disponibles en la app: restaurantes, ocio, tiendas, mercado

### Tablas de rutas (5 tablas)
| Tabla | Total registros | Tipo OSM |
|-------|----------------|---------|
| rutas_ciclismo | 114 | relation |
| rutas_senderismo | 304 | relation |
| rutas_sendas_verdes | 23 | relation |
| rutas_carril_bici | 513 | way |
| rutas_paseos | 248 | relation + way |

### Campos de rutas
- `nombre`: nombre oficial de la ruta
- `distancia_m`: distancia en metros
- `dificultad`: 1-5 (1=muy fácil, 5=muy difícil)
- `ascenso_m`: metros de ascenso total
- `descenso_m`: metros de descenso total
- `wikidata_desc`: descripción de Wikidata (puede ser null)
- `enriched_at`: fecha de enriquecimiento con elevación

### Categorías de la app y su significado
- **ciclismo**: rutas de bicicleta de montaña y carretera
- **senderismo**: rutas de montaña y campo (GR, PR, SL)
- **sendas_verdes**: rutas verdes y naturales
- **carril_bici**: infraestructura ciclista urbana y periurbana
- **paseos**: paseos peatonales urbanos y costeros
- **restaurantes**: establecimientos de hostelería con datos OSM
- **ocio**: bares, discotecas, teatros, museos, etc.
- **tiendas**: comercio local (panaderías, librerías, etc.)
- **mercado**: mercados municipales y de productores

## Geografía de Asturias

### Concejos costeros (20)
Avilés, Carreño, Castropol, Coaña, Cudillero, El Franco, Gijón, Gozón, Llanes, Navia, Noreña, Ribadesella, Ribera de Arriba, Siero, Tapia de Casariego, Valdés, Vegadeo, Villaviciosa, Castrillón, San Martín del Rey Aurelio

### Concejos de interior (58)
Resto de concejos, incluyendo Oviedo (capital), Cangas del Narcea, Tineo, Belmonte de Miranda, etc.

## Formato CONTEXTO_ACTUAL

El backend inyecta en cada llamada un bloque como este:
```
CONTEXTO_ACTUAL:
- Municipio: {nombre} (id={id}, {costa/interior}, {poblacion} hab.)
- Categoría activa: {categoria}
- Datos disponibles: {N} {categoria} en este concejo
- Ejemplos: {lista de 2-3 ítems con datos clave}
```

Usa estos datos para hacer respuestas específicas y verídicas.
