from sqlalchemy import String, Integer, BigInteger, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape

from app.db.base import Base


class RutaCiclismo(Base):
    __tablename__ = "rutas_ciclismo"

    osm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    dificultad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    geom: Mapped[Geometry | None] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    municipio_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    @property
    def lat(self):
        return to_shape(self.geom).centroid.y if self.geom else None

    @property
    def lon(self):
        return to_shape(self.geom).centroid.x if self.geom else None


class RutaSenderismo(Base):
    __tablename__ = "rutas_senderismo"

    osm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    dificultad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    geom: Mapped[Geometry | None] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    municipio_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    @property
    def lat(self):
        return to_shape(self.geom).centroid.y if self.geom else None

    @property
    def lon(self):
        return to_shape(self.geom).centroid.x if self.geom else None


class RutaSedasVerdes(Base):
    __tablename__ = "rutas_sendas_verdes"

    osm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    dificultad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    geom: Mapped[Geometry | None] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    municipio_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    @property
    def lat(self):
        return to_shape(self.geom).centroid.y if self.geom else None

    @property
    def lon(self):
        return to_shape(self.geom).centroid.x if self.geom else None


class RutaCarrilBici(Base):
    __tablename__ = "rutas_carril_bici"

    osm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    dificultad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    geom: Mapped[Geometry | None] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    municipio_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    @property
    def lat(self):
        return to_shape(self.geom).centroid.y if self.geom else None

    @property
    def lon(self):
        return to_shape(self.geom).centroid.x if self.geom else None


class RutaPaseos(Base):
    __tablename__ = "rutas_paseos"

    osm_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True, index=True)
    nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    distancia_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    dificultad: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    geom: Mapped[Geometry | None] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    municipio_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    @property
    def lat(self):
        return to_shape(self.geom).centroid.y if self.geom else None

    @property
    def lon(self):
        return to_shape(self.geom).centroid.x if self.geom else None
