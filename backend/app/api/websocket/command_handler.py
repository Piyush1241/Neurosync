import logging
import json
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.websocket.connection_manager import ConnectionManager
from app.models.device import Device
from app.models.command import Command
from app.models.user import User
from app.db.database import SessionLocal, get_db
from app.core.security import decode_access_token
from app.core.dependencies import get_current_user

logger = logging.getLogger("command_handler")
router = APIRouter()
_manager: ConnectionManager = None

def set_manager(manager: ConnectionManager):
    global _manager
    _manager = manager


class CommandRequest(BaseModel):
    device_id: str
    action: str
    payload: dict = {}


def _save_device_to_db(info: dict, user_id: str = None):
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_id == info["device_id"]).first()
        if device:
            device.hostname    = info.get("hostname", device.hostname)
            device.username    = info.get("username")
            device.os          = info.get("os")
            device.os_version  = info.get("os_version")
            device.ip_address  = info.get("ip_address")
            device.mac_address = info.get("mac_address")
            device.cpu         = info.get("cpu")
            device.ram_gb      = info.get("ram_gb")
            device.status      = "online"
            if user_id:
                device.user_id = user_id
        else:
            device = Device(
                device_id   = info["device_id"],
                user_id     = user_id,
                hostname    = info.get("hostname", "unknown"),
                username    = info.get("username"),
                os          = info.get("os"),
                os_version  = info.get("os_version"),
                ip_address  = info.get("ip_address"),
                mac_address = info.get("mac_address"),
                cpu         = info.get("cpu"),
                ram_gb      = info.get("ram_gb"),
                status      = "online"
            )
            db.add(device)
        db.commit()
        logger.info(f"Device saved: {info['device_id']} owner: {user_id}")
    except Exception as e:
        logger.error(f"Failed to save device: {e}")
        db.rollback()
    finally:
        db.close()


def _set_device_offline(device_id: str):
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if device:
            device.status = "offline"
            db.commit()
    except Exception as e:
        logger.error(f"Failed to set offline: {e}")
        db.rollback()
    finally:
        db.close()


async def handle_agent_connection(websocket: WebSocket, manager: ConnectionManager):
    global _manager
    _manager = manager
    device_id = None

    try:
        await websocket.accept()
        raw = await websocket.receive_text()
        data = json.loads(raw)

        device_id = data.get("device_id")
        if not device_id:
            await websocket.send_json({"error": "device_id required"})
            await websocket.close()
            return

        token = data.get("token")
        user_id = None
        if token:
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")
                logger.info(f"Device {device_id} authenticated as user {user_id}")
            else:
                logger.warning(f"Device {device_id} sent invalid token, disconnecting")
                await websocket.send_json({"error": "Unauthorized: Invalid token"})
                await websocket.close(code=1008)
                return
        else:
            logger.warning(f"Device {device_id} connected without token, disconnecting")
            await websocket.send_json({"error": "Unauthorized: Token required"})
            await websocket.close(code=1008)
            return

        info = {
            "device_id":   device_id,
            "hostname":    data.get("hostname", "unknown"),
            "username":    data.get("username"),
            "os":          data.get("os"),
            "os_version":  data.get("os_version"),
            "ip_address":  data.get("ip_address"),
            "mac_address": data.get("mac_address"),
            "cpu":         data.get("cpu"),
            "ram_gb":      data.get("ram_gb"),
        }

        manager.connected_agents[device_id] = websocket
        _save_device_to_db(info, user_id)

        await websocket.send_json({
            "type": "registered",
            "device_id": device_id,
            "message": "Connected to NeuroSync backend"
        })

        while True:
            text = await websocket.receive_text()
            msg = json.loads(text)
            msg_type = msg.get("type")

            if msg_type == "heartbeat":
                await websocket.send_json({"type": "heartbeat_ack"})
            elif msg_type == "command_result":
                logger.info(f"Result from {device_id}: {msg}")
            else:
                logger.warning(f"Unknown message from {device_id}: {msg_type}")

    except WebSocketDisconnect:
        logger.info(f"Agent disconnected: {device_id}")
    except Exception as e:
        logger.error(f"Connection error: {e}")
    finally:
        if device_id:
            manager.disconnect(device_id)
            _set_device_offline(device_id)


@router.post("/command")
async def send_command(
    req: CommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == req.device_id,
        Device.user_id == current_user.user_id
    ).first()
    if not device:
        return JSONResponse(status_code=403, content={"error": "Device not found or access denied"})

    if _manager is None:
        return JSONResponse(status_code=503, content={"error": "Manager not initialized"})

    sent = await _manager.send_to_device(req.device_id, {
        "type": "command",
        "action": req.action,
        "payload": req.payload
    })

    if not sent:
        return JSONResponse(status_code=404, content={"error": "Device not connected"})

    cmd = Command(
        device_id = req.device_id,
        action    = req.action,
        payload   = req.payload,
        status    = "sent"
    )
    db.add(cmd)
    db.commit()

    return {"status": "sent", "device_id": req.device_id, "action": req.action, "command_id": cmd.command_id}


@router.get("/commands/{device_id}")
async def get_command_history(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == device_id,
        Device.user_id == current_user.user_id
    ).first()
    if not device:
        return JSONResponse(status_code=403, content={"error": "Device not found or access denied"})

    commands = db.query(Command).filter(
        Command.device_id == device_id
    ).order_by(Command.timestamp.desc()).limit(100).all()

    return {
        "device_id": device_id,
        "commands": [
            {
                "command_id": c.command_id,
                "action":     c.action,
                "payload":    c.payload,
                "status":     c.status,
                "result":     c.result,
                "timestamp":  str(c.timestamp)
            } for c in commands
        ]
    }