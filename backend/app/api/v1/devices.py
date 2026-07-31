import logging
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.device import Device
from app.models.user import User
from app.core.dependencies import get_current_user

logger = logging.getLogger("devices")
router = APIRouter()

_manager = None

def set_manager(manager):
    global _manager
    _manager = manager


@router.get("/devices")
async def get_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   
):

    devices = db.query(Device).filter(Device.user_id == current_user.user_id).all()
    result = []
    for d in devices:
        is_online = _manager and _manager.get_device(d.device_id) is not None
        result.append({
            "device_id":   d.device_id,
            "hostname":    d.hostname,
            "username":    d.username,
            "os":          d.os,
            "os_version":  d.os_version,
            "ip_address":  d.ip_address,
            "mac_address": d.mac_address,
            "cpu":         d.cpu,
            "ram_gb":      d.ram_gb,
            "status":      "online" if is_online else "offline",
            "last_seen":   str(d.last_seen) if d.last_seen else None
        })
    return {"devices": result, "total": len(result)}


@router.get("/devices/{device_id}")
async def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   # 🔒 JWT
):
    d = db.query(Device).filter(
        Device.device_id == device_id,
        Device.user_id == current_user.user_id        # ownership check
    ).first()
    if not d:
        return JSONResponse(status_code=404, content={"error": "Device not found"})
    is_online = _manager and _manager.get_device(device_id) is not None
    return {
        "device_id":   d.device_id,
        "hostname":    d.hostname,
        "username":    d.username,
        "os":          d.os,
        "os_version":  d.os_version,
        "ip_address":  d.ip_address,
        "mac_address": d.mac_address,
        "cpu":         d.cpu,
        "ram_gb":      d.ram_gb,
        "status":      "online" if is_online else "offline",
        "last_seen":   str(d.last_seen) if d.last_seen else None
    }
@router.get("/debug/token")
async def debug_token(authorization: str = Header(...)):
    from app.core.security import decode_access_token
    from app.config import settings
    token = authorization.split(" ", 1)[1] if authorization.startswith("Bearer ") else authorization
    payload = decode_access_token(token)
    return {
        "payload": payload,
        "secret_preview": settings.JWT_SECRET[:8] + "...",
        "algorithm": settings.JWT_ALGORITHM,
    }
