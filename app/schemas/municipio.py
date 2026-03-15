from pydantic import BaseModel


class MunicipioOut(BaseModel):
    id: int
    nombre: str
    poblacion: int | None = None
    centroid_lat: float | None = None
    centroid_lon: float | None = None

    class Config:
        from_attributes = True


class MunicipioDetail(BaseModel):
    id: int
    nombre: str
    poblacion: int | None = None
    centroid_lat: float | None = None
    centroid_lon: float | None = None
    geojson: dict | None = None

    class Config:
        from_attributes = True


class MunicipioGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict]
