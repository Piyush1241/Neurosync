import asyncio
import json
import logging
import ssl
from typing import Optional
import os
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from command_router import execute
from .connection_manager import (ConnectionManager,ConnectionState)
from .device_info import get_device_info
from .heartbeat import Heartbeat

logger = logging.getLogger(__name__)

class WebSocketClient:
    """
    Asynchronous WebSocket client that:
    - Connects to a backend server
    - Sends device info on connection
    - Listens for commands and executes them via command_router.execute()
    - Sends back results
    - Handles heartbeat automatically
    - Auto‑reconnects using ConnectionManager
    """

    def __init__(
        self,
        url: str,
        device_id: str = None,
        heartbeat_interval: int = 30,
        max_reconnect_retries: int = 0,
    ):
        self.url = url
        self.device_id = device_id or get_device_info()["device_id"]
        self.heartbeat_interval = heartbeat_interval

        self._websocket: Optional[websockets.WebSocketClientProtocol] = None
        self._heartbeat: Optional[Heartbeat] = None

        # Connection manager handles reconnects
        self._conn_manager = ConnectionManager(
            url=url,
            on_connect=self._on_connected,
            on_disconnect=self._on_disconnected,
            max_retries=max_reconnect_retries,
        )

        self._running = False
        self._listen_task: Optional[asyncio.Task] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def start(self):
        """Start the client and initiate connection."""
        if self._running:
            logger.warning("Client already running")
            return

        self._running = True
        logger.info(f"Starting WebSocket client for {self.url}")
        await self._conn_manager.connect(self._do_connect)

    async def stop(self):
        """Stop the client, close connection, cancel all tasks."""
        self._running = False

        if self._heartbeat:
            await self._heartbeat.stop()

        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass

        await self._conn_manager.disconnect()

    async def send(self, data: dict) -> bool:
        """Send a JSON message over the WebSocket if connected."""
        if not self._conn_manager.is_connected() or not self._websocket:
            logger.warning("Cannot send, not connected")
            return False
        try:
            await self._websocket.send(json.dumps(data))
            return True
        except (ConnectionClosed, WebSocketException) as e:
            logger.error(f"Send failed: {e}")
            return False

    # ------------------------------------------------------------------
    # Internal connection & authentication
    # ------------------------------------------------------------------

    async def _do_connect(self):
        """Low‑level connect, called by ConnectionManager."""
        logger.info(f"Connecting to {self.url}")
        ssl_context = None
        if self.url.startswith("wss://"):
            ssl_context = ssl.create_default_context()

        self._websocket = await websockets.connect(
            self.url,
            ssl=ssl_context,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        )
        self._conn_manager.set_websocket(self._websocket)
        logger.info("WebSocket connected")

        # Send authentication / device info immediately
        await self._send_device_info()

    async def _send_device_info(self):
        """Send device identification after connection."""
        info = get_device_info()
        info["type"] = "agent_register"
        info["device_id"] = self.device_id
        info["token"] = os.getenv("NEUROSYNC_TOKEN", "")
        await self._websocket.send(json.dumps(info))
        logger.info(f"Device registered: {self.device_id}")

    async def _on_connected(self):
        """Called by ConnectionManager after successful connect."""
        logger.info("Connection established, starting heartbeat and listener")
        # Start heartbeat
        self._heartbeat = Heartbeat(
            send_callback=self.send,
            device_id=self.device_id,
            interval=self.heartbeat_interval,
        )
        self._heartbeat.start()

        # Start the command listener loop
        if self._listen_task is None or self._listen_task.done():
            self._listen_task = asyncio.create_task(self._listen_loop())

    async def _on_disconnected(self):
        """Called by ConnectionManager when connection is lost."""
        logger.warning("Connection lost")
        if self._heartbeat:
            await self._heartbeat.stop()
            self._heartbeat = None

    # ------------------------------------------------------------------
    # Command handling loop
    # ------------------------------------------------------------------

    async def _listen_loop(self):
        """Continuously receive and process messages."""
        while self._running and self._conn_manager.is_connected():
            try:
                if not self._websocket:
                    await asyncio.sleep(0.5)
                    continue

                message = await self._websocket.recv()
                data = json.loads(message)

                msg_type = data.get("type")
                if msg_type == "heartbeat_ack":
                    logger.debug("heartbeat ACK recieved")
                    continue
                elif msg_type == "command":
                    await self._handle_command(data)
                else:
                    logger.debug(f"Ignoring non command message : {msg_type}")
            except asyncio.CancelledError:
                break
            except ConnectionClosed as e:
                logger.warning(f"Connection closed while listening: {e}")
                # The connection manager will handle reconnection
                break
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}")
                await self.send({
                    "type": "error",
                    "message": "Invalid JSON",
                })
            except Exception as e:
                logger.exception(f"Unexpected error in listen loop: {e}")

    async def _handle_command(self, command: dict):
        """
        Process a command dict and send back the result.
        Expects command to have at least an 'action' field.
        """
        request_id = command.get("request_id")
        action = command.get("action")

        logger.info(f"Received command: action={action}, request_id={request_id}")
        payload = command.get("payload", {})

        router_command = {
            "action": action,
            "request_id": command.get("request_id"),
             **payload
        }

        # Execute via the command router
        result = execute(router_command)

        # Prepare response
        response = {
            "type": "command_result",
            "request_id": request_id,
            **result,   # includes status, action, duration_ms, etc.
        }

        await self.send(response)
        logger.debug(f"Sent result for {action} (status={result.get('status')})")