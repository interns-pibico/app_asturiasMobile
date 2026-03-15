import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.municipio import get_municipio_detail

router = APIRouter(tags=["pages"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]

_CONCEJOS_COSTEROS = frozenset({
    "Castropol", "Tapia de Casariego", "El Franco", "Coaña", "Navia",
    "Valdés", "Cudillero", "Muros de Nalón", "Soto del Barco",
    "Castrillón", "Avilés", "Gozón", "Carreño", "Gijón",
    "Villaviciosa", "Colunga", "Caravia", "Ribadesella",
    "Llanes", "Ribadedeva",
})

_CAT_FILTER_TAGS = {
    "comer": [
        ("restaurant", "Restaurante"), ("pub", "Pub"), ("cafe", "Cafetería"),
        ("bar", "Bar"), ("fast_food", "Comida rápida"),
    ],
    "ocio": [
        ("viewpoint", "Mirador"), ("museum", "Museo"), ("theatre", "Teatro"),
        ("arts_centre", "Centro de arte"), ("castle", "Castillo"),
        ("monument", "Monumento"), ("cinema", "Cine"), ("memorial", "Memorial"),
    ],
    "tiendas": [
        ("bakery", "Panadería"), ("supermarket", "Supermercado"),
        ("clothes", "Ropa"), ("fashion", "Moda"), ("kiosk", "Kiosco"),
        ("deli", "Delicatessen"), ("cheese", "Quesería"), ("wine", "Vinoteca"),
    ],
}

_CAT_LABELS = {
    "ciclismo": "Rutas en Bici",
    "senderismo": "Senderismo",
    "sendas_verdes": "Sendas Verdes",
    "carril_bici": "Carril Bici",
    "paseos": "Paseos",
    "comer": "Comer",
    "ocio": "Ocio y Cultura",
    "tiendas": "Tiendas",
    "mercado": "Mercado Local",
}


def get_templates(request: Request) -> Jinja2Templates:
    return request.app.state.templates


@router.get("/", response_class=HTMLResponse)
async def book_view(request: Request):
    """Vista entrada — Libro 3D con Leaflet integrado."""
    templates = get_templates(request)
    return templates.TemplateResponse(request, "pages/book.html", {
        "municipio_id": None,
        "municipio_nombre": "",
        "cat": "",
    })



@router.get("/explorar/{municipio_id}", response_class=HTMLResponse)
async def explorar_view(
    municipio_id: int,
    request: Request,
    db: DbSession,
    cat: str = Query(default="comer"),
):
    """Vista isométrica de categoría para un municipio."""
    municipio = await get_municipio_detail(db, municipio_id)
    if not municipio:
        raise HTTPException(status_code=404, detail="Municipio no encontrado")
    templates = get_templates(request)
    # Serialize geojson as plain str so Jinja2 autoescaping converts " → &quot;
    geojson_str = json.dumps(municipio.get("geojson")) if municipio.get("geojson") else "null"
    return templates.TemplateResponse(
        request,
        "pages/explorar.html",
        {
            "municipio": municipio,
            "geojson_str": geojson_str,
            "cat": cat,
            "categoria_label": _CAT_LABELS.get(cat, cat.capitalize()),
            "es_costero": municipio["nombre"] in _CONCEJOS_COSTEROS,
            "cat_filter_tags": _CAT_FILTER_TAGS.get(cat, []),
            # AstuGuía context injection
            "municipio_id": municipio["id"],
            "municipio_nombre": municipio["nombre"],
        },
    )
