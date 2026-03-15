from pydantic import BaseModel


class POIOut(BaseModel):
    id: int
    nombre: str
    tipo: str
    tipo_label: str
    lat: float
    lon: float
    descripcion: str | None = None
    website: str | None = None
    cuisine: str | None = None

    class Config:
        from_attributes = True


class POIListResponse(BaseModel):
    municipio: str
    categoria: str
    total: int
    items: list[POIOut]
