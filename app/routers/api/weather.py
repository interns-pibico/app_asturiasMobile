from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import httpx

router = APIRouter(tags=["weather"])

_CLIENT: httpx.AsyncClient | None = None

def _get_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = httpx.AsyncClient(timeout=8.0)
    return _CLIENT


@router.get("/weather")
async def get_weather(
    lat: float = Query(..., description="Latitud"),
    lon: float = Query(..., description="Longitud"),
):
    """Proxy hacia Open-Meteo para evitar restricciones CSP del cliente."""
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,weather_code"
        "&daily=temperature_2m_max,temperature_2m_min"
        "&timezone=Europe%2FMadrid&forecast_days=1"
    )
    try:
        resp = await _get_client().get(url)
        resp.raise_for_status()
        return JSONResponse(content=resp.json())
    except Exception:
        return JSONResponse(content={}, status_code=502)
