import asyncio
import logging
import time
import psutil
import sys
from typing import Optional, Callable, Awaitable

logger = logging.getLogger(__name__)

def _get_live_metrics():
    try:
        vm = psutil.virtual_memory()
        du = psutil.disk_usage('/') if sys.platform != 'win32' else psutil.disk_usage('C:\\')
        uptime_sec = int(time.time() - psutil.boot_time())
        hours = uptime_sec // 3600
        mins = (uptime_sec % 3600) // 60

        return {
            "cpu": round(psutil.cpu_percent(interval=None), 1),
            "ram": round(vm.percent, 1),
            "ramTotal": round(vm.total / (1024 ** 3), 1),
            "ramUsed": round(vm.used / (1024 ** 3), 1),
            "disk": round(du.percent, 1),
            "diskTotal": round(du.total / (1024 ** 3), 1),
            "diskUsed": round(du.used / (1024 ** 3), 1),
            "uptime": f"{hours}h {mins}m",
            "processes": len(psutil.pids()),
        }
    except Exception as e:
        logger.error(f"Failed to gather live metrics for heartbeat: {e}")
        return {}

class Heartbeat:
    """
    Send periodic heartbeat messages with live system stats over a WebSocket.
    The heartbeat task runs independently and can be cancelled.
    """

    def __init__(
        self,
        send_callback: Callable[[dict], Awaitable[None]],
        device_id: str,
        interval: int = 5,
    ):
        self.send_callback = send_callback
        self.device_id = device_id
        self.interval = interval
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def _run(self):
        """Internal loop sending heartbeats with live system metrics."""
        while self._running:
            try:
                metrics = _get_live_metrics()
                await self.send_callback({
                    "type": "heartbeat",
                    "device_id": self.device_id,
                    "metrics": metrics,
                    "timestamp": time.time()
                })
                logger.debug("Heartbeat with metrics sent")
            except Exception as e:
                logger.warning(f"Heartbeat send failed: {e}")
            await asyncio.sleep(self.interval)

    def start(self):
        """Start the heartbeat task."""
        if self._task is None or self._task.done():
            self._running = True
            self._task = asyncio.create_task(self._run())
            logger.info(f"Heartbeat started (interval={self.interval}s)")

    async def stop(self):
        """Stop the heartbeat task gracefully."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Heartbeat stopped")