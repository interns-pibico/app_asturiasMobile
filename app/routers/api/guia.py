"""
AstuGuía — Bridge endpoint: POST /api/guia/chat
Proxies requests to pibiCo API, injecting DB context and system prompt server-side.
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, Settings
from app.db.session import get_db_session
from app.services.guia import build_db_context, build_system_prompt, stream_pibico

router = APIRouter(prefix="/guia", tags=["guia"])

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


class GuiaChatRequest(BaseModel):
    message: str
    context_type: str = "chat"
    municipio_id: Optional[int] = None
    categoria: Optional[str] = None
    wizard_state: Optional[dict] = None
    poi_id: Optional[int] = None
    conversation_id: Optional[str] = None
    player_name: Optional[str] = None


@router.post("/chat")
async def guia_chat(
    req: GuiaChatRequest,
    db: DbSession,
    settings: Settings = Depends(get_settings),
):
    """
    Bridge endpoint for AstuGuía chat.
    Builds DB context + system prompt server-side, then streams pibiCo SSE to client.
    """
    async def generate():
        db_context = await build_db_context(
            db,
            context_type=req.context_type,
            municipio_id=req.municipio_id,
            categoria=req.categoria,
        )
        system_prompt = build_system_prompt(
            req.context_type,
            db_context,
            player_name=req.player_name,
        )
        conv_id_sent = False
        async for chunk, new_conv_id in stream_pibico(
            req.message, system_prompt, req.conversation_id, settings
        ):
            yield chunk
            if new_conv_id and not conv_id_sent:
                # Inject conversation_id as a special SSE event so client can persist it
                yield f"event: conv_id\ndata: {new_conv_id}\n\n"
                conv_id_sent = True

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
