import logging
from fastapi import WebSocket
from typing import Dict, Optional

logger = logging.getLogger("connection_manager")


class ConnectionManager:
    def __init__(self):
        # device_id -> websocket
        self.connected_agents: Dict[str, WebSocket] = {}

    async def connect(self, device_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connected_agents[device_id] = websocket
        logger.info(f"Agent connected: {device_id} | Total: {len(self.connected_agents)}")

    def disconnect(self, device_id: str):
        if device_id in self.connected_agents:
            del self.connected_agents[device_id]
            logger.info(f"Agent disconnected: {device_id} | Total: {len(self.connected_agents)}")

    def get_device(self, device_id: str) -> Optional[WebSocket]:
        return self.connected_agents.get(device_id)

    def get_all_devices(self) -> list:
        return list(self.connected_agents.keys())

    async def send_to_device(self, device_id: str, data: dict) -> bool:
        ws = self.connected_agents.get(device_id)
        if not ws:
            logger.warning(f"Device not found: {device_id}")
            return False
        try:
            await ws.send_json(data)
            return True
        except Exception as e:
            logger.error(f"Failed to send to {device_id}: {e}")
            self.disconnect(device_id)
            return False

    async def broadcast(self, data: dict):
        disconnected = []
        for device_id, ws in self.connected_agents.items():
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(device_id)
        for d in disconnected:
            self.disconnect(d)