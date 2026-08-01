#!/usr/bin/env python3
"""
Desktop Agent – Main Entry Point

Connects to a backend WebSocket server, registers the device,
listens for commands, executes them via the command router,
and sends back results with automatic reconnection.
"""

import asyncio
import argparse
import logging
import os
import signal
import sys
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from connection.websocket_client import WebSocketClient
from connection.device_info import get_device_info

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("desktop_agent")

def parse_args():
    parser = argparse.ArgumentParser(description="Desktop Agent WebSocket Client")
    parser.add_argument(
        "--url",
        type=str,
        default=os.getenv("BACKEND_WS_URL", "wss://neurosync-4giu.onrender.com/ws"),
        help="WebSocket server URL (e.g., ws://localhost:8000/ws or wss://example.com/ws)"
    )
    parser.add_argument(
        "--heartbeat-interval",
        type=int,
        default=int(os.getenv("HEARTBEAT_INTERVAL", "30")),
        help="Heartbeat interval in seconds"
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=int(os.getenv("MAX_RECONNECT_RETRIES", "0")),
        help="Maximum reconnect retries (0 = infinite)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )
    return parser.parse_args()

async def shutdown(signal, client):
    """Graceful shutdown handler."""
    logger.info(f"Received signal {signal.name}, shutting down...")
    await client.stop()
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("Shutdown complete")
    asyncio.get_event_loop().stop()

async def main():
    args = parse_args()
    logger.info(f"Backend URL: {args.url}")

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")

    # Show device info on startup
    info = get_device_info()
    logger.info(f"Starting Desktop Agent on {info['hostname']} ({info['os']} {info['os_version']})")
    logger.info(f"Device ID: {info['device_id']}")

    # Create WebSocket client
    client = WebSocketClient(
        url=args.url,
        heartbeat_interval=args.heartbeat_interval,
        max_reconnect_retries=args.max_retries,
    )

    # Register signal handlers for graceful shutdown
    try:
        for sig in (signal.SIGINT, signal.SIGTERM):

            asyncio.get_running_loop().add_signal_handler(
                sig,
                lambda s=sig: asyncio.create_task(
                    shutdown(s, client)
                )
            )

    except NotImplementedError:

        logger.warning(
        "Signal handlers not supported on this platform."
        )

    # Start the client
    try:
        await client.start()
        # Keep the event loop running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        # Already handled by signal, but catch just in case
        logger.info("Keyboard interrupt received")
        await client.stop()
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        await client.stop()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())