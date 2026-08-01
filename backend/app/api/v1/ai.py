import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.services.ai_service import AIService

logger = logging.getLogger("ai_route")
router = APIRouter()


class AIExecuteRequest(BaseModel):
    device_id: str
    prompt: str


class AIChatRequest(BaseModel):
    prompt: str


@router.post("/ai/execute")
async def ai_execute(
    req: AIExecuteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.api.websocket.command_handler import get_manager
    from app.models.device import Device

    # Ownership check
    device = db.query(Device).filter(
        Device.device_id == req.device_id,
        Device.user_id == current_user.user_id
    ).first()
    if not device:
        return JSONResponse(status_code=403, content={"error": "Device not found or access denied"})

    manager = get_manager()
    if manager is None:
        return JSONResponse(status_code=503, content={"error": "Manager not initialized"})

    service = AIService(manager=manager, db=db)
    result = await service.execute_ai_task(
        device_id=req.device_id,
        prompt=req.prompt,
        user_id=current_user.user_id
    )
    return result


@router.post("/ai/chat")
async def ai_chat(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user)
):
    service = AIService(manager=None, db=None)
    plan = await service.generate_commands(req.prompt)
    return {"prompt": req.prompt, "plan": plan}