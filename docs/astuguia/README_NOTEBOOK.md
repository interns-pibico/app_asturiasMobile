# AstuGuía — Gestión del Notebook pibiCo

Notebook ID: `nb_4c0b0100c552`

---

## Documentos a mantener en el notebook

Sube (o actualiza) estos documentos en la interfaz del notebook:

| Archivo local | Acción |
|---|---|
| `system.md` | **System prompt base** — subir/reemplazar siempre que cambie |
| `concejos_principales.md` | Contexto cultural de los concejos más visitados |
| `gijon.md` | Contexto detallado de Gijón (si existe) |
| `oviedo.md` | Contexto detallado de Oviedo (si existe) |
| `llanes.md` | Contexto detallado de Llanes (si existe) |
| `senderismo.md` | Contexto rutas de senderismo en Asturias (si existe) |
| `gastronomia.md` | Contexto gastronómico asturiano (si existe) |
| `asturias_general.md` | Contexto general de Asturias (si existe) |

---

## Documentos a ELIMINAR del notebook

Estos documentos son redundantes o irrelevantes con la arquitectura actual:

| Documento | Motivo |
|---|---|
| `categorias.md` | El CONTEXTO_ACTUAL ya informa la categoría activa y el total disponibles en cada llamada. Tener este doc en el RAG solo añade tokens sin valor. |
| `esquema_datos.md` | La IA no consulta la BD directamente. El esquema SQL y los nombres de tablas son irrelevantes para responder preguntas sobre Asturias. |
| `frases_fijas.md` | Eliminado — el wizard es 100% JS local, la IA nunca recibe esos mensajes. El código JS es la fuente de verdad. |
| `flujo_orchestracion.md` | Eliminado — la regla de prioridad de fuentes se movió a `system.md`. El resto era contexto técnico que el modelo no necesita. |

---

## Por qué este diseño

El backend inyecta en **cada llamada** un bloque `CONTEXTO_ACTUAL` con datos reales y en tiempo real:
- Municipio activo (nombre, id, población)
- Nombre del usuario (si lo capturó el wizard)
- Categoría activa y número de ítems disponibles
- Hasta 3 ejemplos reales con distancia y dificultad

Por tanto, los docs del notebook deben aportar **contexto cultural, histórico y narrativo** que no viene de la BD, no información estructural que ya llega dinámica.

---

## Flujo de actualización

1. Editar el archivo `.md` local en `docs/astuguia/`
2. Abrir la interfaz del notebook pibiCo
3. Localizar el documento existente → reemplazar contenido o eliminar + subir nuevo
4. `system.md` es el más crítico — cualquier cambio de identidad o reglas va ahí
