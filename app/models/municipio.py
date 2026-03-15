from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

from app.db.base import Base


class Municipio(Base):
    __tablename__ = "municipios"

    nombre: Mapped[str] = mapped_column(String(255))
    poblacion: Mapped[int | None] = mapped_column(Integer)
    geom: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326)
    )

    @property
    def centroid(self):
        if self.geom:
            shape = to_shape(self.geom)
            c = shape.centroid
            return {"lat": c.y, "lon": c.x}
        return None
