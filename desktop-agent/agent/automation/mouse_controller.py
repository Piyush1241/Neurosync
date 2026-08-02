import pyautogui
import pyperclip
import platform
import time
import logging
from typing import Optional

try:
    import Quartz  # type: ignore # noqa: F401
except ImportError:
    Quartz = None

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.0

logger = logging.getLogger(__name__)


class MouseController:
    """
    Full mouse control — move, click, drag, scroll, multi-monitor aware.
    All methods return a standard {"status": ...} dict.
    """

    _position_history: list[tuple[int, int]] = []
    MAX_HISTORY = 50

    # ── Internal ──────────────────────────────────────────────────

    @classmethod
    def _record(cls, x: int, y: int):
        cls._position_history.append((x, y))
        if len(cls._position_history) > cls.MAX_HISTORY:
            cls._position_history.pop(0)

    @staticmethod
    def _screen_size() -> tuple[int, int]:
        return pyautogui.size()

    @staticmethod
    def _clamp(x: int, y: int) -> tuple[int, int]:
        w, h = pyautogui.size()
        return max(0, min(x, w - 1)), max(0, min(y, h - 1))

    @staticmethod
    def _mac_move(x: int, y: int):
        if platform.system() == "Darwin" and Quartz is not None:
            try:
                fx, fy = float(x), float(y)
                Quartz.CGWarpMouseCursorPosition(Quartz.CGPoint(fx, fy))
                event = Quartz.CGEventCreateMouseEvent(None, Quartz.kCGEventMouseMoved, Quartz.CGPoint(fx, fy), Quartz.kCGMouseButtonLeft)
                Quartz.CGEventPost(Quartz.kCGHIDEventTap, event)
                Quartz.CGEventPost(Quartz.kCGSessionEventTap, event)
            except Exception as ex:
                logger.debug(f"Quartz move failed: {ex}")

    # ── Movement ──────────────────────────────────────────────────

    @classmethod
    def move(cls, x: int, y: int, duration: float = 0.0) -> dict:
        """Move mouse to absolute position (x, y)."""
        x, y = cls._clamp(int(float(x)), int(float(y)))
        try:
            pyautogui.FAILSAFE = False
            if platform.system() == "Darwin":
                cls._mac_move(x, y)
            pyautogui.moveTo(x, y, duration=duration, _pause=False)
            cls._record(x, y)
            return {"status": "success", "x": x, "y": y}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def move_relative(cls, dx: int, dy: int, duration: float = 0.0) -> dict:
        """Move mouse by (dx, dy) relative to current position."""
        try:
            pyautogui.FAILSAFE = False
            dx, dy = int(float(dx)), int(float(dy))
            pos = cls.get_position()
            cx = pos.get("x", 0)
            cy = pos.get("y", 0)
            nx, ny = cls._clamp(int(cx + dx), int(cy + dy))
            if platform.system() == "Darwin":
                cls._mac_move(nx, ny)
            if duration > 0:
                pyautogui.moveTo(nx, ny, duration=duration, _pause=False)
            else:
                pyautogui.moveTo(nx, ny, _pause=False)
            cls._record(nx, ny)
            return {"status": "success", "x": nx, "y": ny, "moved_by": {"dx": dx, "dy": dy}}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def move_smooth(cls, x: int, y: int, steps: int = 20) -> dict:
        """
        Move mouse smoothly using a bezier-like curve.
        More human-like than a straight moveTo.
        """
        import random
        x, y = cls._clamp(int(float(x)), int(float(y)))
        try:
            pos = cls.get_position()
            cx, cy = pos.get("x", 0), pos.get("y", 0)
            for i in range(1, steps + 1):
                t = i / steps
                t_ease = t * t * (3 - 2 * t)
                nx = int(cx + (x - cx) * t_ease)
                ny = int(cy + (y - cy) * t_ease)
                if platform.system() == "Darwin":
                    cls._mac_move(nx, ny)
                pyautogui.moveTo(nx, ny, duration=0)
                time.sleep(0.008 + random.uniform(0, 0.004))
            cls._record(x, y)
            return {"status": "success", "x": x, "y": y}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Clicks ────────────────────────────────────────────────────

    @classmethod
    def click(cls, x: int = None, y: int = None, button: str = "left") -> dict:
        """Left/right/middle click at current or given position."""
        try:
            if x is not None and y is not None:
                x, y = cls._clamp(int(float(x)), int(float(y)))
                if platform.system() == "Darwin":
                    cls._mac_move(x, y)

            if platform.system() == "Darwin" and Quartz is not None:
                try:
                    pos = cls.get_position()
                    cx = x if x is not None else pos.get("x", 0)
                    cy = y if y is not None else pos.get("y", 0)
                    btn = Quartz.kCGMouseButtonRight if button == "right" else Quartz.kCGMouseButtonLeft
                    down_evt = Quartz.kCGEventRightMouseDown if button == "right" else Quartz.kCGEventLeftMouseDown
                    up_evt = Quartz.kCGEventRightMouseUp if button == "right" else Quartz.kCGEventLeftMouseUp
                    e_down = Quartz.CGEventCreateMouseEvent(None, down_evt, Quartz.CGPoint(float(cx), float(cy)), btn)
                    e_up = Quartz.CGEventCreateMouseEvent(None, up_evt, Quartz.CGPoint(float(cx), float(cy)), btn)
                    Quartz.CGEventPost(Quartz.kCGHIDEventTap, e_down)
                    Quartz.CGEventPost(Quartz.kCGHIDEventTap, e_up)
                    Quartz.CGEventPost(Quartz.kCGSessionEventTap, e_down)
                    Quartz.CGEventPost(Quartz.kCGSessionEventTap, e_up)
                except Exception as ex:
                    logger.debug(f"Quartz click failed: {ex}")

            if x is not None and y is not None:
                pyautogui.click(x, y, button=button)
            else:
                pyautogui.click(button=button)
            pos = cls.get_position()
            return {"status": "success", "button": button, "x": pos.get("x"), "y": pos.get("y")}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def right_click(cls, x: int = None, y: int = None) -> dict:
        return cls.click(x, y, button="right")

    @classmethod
    def middle_click(cls, x: int = None, y: int = None) -> dict:
        return cls.click(x, y, button="middle")

    @classmethod
    def double_click(cls, x: int = None, y: int = None) -> dict:
        try:
            if x is not None and y is not None:
                x, y = cls._clamp(x, y)
                pyautogui.doubleClick(x, y)
                cls._record(x, y)
            else:
                pyautogui.doubleClick()
            pos = pyautogui.position()
            return {"status": "success", "x": pos.x, "y": pos.y}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def triple_click(cls, x: int = None, y: int = None) -> dict:
        """Triple-click — useful for selecting a word or line."""
        try:
            if x is not None and y is not None:
                x, y = cls._clamp(x, y)
                pyautogui.click(x, y, clicks=3, interval=0.05)
                cls._record(x, y)
            else:
                pyautogui.click(clicks=3, interval=0.05)
            return {"status": "success"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Drag ──────────────────────────────────────────────────────

    @classmethod
    def drag(cls, x1: int, y1: int, x2: int, y2: int, duration: float = 0.4, button: str = "left") -> dict:
        """Click-drag from (x1,y1) to (x2,y2)."""
        x1, y1 = cls._clamp(x1, y1)
        x2, y2 = cls._clamp(x2, y2)
        try:
            pyautogui.mouseDown(x1, y1, button=button)
            time.sleep(0.05)
            pyautogui.moveTo(x2, y2, duration=duration)
            pyautogui.mouseUp(button=button)
            cls._record(x2, y2)
            return {"status": "success", "from": {"x": x1, "y": y1}, "to": {"x": x2, "y": y2}}
        except Exception as e:
            try:
                pyautogui.FAILSAFE=False
                pyautogui.mouseUp()
                pyautogui.FAILSAFE = False
            except Exception:
                pass
            return {"status": "error", "message": str(e)}
            

    @classmethod
    def drag_relative(cls, dx: int, dy: int, duration: float = 0.4) -> dict:
        """Drag from current position by (dx, dy)."""
        cx, cy = pyautogui.position()
        return cls.drag(cx, cy, cx + dx, cy + dy, duration)

    # ── Scroll ────────────────────────────────────────────────────

    @classmethod
    def scroll(cls, amount: int, x: int = None, y: int = None) -> dict:
        """
        Scroll vertically. Positive = up, negative = down.
        Optionally move to (x,y) before scrolling.
        """
        try:
            if x is not None and y is not None:
                x, y = cls._clamp(x, y)
                pyautogui.moveTo(x, y)
            pyautogui.scroll(amount)
            return {"status": "success", "amount": amount}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def scroll_horizontal(cls, amount: int) -> dict:
        """Scroll horizontally (positive = right, negative = left)."""
        try:
            pyautogui.hscroll(amount)
            return {"status": "success", "amount": amount}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Mouse button hold ─────────────────────────────────────────

    @classmethod
    def mouse_down(cls, button: str = "left", x: int = None, y: int = None) -> dict:
        try:
            if x is not None and y is not None:
                x, y = cls._clamp(x, y)
                pyautogui.mouseDown(x, y, button=button)
            else:
                pyautogui.mouseDown(button=button)
            return {"status": "success", "button": button, "held": True}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def mouse_up(cls, button: str = "left") -> dict:
        try:
            pyautogui.mouseUp(button=button)
            return {"status": "success", "button": button, "held": False}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Position / info ───────────────────────────────────────────

    @classmethod
    def get_position(cls) -> dict:
        if platform.system() == "Darwin" and Quartz is not None:
            try:
                evt = Quartz.CGEventCreate(None)
                loc = Quartz.CGEventGetLocation(evt)
                return {"status": "success", "x": int(loc.x), "y": int(loc.y)}
            except Exception:
                pass
        x, y = pyautogui.position()
        return {"status": "success", "x": x, "y": y}

    @classmethod
    def get_screen_size(cls) -> dict:
        w, h = pyautogui.size()
        return {"status": "success", "width": w, "height": h}

    @classmethod
    def get_history(cls) -> dict:
        return {"status": "success", "history": cls._position_history}

    @classmethod
    def move_to_center(cls) -> dict:
        w, h = pyautogui.size()
        return cls.move(w // 2, h // 2)

    @classmethod
    def move_to_corner(cls, corner: str = "top-left") -> dict:
        w, h = pyautogui.size()
        positions = {
            "top-left":     (5, 5),
            "top-right":    (w - 5, 5),
            "bottom-left":  (5, h - 5),
            "bottom-right": (w - 5, h - 5),
        }
        if corner not in positions:
            return {"status": "error", "message": f"Unknown     corner: {corner}"}
        x, y = positions[corner]
        return cls.move(x, y)

    @classmethod
    def pixel_color(cls, x: int, y: int) -> dict:
        """Get the RGB color of a screen pixel."""
        try:
            r, g, b = pyautogui.pixel(x, y)
            return {"status": "success", "x": x, "y": y, "rgb": {"r": r, "g": g, "b": b}, "hex": f"#{r:02x}{g:02x}{b:02x}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}