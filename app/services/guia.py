"""
AstuGuía — Bridge service: DB context builder + system prompt + OpenAI agent streaming.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import unicodedata
from pathlib import Path
from typing import AsyncIterator, Optional

logger = logging.getLogger(__name__)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DOCS_DIR = Path(__file__).parent.parent.parent / "docs" / "astuguia"

# ── Doc cache: each .md loaded once per process lifetime ──────────────────────
_doc_cache: dict[str, str] = {}


def _load_doc(path: Path) -> str:
    """Load and cache a doc by filename. Returns empty string if file not found."""
    key = path.name
    if key not in _doc_cache:
        _doc_cache[key] = path.read_text(encoding="utf-8") if path.exists() else ""
    return _doc_cache[key]


# ── Concejo-specific doc mapping: municipio_id → filename ─────────────────────
_CONCEJO_DOCS: dict[int, str] = {
    24: "gijon.md",
    43: "oviedo.md",
    4:  "aviles.md",
    35: "llanes.md",
    74: "villaviciosa.md",
    9:  "cabrales.md",
    65: "somiedo.md",
    49: "ponga.md",
    55: "ribadesella.md",
    12: "cangas_del_narcea.md",
}

# ── Keyword-to-doc mapping for concejo detection in message text ──────────────
_CONCEJO_KEYWORDS: list[tuple[str, str]] = [
    ("gijón", "gijon.md"), ("gijon", "gijon.md"), ("xixón", "gijon.md"), ("xixon", "gijon.md"),
    ("oviedo", "oviedo.md"),
    ("avilés", "aviles.md"), ("aviles", "aviles.md"),
    ("llanes", "llanes.md"),
    ("villaviciosa", "villaviciosa.md"),
    ("cabrales", "cabrales.md"), ("picos de europa", "cabrales.md"),
    ("somiedo", "somiedo.md"),
    ("ponga", "ponga.md"),
    ("ribadesella", "ribadesella.md"),
    ("cangas del narcea", "cangas_del_narcea.md"),
    ("cangas narcea", "cangas_del_narcea.md"),
    ("cangas", "cangas_del_narcea.md"),
]

# ── Fast-path: keyword → municipio_id (orden: más específico primero) ────────
_MUNICIPIO_TEXT_TO_ID: list[tuple[str, int]] = [
    ("xixón", 24), ("xixon", 24), ("gijón", 24), ("gijon", 24),
    ("oviedo", 43),
    ("avilés", 4), ("aviles", 4),
    ("llanes", 35),
    ("villaviciosa", 74),
    ("picos de europa", 9), ("cabrales", 9),
    ("somiedo", 65),
    ("ponga", 49),
    ("ribadesella", 55),
    ("cangas del narcea", 12), ("cangas narcea", 12), ("cangas", 12),
]

# ── Cache dinámico de todos los municipios (cargado una vez desde BD) ─────────
_municipios_full_cache: Optional[list[dict]] = None  # [{id, nombre, nombre_norm}]


def _norm(s: str) -> str:
    """Normaliza para comparación: minúsculas, sin acentos."""
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


async def _load_all_municipios() -> list[dict]:
    """Carga todos los municipios de la BD (con caché por proceso)."""
    global _municipios_full_cache
    if _municipios_full_cache is not None:
        return _municipios_full_cache
    from app.db.session import async_session_factory
    try:
        async with async_session_factory() as db:
            rows = (await db.execute(
                text("SELECT id, nombre FROM municipios ORDER BY LENGTH(nombre) DESC")
            )).fetchall()
            _municipios_full_cache = [
                {"id": r[0], "nombre": r[1], "nombre_norm": _norm(r[1])}
                for r in rows
            ]
    except Exception as e:
        logger.warning("[guia] No se pudo cargar municipios: %s", e)
        _municipios_full_cache = []
    return _municipios_full_cache


def _get_muni_nombre(municipio_id: Optional[int]) -> str:
    """Devuelve el nombre del municipio desde caché dinámica o dict estático."""
    if not municipio_id:
        return "este concejo"
    if _municipios_full_cache:
        for m in _municipios_full_cache:
            if m["id"] == municipio_id:
                return m["nombre"]
    return _MUNICIPIO_ID_TO_NOMBRE.get(municipio_id, "este concejo")


async def _detect_municipio_db(msg: str) -> Optional[int]:
    """Detecta cualquier municipio asturiano en el mensaje consultando la BD.
    Ordena por longitud descendente para hacer match del nombre más específico primero."""
    municipios = await _load_all_municipios()
    msg_norm = _norm(msg)
    for m in municipios:  # ya ordenados por LENGTH(nombre) DESC en la query
        if m["nombre_norm"] in msg_norm:
            return m["id"]
    return None


# ── Fast-path: keyword sets por intención ────────────────────────────────────
_FP_MERCADO_VERBOS = frozenset([
    "comprar", "compra", "llevar", "llevarse", "regalar", "regalo",
    "adquirir", "donde conseguir", "dónde conseguir",
    "donde encontrar", "dónde encontrar", "donde compro", "dónde compro",
    "donde hay", "dónde hay", "encontrar",
])
_FP_MERCADO_PRODUCTOS = frozenset([
    "queso", "quesucos", "quesería", "queseria", "llagar", "llagares",
    "artesanía", "artesania", "producto local", "productos locales",
    "productos típicos", "productos tipicos", "mercadillo", "mercado artesanal",
    "embutido", "embutidos", "conserva", "conservas",
])
_FP_CARRIL_BICI = frozenset(["carril bici", "carril-bici"])
_FP_SENDERISMO = frozenset([
    "senderismo", "sendero", "senderos", "ruta de montaña", "ruta de montana",
    "caminar", "pr-as", " gr ", "trekking", "hiking", "senda verde", "sendas verdes",
])
_FP_CICLISMO = frozenset([
    "ciclismo", "bicicleta", "en bici", "btt", "vía verde", "via verde",
])
_FP_PASEOS = frozenset(["paseo", "pasear", "caminata"])
_FP_COMER = frozenset([
    "restaurante", "restaurantes", "bar", "bares", "sidrería", "sidrerias",
    "sidreria", "sidrerías", "comer", "cenar", "almorzar", "desayunar",
    "cafetería", "cafeteria", "café", "bocadillo", "fabada", "cachopo",
    "marisco", "pescado", "menú", "menu del dia", "menú del día",
    "gastronomía", "gastronomia", "dónde comer", "donde comer",
    "para comer", "para cenar", "a comer", "a cenar",
    "sidra", "espicha", "pote", "callos", "merluza",
])
_FP_OCIO = frozenset([
    "museo", "museos", "monumento", "monumentos", "mirador", "miradores",
    "castillo", "castillos", "iglesia", "iglesias", "cultura", "cultural",
    "teatro", "teatros", "visitar", "qué visitar", "que visitar",
    "palacio", "ruinas", "arqueológico", "arqueologico",
    "qué ver", "que ver", "qué hay", "que hay",
    "sitio de interés", "sitios de interés", "puntos de interés",
    "atracción", "atracciones", "turismo", "turístico", "turistico",
    "patrimonio", "histórico", "historico",
    "qué hacer", "que hacer", "actividades", "excursiones",
    "lugares", "lugar", "interesante", "interesantes",
    "vale la pena", "merece la pena", "imprescindible",
])
_FP_TIENDAS = frozenset([
    "tienda", "tiendas", "compras", "shopping", "comercio", "comercios",
    "regalo", "regalos", "detalle", "detalles", "souvenir", "souvenirs",
    "recuerdo", "recuerdos", "artesanía", "artesania",
])

# ── Catch-all: palabras de intención exploratoria genérica ───────────────────
# Solo se usan cuando no hay keyword específico de categoría, para activar
# el fast-path con la categoría actual del contexto (explorar.html)
_FP_CATCH_ALL = frozenset([
    "qué puedo", "que puedo", "qué hay", "que hay",
    "cuáles son", "cuales son", "cuáles hay", "cuales hay",
    "qué tienen", "que tienen", "qué me recomiendas", "que me recomiendas",
    "dónde puedo", "donde puedo", "hay algo", "algún", "alguna",
    "recomiéndame", "recomiendame", "recomiendas", "muéstrame", "muestrame",
    "por dónde", "por donde", "qué opciones", "que opciones",
])

# Mapa categoría → (tool_name, args_factory)
_CAT_TO_TOOL: dict[str, tuple[str, str]] = {
    "comer":        ("buscar_pois",  "comer"),
    "ocio":         ("buscar_pois",  "ocio"),
    "tiendas":      ("buscar_pois",  "tiendas"),
    "mercado":      ("buscar_mercados", ""),
    "senderismo":   ("buscar_rutas", "senderismo"),
    "ciclismo":     ("buscar_rutas", "ciclismo"),
    "sendas_verdes":("buscar_rutas", "sendas_verdes"),
    "carril_bici":  ("buscar_rutas", "carril_bici"),
    "paseos":       ("buscar_rutas", "paseos"),
}

# ── Productos típicos asturianos → slug API mercado ───────────────────────────
# Orden: frases más específicas primero
_FP_PRODUCTOS: list[tuple[list[str], str]] = [
    (["queso cabrales", "cabrales"],                 "queso-cabrales"),
    (["afuega'l pitu", "afuegal pitu", "afuega"],    "queso-afuega-l-pitu"),
    (["queso casín", "queso casin", "casín", "casin"], "queso-casin"),
    (["queso vidiago", "vidiago"],                   "queso-vidiago"),
    (["queso la peral", "la peral"],                 "queso-la-peral"),
    (["tres leches", "queso de pría", "queso de pria", "pría"], "queso-tres-leches-de-pria"),
    (["chorizo asturiano", "chorizo"],               "chorizo-asturiano"),
    (["morcilla asturiana", "morcilla"],             "morcilla-asturiana"),
    (["conservas de bonito", "bonito del cantábrico", "bonito"], "conservas-de-bonito"),
    (["anchoas", "anchoa"],                          "anchoas"),
    (["miel de asturias", "miel asturiana", "miel"], "miel-abeja"),
]

_FP_PRODUCTO_SLUGS = {slug for _, slug in _FP_PRODUCTOS}

# ── Municipio ID → nombre canónico (para plantillas de respuesta) ──────────────
_MUNICIPIO_ID_TO_NOMBRE: dict[int, str] = {
    24: "Gijón", 43: "Oviedo", 4: "Avilés", 35: "Llanes",
    74: "Villaviciosa", 9: "Cabrales", 65: "Somiedo",
    49: "Ponga", 55: "Ribadesella", 12: "Cangas del Narcea",
}

# ── Producto slug → nombre legible ────────────────────────────────────────────
_PRODUCTO_SLUG_TO_LABEL: dict[str, str] = {
    "queso-cabrales": "queso Cabrales",
    "queso-afuega-l-pitu": "queso Afuega'l Pitu",
    "queso-casin": "queso Casín",
    "queso-vidiago": "queso Vidiago",
    "queso-la-peral": "queso La Peral",
    "queso-tres-leches-de-pria": "queso Tres Leches de Prîa",
    "chorizo-asturiano": "chorizo asturiano",
    "morcilla-asturiana": "morcilla asturiana",
    "conservas-de-bonito": "conservas de bonito",
    "anchoas": "anchoas del Cantábrico",
    "miel-abeja": "miel asturiana",
}

# ── Categoria → verbo y categoría URL ────────────────────────────────────────
_CAT_VERB: dict[str, str] = {
    "comer": "comer", "ocio": "visitar", "tiendas": "comprar",
    "mercado": "encontrar mercados locales",
    "senderismo": "hacer senderismo", "ciclismo": "ir en bici",
    "sendas_verdes": "pasear por sendas verdes",
    "carril_bici": "pedalear por carril bici", "paseos": "pasear",
}
_CAT_URL: dict[str, str] = {
    "comer": "comer", "ocio": "ocio", "tiendas": "tiendas", "mercado": "mercado",
    "senderismo": "senderismo", "ciclismo": "ciclismo",
    "sendas_verdes": "sendas_verdes", "carril_bici": "carril_bici", "paseos": "paseos",
}


def _build_fast_response(
    tool_name: str,
    tool_args: dict,
    tool_result: str,
    player_name: Optional[str],
    municipio_id: Optional[int],
    municipio_nombre: Optional[str] = None,
) -> str:
    """
    Genera la respuesta de plantilla para fast-path sin llamar a OpenAI.
    Devuelve el texto completo con markdown y tag [NAV:X] si aplica.
    """
    greeting = f"¡Hola, **{player_name}**! " if player_name else "¡Hola! "
    try:
        data = json.loads(tool_result)
    except Exception:
        return greeting + "Non atopei nada pa esa búsqueda, paisanu."

    # ── buscar_por_producto: lista agrupada por municipio ──────────────────────
    if tool_name == "buscar_por_producto":
        slug = tool_args.get("producto_slug", "")
        label = _PRODUCTO_SLUG_TO_LABEL.get(slug, slug.replace("-", " "))
        comercios = data.get("comercios", [])
        total = data.get("total", 0)
        if total == 0:
            return greeting + f"Lo siento, nun tengo información sobre tiendas con **{label}** agora mesmo. Pero pues explorar por tu cuenta."

        # Agrupar por municipio (máx 3 municipios, 4 tiendas c/u)
        grupos: dict[str, list[str]] = {}
        for c in comercios:
            muni = c.get("municipio") or "Asturias"
            grupos.setdefault(muni, []).append(c.get("nombre", ""))

        lineas = []
        nav_muni = None
        for muni, nombres in list(grupos.items())[:3]:
            if nav_muni is None:
                nav_muni = muni
            names_str = ", ".join(f"**{n}**" for n in nombres[:4])
            lineas.append(f"En **{muni}**: {names_str}")

        nav = f" [NAV:{nav_muni}]" if nav_muni else ""
        return greeting + f"Pa comprar **{label}** en Asturias 🧀:\n" + "\n".join(lineas) + "." + nav

    # ── buscar_mercados: mercados de un concejo ────────────────────────────────
    if tool_name == "buscar_mercados":
        muni_nombre = (
            municipio_nombre
            or _get_muni_nombre(municipio_id)
            or data.get("municipio", "este concejo")
        )
        comercios = data.get("comercios", [])
        total = data.get("total", 0)
        nav = f" [NAV:{muni_nombre}]" if muni_nombre and muni_nombre != "este concejo" else ""
        if total == 0:
            return greeting + f"Lo siento, nun tengo información sobre esto en **{muni_nombre}**. Pero pues explorar por tu cuenta.{nav}"
        nombres = [f"**{c.get('nombre', '')}**" for c in comercios[:6]]
        lista = ", ".join(nombres)
        return greeting + f"En **{muni_nombre}** puedes comprar productos locales en: {lista}.{nav}"

    # ── buscar_pois: POIs de categoría en un concejo ──────────────────────────
    if tool_name == "buscar_pois":
        cat = tool_args.get("categoria", "")
        muni_nombre = (
            municipio_nombre
            or _get_muni_nombre(municipio_id or tool_args.get("municipio_id"))
        )
        verb = _CAT_VERB.get(cat, "explorar")
        items = data.get("items", [])
        total = data.get("total", 0)
        nav = f" [NAV:{muni_nombre}]" if muni_nombre and muni_nombre != "este concejo" else ""
        if total == 0:
            return greeting + f"Lo siento, nun tengo información sobre esto en **{muni_nombre}**. Pero pues explorar por tu cuenta.{nav}"
        nombres = [f"**{i.get('nombre', '')}**" for i in items[:6]]
        lista = ", ".join(nombres)
        nav = f" [NAV:{muni_nombre}]" if muni_nombre else ""
        return greeting + f"En **{muni_nombre}** puedes {verb}: {lista}.{nav}"

    # ── buscar_rutas: rutas de un tipo en un concejo ──────────────────────────
    if tool_name == "buscar_rutas":
        tipo = tool_args.get("tipo", "")
        muni_nombre = (
            municipio_nombre
            or _get_muni_nombre(municipio_id or tool_args.get("municipio_id"))
        )
        verb = _CAT_VERB.get(tipo, "explorar rutas")
        rutas = data.get("rutas", [])
        total = data.get("total", 0)
        nav = f" [NAV:{muni_nombre}]" if muni_nombre and muni_nombre != "este concejo" else ""
        if total == 0:
            return greeting + f"Lo siento, nun tengo información sobre esto en **{muni_nombre}**. Pero pues explorar por tu cuenta.{nav}"
        items_fmt = []
        for r in rutas[:5]:
            nombre = r.get("nombre") or "Ruta sin nombre"
            km = r.get("distancia_km")
            items_fmt.append(f"**{nombre}**" + (f" ({km:.1f} km)" if km else ""))
        lista = ", ".join(items_fmt)
        cat_url = _CAT_URL.get(tipo, tipo)
        nav = f" [NAV:{muni_nombre}]" if muni_nombre else ""
        return greeting + f"En **{muni_nombre}** puedes {verb}: {lista}.{nav}"

    return greeting + "Ei, non sei cómo respondete a eso, paisanu."


def _detect_producto(msg: str) -> Optional[str]:
    """Detecta si el mensaje menciona un producto típico asturiano. Retorna su slug o None."""
    msg_lower = msg.lower()
    for keywords, slug in _FP_PRODUCTOS:
        if any(k in msg_lower for k in keywords):
            return slug
    return None


def _detect_municipio_from_text(msg: str) -> Optional[int]:
    """Detecta municipio_id desde el texto. Evalúa keywords en orden de especificidad."""
    msg_lower = msg.lower()
    for kw, muni_id in _MUNICIPIO_TEXT_TO_ID:
        if kw in msg_lower:
            return muni_id
    return None


def _detect_fast_path(
    message: str,
    municipio_id: Optional[int],
    categoria: Optional[str],
) -> Optional[tuple[str, dict]]:
    """
    Detecta si el mensaje puede resolverse sin Phase 1 de OpenAI.
    Requiere municipio_id conocido + señal clara de intención.
    Devuelve (tool_name, args) o None.
    """
    if not municipio_id:
        return None

    msg = message.lower()
    tiene_verbo_compra = any(v in msg for v in _FP_MERCADO_VERBOS)

    # 1. Mercado local — producto típico O (sidra + verbo compra)
    if any(p in msg for p in _FP_MERCADO_PRODUCTOS):
        return ("buscar_mercados", {"municipio_id": municipio_id})
    if "sidra" in msg and tiene_verbo_compra:
        return ("buscar_mercados", {"municipio_id": municipio_id})

    # 2. Carril bici (más específico que ciclismo)
    if any(k in msg for k in _FP_CARRIL_BICI):
        return ("buscar_rutas", {"municipio_id": municipio_id, "tipo": "carril_bici"})

    # 3. Senderismo / sendas verdes
    if any(k in msg for k in _FP_SENDERISMO):
        tipo = "sendas_verdes" if ("senda verde" in msg or "sendas verdes" in msg) else "senderismo"
        return ("buscar_rutas", {"municipio_id": municipio_id, "tipo": tipo})

    # 4. Ciclismo
    if any(k in msg for k in _FP_CICLISMO):
        return ("buscar_rutas", {"municipio_id": municipio_id, "tipo": "ciclismo"})

    # 5. Paseos
    if any(k in msg for k in _FP_PASEOS):
        return ("buscar_rutas", {"municipio_id": municipio_id, "tipo": "paseos"})

    # 6. POI comer
    if any(k in msg for k in _FP_COMER):
        return ("buscar_pois", {"municipio_id": municipio_id, "categoria": "comer"})

    # 7. POI ocio
    if any(k in msg for k in _FP_OCIO):
        return ("buscar_pois", {"municipio_id": municipio_id, "categoria": "ocio"})

    # 8. POI tiendas
    if any(k in msg for k in _FP_TIENDAS):
        return ("buscar_pois", {"municipio_id": municipio_id, "categoria": "tiendas"})

    # 9. Catch-all: intención exploratoria genérica + categoría de contexto disponible
    # Ej: "¿qué hay aquí?" en explorar/senderismo → buscar_rutas senderismo
    if categoria and categoria in _CAT_TO_TOOL and any(k in msg for k in _FP_CATCH_ALL):
        tool_name, subtype = _CAT_TO_TOOL[categoria]
        if tool_name == "buscar_mercados":
            return ("buscar_mercados", {"municipio_id": municipio_id})
        elif tool_name == "buscar_pois":
            return ("buscar_pois", {"municipio_id": municipio_id, "categoria": subtype})
        else:
            return ("buscar_rutas", {"municipio_id": municipio_id, "tipo": subtype})

    return None


async def _try_fast_path(
    message: str,
    municipio_id: Optional[int],
    categoria: Optional[str],
) -> Optional[tuple[str, dict, str]]:
    """
    Intenta resolver la query sin Phase 1 de OpenAI.
    Devuelve (tool_name, args, result_json) si hay match, None si no.
    """
    resolved_mid = municipio_id or _detect_municipio_from_text(message)

    # ── Si detección estática falla, consultar BD con todos los municipios ──
    if not resolved_mid:
        resolved_mid = await _detect_municipio_db(message)
        if resolved_mid:
            logger.debug("[guia] fast-path municipio detectado via BD: id=%s", resolved_mid)

    # ── Prioridad: búsqueda por producto típico (independiente de municipio) ──
    tiene_intención_compra = (
        any(v in message.lower() for v in _FP_MERCADO_VERBOS)
        or any(p in message.lower() for p in _FP_MERCADO_PRODUCTOS)
    )
    producto_slug = _detect_producto(message)
    if producto_slug and tiene_intención_compra:
        prod_args = {"producto_slug": producto_slug}
        prod_result = await _execute_tool("buscar_por_producto", prod_args)
        try:
            prod_data = json.loads(prod_result)
            if prod_data.get("total", 0) > 0:
                logger.info("[guia] fast-path producto=%s total=%s", producto_slug, prod_data["total"])
                return ("buscar_por_producto", prod_args, prod_result)
        except Exception:
            pass

    detected = _detect_fast_path(message, resolved_mid, categoria)

    if not detected:
        logger.debug("[guia] phase1 mid=%s cat=%s msg=%r", resolved_mid, categoria, message[:60])
        return None

    tool_name, tool_args = detected
    result_json = await _execute_tool(tool_name, tool_args)

    # Si el resultado está vacío o es un error, intentar fallback o volver a Phase 1
    try:
        result_data = json.loads(result_json)
        if "error" in result_data:
            logger.debug("[guia] fast-path aborted (error): %s", result_data["error"])
            return None

        is_empty = (
            result_data.get("total") == 0
            or (not result_data.get("items") and not result_data.get("rutas")
                and not result_data.get("comercios") and not result_data.get("municipios"))
        )
        if is_empty:
            # Fallback especial: buscar_mercados vacío → intentar buscar_pois categoria=mercado
            if tool_name == "buscar_mercados":
                mid = tool_args["municipio_id"]
                logger.debug("[guia] fast-path fallback: buscar_mercados empty → buscar_pois mercado mid=%s", mid)
                fallback_args = {"municipio_id": mid, "categoria": "mercado"}
                fallback_json = await _execute_tool("buscar_pois", fallback_args)
                try:
                    fallback_data = json.loads(fallback_json)
                    if not (fallback_data.get("total") == 0 or not fallback_data.get("items")):
                        logger.info("[guia] fast-path fallback OK: buscar_pois mercado mid=%s", mid)
                        return ("buscar_pois", fallback_args, fallback_json)
                except Exception:
                    pass
            # Aunque vacío, devolver fast-path para que _build_fast_response genere mensaje "no encontré"
            # NO caer a OpenAI — ya hay respuesta hardcodeada para resultados vacíos
            logger.debug("[guia] fast-path empty result tool=%s → template sin resultados", tool_name)
    except Exception:
        pass

    logger.info("[guia] fast-path tool=%s args=%s", tool_name, tool_args)
    return (tool_name, tool_args, result_json)


# ── Fast-path Phase 2: system prompt mínimo (~150 tokens vs ~4000) ───────────
# Cuando fast-path ya ejecutó el tool, el modelo solo necesita formatear el resultado.
# No necesita los docs culturales ni las definiciones de tools.
_FAST_PATH_SYSTEM = (
    "Eres AstuGuía, guía turístico de Asturias con personalidad de videojuego. "
    "Amigable, entusiasta, usa bable asturiano natural (ye, paisanu, toy, pa, guapi, asgaya). "
    "Formato: máximo 3-4 frases, **negritas** en nombres de lugares, 1-2 emojis. "
    "Nunca empieces con 'Claro que sí', 'Por supuesto' ni frases genéricas. "
    "REGLAS: "
    "(1) Usa SOLO los datos del tool result. Nunca añadas nombres de tu conocimiento propio. "
    "(2) Si los datos están vacíos, di: 'En estos momentos non tengo datos específicos sobre esto. "
    "¡Explora el mapa pa descubrirlo!' "
    "(3) Añade [NAV:NombreConcejo] al final SOLO si recomiendas un destino concreto. "
    "(4) NUNCA muestres JSON ni datos técnicos en tu respuesta."
)

# ── Límite de historial: máx 8 mensajes (4 intercambios) por petición ─────────
_MAX_HISTORY = 8

# ── Slugs allowed for the leer_doc tool ───────────────────────────────────────
_LEER_DOC_SLUGS: list[str] = [
    "asturias_general", "gastronomia", "senderismo", "ciclismo", "mercados",
    "gijon", "oviedo", "aviles", "llanes", "villaviciosa",
    "cabrales", "somiedo", "ponga", "ribadesella", "cangas_del_narcea",
]


def _select_docs(
    message: str,
    municipio_id: Optional[int],
    categoria: Optional[str],
) -> list[Path]:
    """
    Select relevant docs for the system prompt based on message content,
    municipio_id, and categoria. Returns ordered list of Paths.

    Always: system.md + concejos_principales.md (2 docs, ~2K tokens)
    Group 1 (max 1): senderismo.md or ciclismo.md
    Group 2 (max 1): gastronomia.md or mercados.md
    Group 3 (max 1): concejo-specific doc
    Fallback: asturias_general.md only when groups 1/2/3 are all empty
    """
    always = [DOCS_DIR / "system.md", DOCS_DIR / "concejos_principales.md"]
    group1: Optional[Path] = None
    group2: Optional[Path] = None
    group3: Optional[Path] = None
    any_selected = False

    msg_lower = message.lower()

    # ── Group 1: activity ──
    senderismo_cats = {"senderismo", "sendas_verdes"}
    senderismo_kw = ("senderismo", "sendero", "ruta de montaña", "ruta de montana",
                     "caminar", "pr-as", " gr ", "trekking", "hiking")
    ciclismo_cats = {"ciclismo", "carril_bici"}
    ciclismo_kw = ("ciclismo", "bicicleta", "en bici", "carril bici", "carril-bici",
                   "btt", "vía verde", "via verde")

    if categoria in senderismo_cats or any(k in msg_lower for k in senderismo_kw):
        group1 = DOCS_DIR / "senderismo.md"
        any_selected = True
    elif categoria in ciclismo_cats or any(k in msg_lower for k in ciclismo_kw):
        group1 = DOCS_DIR / "ciclismo.md"
        any_selected = True

    # ── Group 2: gastro / market ──
    gastro_kw = ("restaurante", "fabada", "cachopo", "sidra", "gastronomía", "gastronomia",
                 "sidrería", "sidreria", "comer", "comida", "cocina asturiana",
                 "marisco", "pescado", "pote asturiano", "bar", "cenar", "almorzar")
    mercado_kw = ("comprar", "tienda", "mercado", "producto local", "productos locales",
                  "regalo", "llevar", "llagar", "quesería", "queseria",
                  "artesanía", "artesania", "mercadillo")

    if categoria == "comer" or any(k in msg_lower for k in gastro_kw):
        group2 = DOCS_DIR / "gastronomia.md"
        any_selected = True
    elif categoria == "mercado" or any(k in msg_lower for k in mercado_kw):
        group2 = DOCS_DIR / "mercados.md"
        any_selected = True

    # ── Group 3: concejo ──
    if municipio_id and municipio_id in _CONCEJO_DOCS:
        group3 = DOCS_DIR / _CONCEJO_DOCS[municipio_id]
        any_selected = True
    else:
        for kw, fname in _CONCEJO_KEYWORDS:
            if kw in msg_lower:
                group3 = DOCS_DIR / fname
                any_selected = True
                break

    # ── Fallback ──
    fallback: Optional[Path] = DOCS_DIR / "asturias_general.md" if not any_selected else None

    return [p for p in [*always, group1, group2, group3, fallback] if p is not None]


def _build_selected_system_base(
    message: str,
    municipio_id: Optional[int],
    categoria: Optional[str],
) -> str:
    """Build system base string from selected docs only."""
    selected = _select_docs(message, municipio_id, categoria)
    parts: list[str] = []
    for i, path in enumerate(selected):
        content = _load_doc(path)
        if content:
            parts.append(content if i == 0 else f"\n\n---\n\n{content}")
    return "".join(parts)


# ── Route table names by category ──────────────────────────────────────────
ROUTE_TABLES = {
    "ciclismo": "rutas_ciclismo",
    "senderismo": "rutas_senderismo",
    "sendas_verdes": "rutas_sendas_verdes",
    "carril_bici": "rutas_carril_bici",
    "paseos": "rutas_paseos",
}

POI_CATS = {"comer", "ocio", "tiendas", "mercado"}

# ── In-memory cache for DB context ─────────────────────────────────────────
_db_context_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes


async def _fetch_municipio(db: AsyncSession, municipio_id: int) -> Optional[dict]:
    row = await db.execute(
        text("SELECT nombre, poblacion FROM municipios WHERE id = :id"),
        {"id": municipio_id},
    )
    muni = row.fetchone()
    if muni:
        return {"id": municipio_id, "nombre": muni[0], "poblacion": muni[1]}
    return None


async def _fetch_category_routes(db: AsyncSession, municipio_id: int, categoria: str) -> Optional[dict]:
    table = ROUTE_TABLES[categoria]
    r = await db.execute(
        text(f"""
            SELECT COUNT(*) FROM {table}
            WHERE municipio_id = :mid AND distancia_m >= 30
        """),
        {"mid": municipio_id},
    )
    total = r.scalar() or 0
    ex = await db.execute(
        text(f"""
            SELECT nombre, distancia_m, dificultad FROM {table}
            WHERE municipio_id = :mid AND distancia_m >= 30
            AND nombre IS NOT NULL
            ORDER BY distancia_m DESC LIMIT 3
        """),
        {"mid": municipio_id},
    )
    return {
        "categoria": categoria,
        "total": total,
        "ejemplos": [
            {
                "nombre": row[0],
                "distancia_km": round(row[1] / 1000, 1) if row[1] else None,
                "dificultad": row[2],
            }
            for row in ex.fetchall()
        ],
    }


async def _fetch_category_pois(db: AsyncSession, municipio_id: int, categoria: str) -> Optional[dict]:
    from app.services.poi import CATEGORIA_TIPOS
    tipos = CATEGORIA_TIPOS.get(categoria, [])
    if not tipos:
        return None
    r = await db.execute(
        text("""
            SELECT COUNT(*) FROM puntos_interes p
            JOIN municipios m ON ST_Within(p.geom, m.geom)
            WHERE m.id = :mid
            AND (
                TRIM(p.tipo) = ANY(:tipos)
                OR p.tags->>'amenity' = ANY(:tipos)
                OR p.tags->>'shop' = ANY(:tipos)
                OR p.tags->>'tourism' = ANY(:tipos)
                OR p.tags->>'historic' = ANY(:tipos)
            )
            AND p.nombre IS NOT NULL
        """),
        {"mid": municipio_id, "tipos": tipos},
    )
    count = r.scalar() or 0
    return {"categoria": categoria, "total": count, "ejemplos": []}


async def build_db_context(
    db: AsyncSession,
    context_type: str,
    municipio_id: Optional[int] = None,
    categoria: Optional[str] = None,
) -> dict:
    """Fetch real DB data for context. Returns JSON-serializable dict."""
    cache_key = (municipio_id, categoria)
    now = time.monotonic()
    if cache_key in _db_context_cache:
        cached_at, cached_val = _db_context_cache[cache_key]
        if now - cached_at < _CACHE_TTL:
            cached_val["context_type"] = context_type
            return cached_val

    ctx: dict = {"context_type": context_type}

    # Store raw values for doc selection (used even when DB queries are skipped)
    if municipio_id:
        ctx["_municipio_id"] = municipio_id
    if categoria:
        ctx["_categoria"] = categoria

    needs_muni = bool(municipio_id)
    needs_cat = (
        context_type == "chat"
        and bool(municipio_id)
        and bool(categoria)
    )

    if needs_muni and needs_cat:
        muni = await _fetch_municipio(db, municipio_id)
        if categoria in ROUTE_TABLES:
            cat_data = await _fetch_category_routes(db, municipio_id, categoria)
        elif categoria in POI_CATS:
            cat_data = await _fetch_category_pois(db, municipio_id, categoria)
        else:
            cat_data = None
        if muni:
            ctx["municipio"] = muni
        if cat_data:
            ctx["categoria_data"] = cat_data
    elif needs_muni:
        muni = await _fetch_municipio(db, municipio_id)
        if muni:
            ctx["municipio"] = muni

    _db_context_cache[cache_key] = (now, ctx)
    return ctx


def build_system_prompt(
    context_type: str,
    db_context: dict,
    player_name: Optional[str] = None,
    message: str = "",
) -> str:
    """Build system prompt combining selected docs + dynamic context + flow instruction."""
    # Extract raw values for doc selection
    municipio_id: Optional[int] = (
        db_context.get("municipio", {}).get("id")
        or db_context.get("_municipio_id")
    )
    categoria: Optional[str] = (
        db_context.get("categoria_data", {}).get("categoria")
        or db_context.get("_categoria")
    )

    base = _build_selected_system_base(message, municipio_id, categoria)
    parts = [base]

    # Dynamic DB context block
    ctx_lines = ["\n\n---\n\nCONTEXTO_ACTUAL:"]
    if "municipio" in db_context:
        m = db_context["municipio"]
        ctx_lines.append(
            f"- Municipio: {m['nombre']} (id={m['id']}, {m.get('poblacion', '?')} hab.)"
        )
    if player_name:
        ctx_lines.append(f"- Nombre del usuario: {player_name}")
    if "categoria_data" in db_context:
        cd = db_context["categoria_data"]
        ctx_lines.append(
            f"- Categoría activa: {cd['categoria']} — {cd['total']} disponibles en este concejo"
        )
        for ej in cd.get("ejemplos", []):
            dist = f"{ej['distancia_km']} km" if ej.get("distancia_km") else ""
            dif = f"dificultad {ej['dificultad']}/5" if ej.get("dificultad") else ""
            extras = ", ".join(filter(None, [dist, dif]))
            ctx_lines.append(f"  · {ej['nombre']} ({extras})")
    parts.append("\n".join(ctx_lines))

    FLOW_INSTRUCTIONS = {
        "chat": (
            "Responde la pregunta del usuario sobre Asturias. "
            "Aplica el bloque de seguridad si la pregunta sale del ámbito. "
            "SIEMPRE incluye [NAV:NombreConcejo] al final si el usuario mencionó un concejo concreto o si hay un concejo en contexto. "
            "NUNCA muestres JSON, datos técnicos crudos ni estructuras de datos en tu respuesta. "
            "Presenta siempre la información en lenguaje natural."
        ),
    }
    instruction = FLOW_INSTRUCTIONS.get(context_type, FLOW_INSTRUCTIONS["chat"])
    parts.append(f"\n\n---\n\nINSTRUCCIÓN DE FLUJO ({context_type}):\n{instruction}")

    return "".join(parts)


import uuid
import httpx

# Cliente HTTP persistente — reutiliza la conexión TLS con pibiCo
_http_client: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, keepalive_expiry=30),
        )
    return _http_client



# ══════════════════════════════════════════════════════════════════
#  OpenAI AGENT — AstuGuía con tool use real
# ══════════════════════════════════════════════════════════════════

# ── Definición de tools ──
_TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "buscar_pois",
            "description": (
                "Busca puntos de interés en un municipio de Asturias. "
                "Úsala cuando el usuario pregunte por restaurantes, bares, cafeterías, "
                "sidrerías, museos, miradores, tiendas o mercados en un sitio concreto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "municipio_id": {
                        "type": "integer",
                        "description": "ID numérico del municipio en la BD (ej: Gijón=24, Oviedo=43, Llanes=35)",
                    },
                    "categoria": {
                        "type": "string",
                        "enum": ["comer", "ocio", "tiendas", "mercado"],
                        "description": "comer: restaurantes/bares/cafés; ocio: museos/miradores/monumentos; tiendas: comercios; mercado: mercados locales",
                    },
                    "tipo": {
                        "type": "string",
                        "description": "Filtro específico opcional: restaurant, cafe, bar, pub, fast_food, museum, viewpoint, castle, monument, theatre, bakery, supermarket…",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Número de resultados (máx 10, por defecto 5)",
                    },
                },
                "required": ["municipio_id", "categoria"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_rutas",
            "description": (
                "Busca rutas en un municipio de Asturias. "
                "Úsala cuando el usuario pregunte por rutas de senderismo, ciclismo, "
                "carril bici, sendas verdes o paseos en un sitio concreto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "municipio_id": {
                        "type": "integer",
                        "description": "ID del municipio (ej: Gijón=24, Oviedo=43, Cangas del Narcea=12)",
                    },
                    "tipo": {
                        "type": "string",
                        "enum": ["ciclismo", "senderismo", "sendas_verdes", "carril_bici", "paseos"],
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Número de resultados (máx 10, por defecto 5)",
                    },
                },
                "required": ["municipio_id", "tipo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_mercados",
            "description": (
                "Busca tiendas y comercios donde comprar productos locales asturianos "
                "(sidra, quesos, embutidos, artesanía, productos de huerta). "
                "Úsala cuando el usuario pregunte dónde comprar productos típicos asturianos, "
                "llagares, queserías, tiendas de productos locales o mercados artesanales."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "municipio_id": {
                        "type": "integer",
                        "description": "ID del municipio (ej: Gijón=24, Oviedo=43, Llanes=35)",
                    },
                    "categoria": {
                        "type": "string",
                        "enum": ["gastro", "dulce", "sidra-bebidas", "artesania", "huerta-campo"],
                        "description": (
                            "gastro: quesos/embutidos/conservas; "
                            "sidra-bebidas: sidra/vinos; "
                            "artesania: productos artesanales; "
                            "dulce: repostería; "
                            "huerta-campo: frutas/verduras/legumbres. "
                            "Omitir para devolver todos los tipos."
                        ),
                    },
                },
                "required": ["municipio_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_municipios",
            "description": (
                "Recomienda los mejores municipios de Asturias para una actividad o tipo de gastronomía. "
                "Úsala cuando el usuario no mencione un municipio concreto y quiera saber "
                "'dónde ir' para algo (ej: '¿dónde comer cocina asturiana?', '¿dónde hay rutas de ciclismo?')."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subtipo": {
                        "type": "string",
                        "description": (
                            "Tipo de actividad o establecimiento. "
                            "Comida: restaurant, cafe, bar, pub, fast_food. "
                            "Rutas: ciclismo, senderismo, sendas_verdes, carril_bici, paseos. "
                            "Otros: ocio, tiendas."
                        ),
                    },
                    "zona": {
                        "type": "string",
                        "enum": ["costero", "interior", "sorpresa"],
                        "description": "costero: municipios de costa; interior: municipios de interior; sorpresa: cualquiera",
                    },
                    "cuisine": {
                        "type": "string",
                        "enum": ["regional", "other"],
                        "description": "Solo para subtipo=restaurant: regional=cocina asturiana; other=cocina internacional",
                    },
                },
                "required": ["subtipo"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_por_producto",
            "description": (
                "Busca tiendas y comercios que venden un producto típico asturiano concreto "
                "(queso cabrales, chorizo, morcilla, anchoas, miel...). "
                "Úsala cuando el usuario pregunte dónde comprar un producto específico, "
                "sin importar en qué municipio. Devuelve todos los comercios de Asturias que lo venden."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "producto_slug": {
                        "type": "string",
                        "enum": list(_FP_PRODUCTO_SLUGS),
                        "description": "Slug del producto: queso-cabrales, chorizo-asturiano, morcilla-asturiana, anchoas, miel-abeja, queso-afuega-l-pitu, queso-casin, queso-vidiago, queso-la-peral, queso-tres-leches-de-pria, conservas-de-bonito",
                    },
                },
                "required": ["producto_slug"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "leer_doc",
            "description": (
                "Lee un documento de contexto cultural/geográfico de Asturias cuando no tienes "
                "la información disponible. Úsalo solo si necesitas contexto que no tienes: "
                "asturias_general (geografía/historia general), gastronomia (platos/tradiciones culinarias), "
                "senderismo (rutas PR-AS/GR/sendas), ciclismo (vías verdes/BTT/carril bici), "
                "mercados (tiendas/productos locales asturianos), "
                "y concejos: gijon, oviedo, aviles, llanes, villaviciosa, cabrales, somiedo, ponga, "
                "ribadesella, cangas_del_narcea."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "doc": {
                        "type": "string",
                        "enum": _LEER_DOC_SLUGS,
                        "description": "Slug del documento a leer",
                    }
                },
                "required": ["doc"],
            },
        },
    },
]

# ── IDs municipios costeros ──
_COSTERO_IDS = [4, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 35, 38, 40, 54, 55, 68, 69, 73, 76]

# ── Historial de conversaciones en memoria ──
_conversations: dict[str, dict] = {}
_CONV_TTL = 3600  # 1 hora


def _get_or_create_conv(conv_id: Optional[str]) -> tuple[str, list]:
    """Returns (conv_id, messages_list). Creates new conv if not found."""
    now = time.monotonic()
    expired = [k for k, v in _conversations.items() if now - v["ts"] > _CONV_TTL]
    for k in expired:
        del _conversations[k]

    if conv_id and conv_id in _conversations:
        _conversations[conv_id]["ts"] = now
        return conv_id, _conversations[conv_id]["messages"]

    new_id = str(uuid.uuid4())
    _conversations[new_id] = {"messages": [], "ts": now}
    return new_id, _conversations[new_id]["messages"]


def _progress_label(tool_name: str, args: dict) -> str:
    """Returns a human-readable progress message for a tool call."""
    labels = {
        "buscar_pois":       lambda a: f"Buscando {a.get('categoria', 'sitios')} en la BD...",
        "buscar_rutas":      lambda a: f"Buscando rutas de {a.get('tipo', 'aventura')}...",
        "buscar_municipios": lambda a: "Calculando mejores destinos...",
        "buscar_mercados":   lambda a: "Consultando comercios locales...",
        "buscar_por_producto": lambda a: f"Buscando dónde comprar {a.get('producto_slug', '').replace('-', ' ')}...",
        "leer_doc":          lambda a: f"Consultando documentación de {a.get('doc', '')}...",
    }
    fn = labels.get(tool_name)
    return fn(args) if fn else "Buscando información..."


async def _execute_tool(name: str, args: dict) -> str:
    """Executes a tool and returns a JSON string with the result."""
    # ── Non-DB tools handled first ──
    if name == "buscar_por_producto":
        slug = args.get("producto_slug", "")
        if slug not in _FP_PRODUCTO_SLUGS:
            return json.dumps({"error": f"Producto '{slug}' no disponible"})
        client = _get_http_client()
        url = f"http://localhost:8001/v1/productos/{slug}/comercios"
        try:
            resp = await client.get(url, timeout=5.0)
            if resp.status_code == 404:
                return json.dumps({"producto": slug, "total": 0, "comercios": []})
            resp.raise_for_status()
            items = resp.json()
            comercios = [
                {
                    "nombre": c.get("nombre"),
                    "municipio": c.get("municipio", {}).get("nombre"),
                    "direccion": c.get("direccion"),
                    "telefono": c.get("telefono"),
                    "web": c.get("web"),
                    "horario": c.get("horario"),
                }
                for c in (items if isinstance(items, list) else [])
            ]
            return json.dumps({"producto": slug, "total": len(comercios), "comercios": comercios}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": str(e)})

    if name == "leer_doc":
        slug = args.get("doc", "")
        if slug not in _LEER_DOC_SLUGS:
            return json.dumps({"error": f"Doc '{slug}' no disponible"})
        path = DOCS_DIR / f"{slug}.md"
        content = _load_doc(path)
        return json.dumps({"doc": slug, "content": content}, ensure_ascii=False)

    # ── DB tools ──
    from app.db.session import async_session_factory
    try:
        async with async_session_factory() as db:
            if name == "buscar_pois":
                from app.services.poi import get_pois_by_municipio
                mid = int(args["municipio_id"])
                cat = args.get("categoria", "comer")
                tipo = args.get("tipo")
                limit = min(int(args.get("limit", 5)), 10)
                items, total = await get_pois_by_municipio(db, mid, cat, limit=limit, tipo=tipo)
                result = {
                    "total": total,
                    "items": [
                        {
                            "nombre": i["nombre"],
                            "tipo_label": i["tipo_label"],
                            "cuisine": i.get("cuisine"),
                            "direccion": i.get("direccion"),
                            "website": i.get("website"),
                            "opening_hours": i.get("opening_hours"),
                        }
                        for i in items
                    ],
                }
                return json.dumps(result, ensure_ascii=False)

            if name == "buscar_rutas":
                from app.services.ruta import get_rutas_by_municipio
                mid = int(args["municipio_id"])
                tipo = args["tipo"]
                limit = min(int(args.get("limit", 5)), 10)
                rutas, total = await get_rutas_by_municipio(db, mid, tipo, limit=limit)
                result = {
                    "total": total,
                    "rutas": [
                        {
                            "nombre": r.get("nombre"),
                            "distancia_km": r.get("distancia_km"),
                            "dificultad": r.get("dificultad"),
                            "wikidata_desc": r.get("wikidata_desc"),
                            "ascenso_m": r.get("ascenso_m"),
                        }
                        for r in rutas
                    ],
                }
                return json.dumps(result, ensure_ascii=False)

            if name == "buscar_municipios":
                subtipo = args.get("subtipo", "restaurant")
                zona = args.get("zona", "sorpresa")
                cuisine = args.get("cuisine")

                if subtipo in ROUTE_TABLES:
                    table = ROUTE_TABLES[subtipo]
                    conditions = []
                    params: dict = {}
                    if zona == "costero":
                        conditions.append("m.id = ANY(:zona_ids)")
                        params["zona_ids"] = _COSTERO_IDS
                    elif zona == "interior":
                        conditions.append("m.id != ALL(:zona_ids)")
                        params["zona_ids"] = _COSTERO_IDS
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    q = text(f"""
                        SELECT m.id, m.nombre, COUNT(*) AS num_rutas
                        FROM {table} r
                        JOIN municipios m ON r.municipio_id = m.id
                        {where}
                        GROUP BY m.id, m.nombre
                        ORDER BY num_rutas DESC LIMIT 5
                    """)
                    rows = (await db.execute(q, params)).fetchall()
                    return json.dumps({
                        "municipios": [{"id": r.id, "nombre": r.nombre, "num_rutas": int(r.num_rutas)} for r in rows]
                    }, ensure_ascii=False)
                else:
                    from app.services.poi import CATEGORIA_TIPOS
                    if subtipo in ("comer", "ocio", "tiendas", "mercado"):
                        tipos = CATEGORIA_TIPOS.get(subtipo, [])
                        tipo_cond = "TRIM(p.tipo) = ANY(:tipos) OR p.tags->>'amenity' = ANY(:tipos)"
                        params = {"tipos": tipos}
                    else:
                        tipo_cond = "TRIM(p.tipo) = :subtipo OR p.tags->>'amenity' = :subtipo"
                        params = {"subtipo": subtipo}

                    conditions = [f"({tipo_cond})", "p.nombre IS NOT NULL"]
                    if cuisine == "regional":
                        conditions.append("p.tags->>'cuisine' = 'regional'")
                    elif cuisine == "other":
                        conditions.append("(p.tags->>'cuisine' IS NULL OR p.tags->>'cuisine' != 'regional')")
                    if zona == "costero":
                        conditions.append("m.id = ANY(:zona_ids)")
                        params["zona_ids"] = _COSTERO_IDS
                    elif zona == "interior":
                        conditions.append("m.id != ALL(:zona_ids)")
                        params["zona_ids"] = _COSTERO_IDS

                    q = text(f"""
                        SELECT m.id, m.nombre, COUNT(*) AS num_pois
                        FROM puntos_interes p
                        JOIN municipios m ON ST_Within(p.geom, m.geom)
                        WHERE {" AND ".join(conditions)}
                        GROUP BY m.id, m.nombre
                        ORDER BY num_pois DESC LIMIT 5
                    """)
                    rows = (await db.execute(q, params)).fetchall()
                    return json.dumps({
                        "municipios": [{"id": r.id, "nombre": r.nombre, "num_pois": int(r.num_pois)} for r in rows]
                    }, ensure_ascii=False)

            if name == "buscar_mercados":
                import unicodedata
                import re
                mid = int(args["municipio_id"])
                categoria = args.get("categoria")

                row = (await db.execute(
                    text("SELECT nombre FROM municipios WHERE id = :id"), {"id": mid}
                )).fetchone()
                if not row:
                    return json.dumps({"error": f"Municipio {mid} no encontrado"})
                nombre = row[0]

                norm = unicodedata.normalize("NFD", nombre.lower())
                slug = "".join(c for c in norm if not unicodedata.combining(c))
                slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")

                base = "http://localhost:8001"
                if categoria:
                    url = f"{base}/v1/municipios/{slug}/categorias/{categoria}/comercios"
                else:
                    url = f"{base}/v1/municipios/{slug}/comercios"

                client = _get_http_client()
                resp = await client.get(url, timeout=5.0)
                if resp.status_code == 404:
                    return json.dumps({"municipio": nombre, "total": 0, "comercios": []}, ensure_ascii=False)
                resp.raise_for_status()

                data = resp.json()
                comercios_raw = data if isinstance(data, list) else data.get("items", [])
                comercios = [
                    {
                        "nombre": c.get("nombre"),
                        "direccion": c.get("direccion"),
                        "telefono": c.get("telefono"),
                        "web": c.get("web"),
                        "horario": c.get("horario"),
                        "productos": [p["nombre"] for p in c.get("productos", [])],
                    }
                    for c in comercios_raw
                ]
                return json.dumps(
                    {"municipio": nombre, "total": len(comercios), "comercios": comercios},
                    ensure_ascii=False,
                )

    except Exception as e:
        return json.dumps({"error": str(e)})

    return json.dumps({"error": f"Tool '{name}' not found"})


async def stream_openai_agent(
    message: str,
    system_prompt: str,
    conversation_id: Optional[str],
    settings,
    municipio_id: Optional[int] = None,
    categoria: Optional[str] = None,
    player_name: Optional[str] = None,
    municipio_nombre: Optional[str] = None,
):
    """
    AstuGuía agent via OpenAI with tool use.
    Yields SSE strings ready to send directly to the client.

    Fast-path: si se detecta municipio + intención con keywords Python,
    se salta Phase 1 (OpenAI tool resolution) y se va directo a Phase 2.
    Si no → flujo normal con Phase 1 + Phase 2.
    """
    from openai import AsyncOpenAI

    # Timeout 90s: gpt-5-mini es modelo de razonamiento, reasoning interno puede tomar 30-60s
    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=90.0,
        max_retries=0,
    )
    def _err_sse(msg: str):
        data = json.dumps({"choices": [{"delta": {"content": msg}}]})
        return f"data: {data}\n\ndata: [DONE]\n\n"

    conv_id, history = _get_or_create_conv(conversation_id)
    history.append({"role": "user", "content": message})

    # ── Cap historial: máx _MAX_HISTORY mensajes para evitar token blowup ──
    trimmed_history = history[-_MAX_HISTORY:]

    used_tools = False
    direct_response: Optional[str] = None

    # ── Intentar fast-path antes de cualquier llamada a OpenAI ──
    fast = await _try_fast_path(message, municipio_id, categoria)

    if fast:
        tool_name, tool_args, tool_result = fast
        used_tools = True

        # Feedback inmediato con label del tool ejecutado
        label = _progress_label(tool_name, tool_args)
        yield f'event: progress\ndata: {json.dumps({"step": "searching", "msg": label})}\n\n'

        yield f"event: conv_id\ndata: {conv_id}\n\n"

        # ── Respuesta de plantilla: sin OpenAI, instantánea ───────────────────
        resolved_mid = municipio_id or _detect_municipio_from_text(message)
        full_text = _build_fast_response(tool_name, tool_args, tool_result, player_name, resolved_mid, municipio_nombre)

        # Emitir palabra a palabra para efecto de streaming natural
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk_text = word if i == 0 else " " + word
            data = json.dumps({"choices": [{"delta": {"content": chunk_text}}]})
            yield f"data: {data}\n\n"

        yield "data: [DONE]\n\n"
        history.append({"role": "assistant", "content": full_text})
        _conversations[conv_id]["ts"] = time.monotonic()
        return

    # ── Flujo normal: feedback + Phase 1 + Phase 2 ──
    messages: list[dict] = [{"role": "system", "content": system_prompt}] + trimmed_history

    yield f'event: progress\ndata: {json.dumps({"step": "thinking", "msg": "⚙️ Pensando..."})}\n\n'

    for _round in range(3):
        try:
            resp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                tools=_TOOLS,
                tool_choice="auto",
            )
        except Exception as e:
            logger.error("[guia] Phase1 error round=%s: %s", _round, e)
            yield f"event: conv_id\ndata: {conv_id}\n\n"
            yield _err_sse("⚠️ AstuGuía nun pue respondete agora. Inténtalo de nuevu, paisanu!")
            history.pop()
            return
        choice = resp.choices[0]
        msg = choice.message

        if not msg.tool_calls:
            direct_response = msg.content or ""
            break

        used_tools = True

        for tc in msg.tool_calls:
            try:
                tc_args = json.loads(tc.function.arguments)
            except Exception:
                tc_args = {}
            label = _progress_label(tc.function.name, tc_args)
            yield f'event: progress\ndata: {json.dumps({"step": "searching", "msg": label})}\n\n'

        tc_list = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]
        messages.append({"role": "assistant", "content": msg.content or "", "tool_calls": tc_list})

        tool_results = await asyncio.gather(*[
            _execute_tool(tc.function.name, json.loads(tc.function.arguments))
            for tc in msg.tool_calls
        ])
        for tc, result in zip(msg.tool_calls, tool_results):
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

    yield f"event: conv_id\ndata: {conv_id}\n\n"

    full_text = ""

    if used_tools:
        # Phase 2 normal: prompt mínimo (ya tenemos tool results, no necesitamos los docs)
        phase2_messages = [
            {"role": "system", "content": _FAST_PATH_SYSTEM},
            *trimmed_history[:-1],
            {"role": "user", "content": message},
            *messages[len(trimmed_history) + 1:],  # tool calls + results añadidos en Phase 1
        ]
        try:
            stream = await client.chat.completions.create(
                model=settings.openai_model,
                messages=phase2_messages,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    full_text += delta
                    data = json.dumps({"choices": [{"delta": {"content": delta}}]})
                    yield f"data: {data}\n\n"
        except Exception as e:
            logger.error("[guia] Phase2 error: %s", e)
            if not full_text:  # si no se emitió nada aún
                yield _err_sse("⚠️ AstuGuía nun pue respondete agora. Inténtalo de nuevu, paisanu!")
    else:
        full_text = direct_response or ""
        if full_text:
            words = full_text.split(" ")
            for i, word in enumerate(words):
                chunk = (word if i == 0 else " " + word)
                data = json.dumps({"choices": [{"delta": {"content": chunk}}]})
                yield f"data: {data}\n\n"

    yield "data: [DONE]\n\n"

    history.append({"role": "assistant", "content": full_text})
    _conversations[conv_id]["ts"] = time.monotonic()
