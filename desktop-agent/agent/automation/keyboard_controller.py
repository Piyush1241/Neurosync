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
            time.sleep(0.3)  # Ensure active window focus
            
            if sys_name == "Darwin":
                import subprocess
                clean_text = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                
                # 1. Direct TextEdit document insertion if TextEdit is active/running
                try:
                    script = (
                        f'tell application "TextEdit"\n'
                        f'  if running then\n'
                        f'    activate\n'
                        f'    if (count of documents) is 0 then make new document\n'
                        f'    set current_text to text of document 1\n'
                        f'    if current_text is "" then\n'
                        f'      set text of document 1 to "{clean_text}"\n'
                        f'    else\n'
                        f'      set text of document 1 to (current_text & return & "{clean_text}")\n'
                        f'    end if\n'
                        f'    return "OK"\n'
                        f'  end if\n'
                        f'end tell'
                    )
                    res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                    if res.returncode == 0 and "OK" in res.stdout:
                        return {"status": "success", "typed": text, "length": len(text)}
                except Exception as ex:
                    logger.debug(f"TextEdit direct AppleScript bypass skipped: {ex}")

                # 2. System Events keystroke
                escaped = text.replace('\\', '\\\\').replace('"', '\\"')
                script = f'tell application "System Events" to keystroke "{escaped}"'
                res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                if res.returncode == 0:
                    return {"status": "success", "typed": text, "length": len(text)}
                elif "not allowed to send keystrokes" in res.stderr or "1002" in res.stderr:
                    logger.error("macOS Accessibility Permission Required! Please re-add NeuroSync under System Settings > Privacy & Security > Accessibility.")

            # 3. Fallback for Windows/Linux or general apps
            try:
                original = pyperclip.paste()
                pyperclip.copy(text)
                if sys_name == "Darwin":
                    pyautogui.hotkey("command", "v")
                else:
                    pyautogui.hotkey("ctrl", "v")
                time.sleep(0.1)
                pyperclip.copy(original)
            except Exception:
                pyautogui.write(text, interval=interval)
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

    MAC_KEY_CODES = {
        'enter': 36, 'return': 36,
        'esc': 53, 'escape': 53,
        'tab': 48,
        'space': 49,
        'backspace': 51,
        'delete': 117,
        'up': 126, 'down': 125, 'left': 123, 'right': 124,
        'win': 55, 'command': 55, 'cmd': 55,
        'option': 58, 'alt': 58,
        'ctrl': 59, 'control': 59,
        'shift': 56
    }

    @staticmethod
    def _mac_press_key(key: str) -> bool:
        if platform.system() == "Darwin":
            import subprocess
            k_lower = key.lower()
            if k_lower in KeyboardController.MAC_KEY_CODES:
                code = KeyboardController.MAC_KEY_CODES[k_lower]
                script = f'tell application "System Events" to key code {code}'
                res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                return res.returncode == 0
        return False

    @staticmethod
    def _mac_hotkey(keys: list[str]) -> bool:
        if platform.system() == "Darwin":
            import subprocess
            mods = []
            char_key = None
            for k in keys:
                kl = k.lower()
                if kl in ('command', 'cmd', 'win', 'super', 'meta'):
                    mods.append('command down')
                elif kl in ('ctrl', 'control'):
                    mods.append('control down')
                elif kl in ('alt', 'option'):
                    mods.append('option down')
                elif kl == 'shift':
                    mods.append('shift down')
                else:
                    char_key = kl

            if char_key:
                mod_str = " using {" + ", ".join(mods) + "}" if mods else ""
                script = f'tell application "System Events" to keystroke "{char_key}"{mod_str}'
                res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                return res.returncode == 0
        return False

    # ── Single keys ───────────────────────────────────────────────

    @staticmethod
    def press_key(key: str) -> dict:
        """Press and release a single key."""
        key_str = str(key).lower()
        if platform.system() == "Darwin":
            if key_str in ("win", "windows", "super", "meta"):
                key_str = "command"
            if KeyboardController._mac_press_key(key_str):
                return {"status": "success", "key": key}

        valid_k = "command" if key_str in ("win", "cmd") else key_str
        if valid_k not in VALID_KEYS and key_str not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'. See pyautogui.KEYBOARD_KEYS"}
        try:
            pyautogui.press(valid_k if valid_k in VALID_KEYS else key_str)
            return {"status": "success", "key": key}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def key_down(key: str) -> dict:
        """Hold a key down (does not release)."""
        valid_k = "command" if str(key).lower() in ("win", "cmd") else key
        if valid_k not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'"}
        try:
            pyautogui.keyDown(valid_k)
            return {"status": "success", "key": key, "held": True}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def key_up(key: str) -> dict:
        """Release a held key."""
        valid_k = "command" if str(key).lower() in ("win", "cmd") else key
        if valid_k not in VALID_KEYS:
            return {"status": "error", "message": f"Invalid key: '{key}'"}
        try:
            pyautogui.keyUp(valid_k)
            return {"status": "success", "key": key, "held": False}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def press_key_times(key: str, count: int, interval: float = 0.1) -> dict:
        """Press a key multiple times with an interval."""
        for _ in range(count):
            r = KeyboardController.press_key(key)
            if r.get("status") == "error":
                return r
            time.sleep(interval)
        return {"status": "success", "key": key, "presses": count}

    # ── Hotkeys / combos ──────────────────────────────────────────

    @staticmethod
    def hotkey(*keys: str) -> dict:
        """Press a key combination simultaneously. e.g. hotkey('ctrl', 'shift', 'esc')"""
        sys_name = platform.system()
        keys_list = [str(k).lower() for k in keys]

        if sys_name == "Darwin":
            if any(k in ("alt", "option") for k in keys_list) and "f4" in keys_list:
                return KeyboardController.close_window()

        translated_keys = []
        for k in keys_list:
            if sys_name == "Darwin":
                if k in ("ctrl", "control", "win", "windows", "super", "meta"):
                    translated_keys.append("command")
                else:
                    translated_keys.append(k)
            else:
                translated_keys.append(k)

        if sys_name == "Darwin":
            if KeyboardController._mac_hotkey(translated_keys):
                return {"status": "success", "keys": list(keys)}

        invalid = [k for k in translated_keys if k not in VALID_KEYS and k not in ("command", "cmd")]
        if invalid:
            return {"status": "error", "message": f"Invalid keys: {invalid}"}
        try:
            pyautogui.hotkey(*translated_keys)
            return {"status": "success", "keys": list(keys)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ── Common shortcuts ──────────────────────────────────────────

    @staticmethod
    def copy() -> dict:
        try:
            return KeyboardController.hotkey("ctrl", "c")
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def paste() -> dict:
        try:
            return KeyboardController.hotkey("ctrl", "v")
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def cut() -> dict:
        try:
            return KeyboardController.hotkey("ctrl", "x")
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def select_all() -> dict:
        try:
            return KeyboardController.hotkey("ctrl", "a")
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def undo() -> dict:
        try:
            return KeyboardController.hotkey("ctrl", "z")
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def redo() -> dict:
        try:
            sys_name = platform.system()
            if sys_name == "Darwin":
                return KeyboardController.hotkey("command", "shift", "z")
            return KeyboardController.hotkey("ctrl", "y")
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