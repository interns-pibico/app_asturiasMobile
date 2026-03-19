import unicodedata
import httpx
from typing import Optional

MERCADO_BASE_URL = "http://localhost:8001/v1"


def _nombre_to_slug(nombre: str) -> str:
    s = unicodedata.normalize("NFD", nombre.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace(" ", "-")


async def get_comercios_by_municipio(municipio_nombre: str, categoria: Optional[str] = None) -> dict:
    """Proxy async hacia api_mercadoAsturias. categoria: gastro|dulce|sidra-bebidas|artesania|huerta-campo"""
    slug = _nombre_to_slug(municipio_nombre)
    if categoria:
        url = f"{MERCADO_BASE_URL}/municipios/{slug}/categorias/{categoria}/comercios"
    else:
        url = f"{MERCADO_BASE_URL}/municipios/{slug}/comercios"
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url)
            if resp.status_code == 404:
                return {"slug": slug, "total": 0, "items": []}
            resp.raise_for_status()
            data = resp.json()
            return {"slug": slug, "total": len(data), "items": data}
        except httpx.RequestError:
            return {"slug": slug, "total": 0, "items": [], "error": "API no disponible"}
