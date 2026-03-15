from fastapi import APIRouter

from app.__version__ import __version__

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def health_live():
    return {"status": "ok", "version": __version__}


@router.get("/health/ready")
async def health_ready():
    return {"status": "ok", "version": __version__}
