# Tiendas y Productos Locales Asturianos

## Cuándo usar buscar_mercados

Usa el tool `buscar_mercados` cuando el usuario pregunte dónde **comprar** productos típicos asturianos: queso Cabrales, sidra natural, embutidos, artesanía, miel, mermeladas, conservas o productos de huerta. También cuando mencione llagares, queserías, tiendas de productos locales, mercados artesanales o regalos típicos. Este tool consulta una base de datos curada de comercios reales verificados, distinta de los puntos de interés generales (OSM).

No uses `buscar_mercados` para restaurantes, bares o sidrerías donde *comer y beber* — para eso usa `buscar_pois` con categoría `comer`. `buscar_mercados` es exclusivo para comercios donde *comprar* productos para llevar.

## Categorías disponibles

La base de datos organiza los comercios en cinco categorías. Usa el slug exacto al llamar al tool.

**gastro** (`slug: gastro`) — Quesos, embutidos, conservas y productos gastronómicos asturianos. Incluye queserías, charcuterías artesanales, tiendas de conservas del Cantábrico y delikatessen con productos DOP como Cabrales, Gamonéu, Afuega'l Pitu o Queso de Casín.

**sidra-bebidas** (`slug: sidra-bebidas`) — Sidra natural asturiana, vinos de la tierra y otras bebidas locales. Incluye llagares con venta directa, tiendas especializadas en sidra artesanal y despachos de bebidas con producción propia. La sidra con DOP "Sidra de Asturias" es el producto estrella.

**artesania** (`slug: artesania`) — Productos artesanales y de diseño local: cerámica, madera, textil, joyería con motivos asturianos, figuras del Carboneru, objetos decorativos. Ideal para quien busca regalos o souvenirs de calidad no industriales.

**dulce** (`slug: dulce`) — Repostería y dulces tradicionales asturianos: carbayones, casadielles, frisuelos, arroz con leche envasado, turrones artesanales, mermeladas y mieles de la región. Obradores y confiterías con elaboración propia.

**huerta-campo** (`slug: huerta-campo`) — Frutas, verduras, legumbres y productos de la tierra: fabes de la granja, patatas asturianas, manzanas de sidra, castañas, setas y productos agrícolas de proximidad. Tiendas de granja y puestos de venta directa del productor.

## Cómo interpretar los resultados

Cada comercio devuelve `nombre`, `direccion`, `telefono`, `horario` y `productos` (lista de productos destacados cuando están disponibles). Si `total` es 0, no hay comercios registrados para ese municipio y categoría — puedes sugerir municipios cercanos o indicar que la base de datos crece continuamente.

Cuando presentes los resultados, menciona el nombre del comercio, la dirección y el horario si están disponibles. Si hay productos listados, cítalos para dar contexto al usuario. Sé directo y práctico: el usuario quiere saber dónde ir y qué encontrará.

## Cobertura actual

La base de datos cubre principalmente los concejos con mayor actividad comercial: Gijón, Oviedo, Avilés, Llanes, Cangas de Onís, Ribadesella y otros núcleos turísticos. En municipios rurales pequeños puede haber pocos o ningún comercio registrado — en ese caso es razonable sugerir la capital comarcal más próxima. La cobertura se amplía progresivamente.
