import pyautogui
import pyperclip
import time
import logging
import platform
from typing import Optional

pyautogui.FAILSAFE = True

logger = logging.getLogger(__name__)

# All valid pyautogui key names for reference/validation
VALID_KEYS = set(pyautogui.KEYBOARD_KEYS)


class KeyboardController:

    # ── Typing ────────────────────────────────────────────────────

    @staticmethod
    def type_text(text: str, interval: float = 0.03) -> dict:
        if not isinstance(text, str):
            return {"status": "error", "message": "text must be a string"}
        try:
            sys_name = platform.system()
            original = pyperclip.paste()
            pyperclip.copy(text)
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "v")
            else:
                pyautogui.hotkey("ctrl", "v")
            time.sleep(0.05)
            pyperclip.copy(original)
            return {"status": "success", "typed": text, "length": len(text)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def type_text_fast(text: str) -> dict:
        """
        Type text instantly via clipboard paste — handles Unicode, emojis, special chars.
        More reliable than write() for non-ASCII content.
        """
        try:
            sys_name = platform.system()
            original = pyperclip.paste()      # save clipboard
            pyperclip.copy(text)
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "v")
            else:
                pyautogui.hotkey("ctrl", "v")
            time.sleep(0.05)
            pyperclip.copy(original)           # restore clipboard
            return {"status": "success", "typed": text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Single keys ───────────────────────────────────────────────

    @staticmethod
    def press_key(key: str) -> dict:
        """Press and release a single key."""
        if key not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'. See pyautogui.KEYBOARD_KEYS"}
        try:
            pyautogui.press(key)
            return {"status": "success", "key": key}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def key_down(key: str) -> dict:
        """Hold a key down (does not release)."""
        if key not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'"}
        try:
            pyautogui.keyDown(key)
            return {"status": "success", "key": key, "held": True}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def key_up(key: str) -> dict:
        """Release a held key."""
        if key not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'"}
        try:
            pyautogui.keyUp(key)
            return {"status": "success", "key": key, "held": False}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def press_key_times(key: str, count: int, interval: float = 0.1) -> dict:
        """Press a key multiple times with an interval."""
        if key not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'"}
        try:
            pyautogui.press(key, presses=count, interval=interval)
            return {"status": "success", "key": key, "presses": count}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Hotkeys / combos ──────────────────────────────────────────

    @staticmethod
    def hotkey(*keys: str) -> dict:
        """Press a key combination simultaneously. e.g. hotkey('ctrl', 'shift', 'esc')"""
        invalid = [k for k in keys if k not in VALID_KEYS]
        if invalid:
            return {"status": "error", "message": f"Invalid keys: {invalid}"}
        try:
            pyautogui.hotkey(*keys)
            return {"status": "success", "keys": list(keys)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Common shortcuts ──────────────────────────────────────────

    @staticmethod
    def copy() -> dict:
        try:
            pyautogui.hotkey("ctrl", "c")
            time.sleep(0.1)
            return {"status": "success", "action": "copy"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def paste() -> dict:
        try:
            pyautogui.hotkey("ctrl", "v")
            return {"status": "success", "action": "paste"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def cut() -> dict:
        try:
            pyautogui.hotkey("ctrl", "x")
            return {"status": "success", "action": "cut"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def select_all() -> dict:
        try:
            pyautogui.hotkey("ctrl", "a")
            return {"status": "success", "action": "select_all"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def undo() -> dict:
        try:
            pyautogui.hotkey("ctrl", "z")
            return {"status": "success", "action": "undo"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def redo() -> dict:
        try:
            pyautogui.hotkey("ctrl", "y")
            return {"status": "success", "action": "redo"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def save() -> dict:
        try:
            pyautogui.hotkey("ctrl", "s")
            return {"status": "success", "action": "save"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def find() -> dict:
        try:
            pyautogui.hotkey("ctrl", "f")
            return {"status": "success", "action": "find"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def close_window() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "w")
            else:
                pyautogui.hotkey("alt", "f4")
            return {"status": "success", "action": "close_window"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def switch_window() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "tab")
            else:
                pyautogui.hotkey("alt", "tab")
            return {"status": "success", "action": "switch_window"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def minimize_window() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "m")
            else:
                pyautogui.hotkey("win", "down")
            return {"status": "success", "action": "minimize_window"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def maximize_window() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "ctrl", "f")
            else:
                pyautogui.hotkey("win", "up")
            return {"status": "success", "action": "maximize_window"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def show_desktop() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "f3")
            else:
                pyautogui.hotkey("win", "d")
            return {"status": "success", "action": "show_desktop"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def lock_screen() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                pyautogui.hotkey("command", "ctrl", "q")
            else:
                pyautogui.hotkey("win", "l")
            return {"status": "success", "action": "lock_screen"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def take_screenshot_key() -> dict:
        """Press PrintScreen."""
        try:
            pyautogui.press("printscreen")
            return {"status": "success", "action": "screenshot"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Clipboard ─────────────────────────────────────────────────

    @staticmethod
    def read_clipboard() -> dict:
        """Return current clipboard text content."""
        try:
            content = pyperclip.paste()
            return {"status": "success", "content": content, "length": len(content)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def write_clipboard(text: str) -> dict:
        """Set clipboard to given text."""
        try:
            pyperclip.copy(text)
            return {"status": "success", "content": text}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def clear_clipboard() -> dict:
        try:
            pyperclip.copy("")
            return {"status": "success", "action": "clear_clipboard"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Sequences ─────────────────────────────────────────────────

    @staticmethod
    def run_sequence(steps: list[dict]) -> dict:
        """
        Execute a sequence of keyboard actions from a list of step dicts.

        Step format examples:
          {"action": "type",    "text": "Hello"}
          {"action": "press",   "key": "enter"}
          {"action": "hotkey",  "keys": ["ctrl", "s"]}
          {"action": "wait",    "seconds": 0.5}
          {"action": "key_down","key": "shift"}
          {"action": "key_up",  "key": "shift"}
        """
        results = []
        for i, step in enumerate(steps):
            action = step.get("action")
            try:
                if action == "type":
                    r = KeyboardController.type_text(step["text"], step.get("interval", 0.03))
                elif action == "type_fast":
                    r = KeyboardController.type_text_fast(step["text"])
                elif action == "press":
                    r = KeyboardController.press_key(step["key"])
                elif action == "hotkey":
                    r = KeyboardController.hotkey(*step["keys"])
                elif action == "key_down":
                    r = KeyboardController.key_down(step["key"])
                elif action == "key_up":
                    r = KeyboardController.key_up(step["key"])
                elif action == "wait":
                    time.sleep(step.get("seconds", 0.1))
                    r = {"status": "success", "action": "wait"}
                else:
                    r = {"status": "error", "message": f"Unknown sequence action: {action}"}
            except KeyError as e:
                r = {"status": "error", "message": f"Missing field in step {i}: {e}"}
            results.append({"step": i, "action": action, "result": r})
            # Stop sequence on error
            if r.get("status") == "error":
                return {"status": "error", "completed_steps": i, "results": results}
        return {"status": "success", "steps_run": len(steps), "results": results}