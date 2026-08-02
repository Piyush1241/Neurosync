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
        """Press screenshot hotkey (PrintScreen on Windows/Linux, Cmd+Shift+3 on macOS)."""
        try:
            if platform.system() == "Darwin":
                pyautogui.hotkey("command", "shift", "3")
            else:
                pyautogui.press("printscreen")
            return {"status": "success", "action": "screenshot"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def _capture_screen_pil():
        """Capture screen across Windows (with GDI fallback), macOS, and Linux."""
        import platform
        sys_name = platform.system()
        
        # 1. Try PyAutoGUI / ImageGrab first
        try:
            return pyautogui.screenshot()
        except Exception:
            pass

        # 2. Try PIL ImageGrab directly
        try:
            from PIL import ImageGrab
            return ImageGrab.grab()
        except Exception:
            pass

        # 3. Windows Native GDI fallback (handles DPI awareness and layered windows)
        if sys_name == "Windows":
            try:
                import ctypes
                from PIL import Image

                user32 = ctypes.windll.user32
                gdi32 = ctypes.windll.gdi32

                try:
                    user32.SetProcessDPIAware()
                except Exception:
                    pass

                w = user32.GetSystemMetrics(0)
                h = user32.GetSystemMetrics(1)

                hdc_src = user32.GetDC(0)
                hdc_mem = gdi32.CreateCompatibleDC(hdc_src)
                hbmp = gdi32.CreateCompatibleBitmap(hdc_src, w, h)
                gdi32.SelectObject(hdc_mem, hbmp)

                # SRCCOPY = 0x00CC0020
                gdi32.BitBlt(hdc_mem, 0, 0, w, h, hdc_src, 0, 0, 0x00CC0020)

                class BITMAPINFOHEADER(ctypes.Structure):
                    _fields_ = [
                        ('biSize', ctypes.c_uint32),
                        ('biWidth', ctypes.c_int32),
                        ('biHeight', ctypes.c_int32),
                        ('biPlanes', ctypes.c_uint16),
                        ('biBitCount', ctypes.c_uint16),
                        ('biCompression', ctypes.c_uint32),
                        ('biSizeImage', ctypes.c_uint32),
                        ('biXPelsPerMeter', ctypes.c_int32),
                        ('biYPelsPerMeter', ctypes.c_int32),
                        ('biClrUsed', ctypes.c_uint32),
                        ('biClrImportant', ctypes.c_uint32)
                    ]

                bmi = BITMAPINFOHEADER()
                bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
                bmi.biWidth = w
                bmi.biHeight = -h
                bmi.biPlanes = 1
                bmi.biBitCount = 32
                bmi.biCompression = 0

                buf = ctypes.create_string_buffer(w * h * 4)
                gdi32.GetDIBits(hdc_mem, hbmp, 0, h, buf, ctypes.byref(bmi), 0)

                img = Image.frombuffer('RGBA', (w, h), buf, 'raw', 'BGRA', 0, 1)

                gdi32.DeleteObject(hbmp)
                gdi32.DeleteDC(hdc_mem)
                user32.ReleaseDC(0, hdc_src)

                return img
            except Exception as ex:
                raise RuntimeError(f"Native Windows GDI screen grab failed: {ex}")

        raise RuntimeError("Screen grab failed on this system")

    @staticmethod
    def take_screenshot(save_to_disk: bool = True) -> dict:
        """Capture screen, save PNG file to Pictures/Screenshots, trigger OS screenshot key, and return base64 string."""
        try:
            import io
            import base64
            import datetime
            import os
            sys_name = platform.system()
            
            img = KeyboardController._capture_screen_pil()
            
            saved_path = None
            if save_to_disk:
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"NeuroSync_Screenshot_{timestamp}.png"
                
                if sys_name == "Windows":
                    pictures_dir = os.path.expanduser("~/Pictures/Screenshots")
                    if not os.path.exists(pictures_dir):
                        pictures_dir = os.path.expanduser("~/Pictures")
                elif sys_name == "Darwin":
                    pictures_dir = os.path.expanduser("~/Desktop")
                else:
                    pictures_dir = os.path.expanduser("~/Pictures")
                
                os.makedirs(pictures_dir, exist_ok=True)
                saved_path = os.path.join(pictures_dir, filename)
                img.save(saved_path, format="PNG")

                # Trigger OS screenshot key for visual/notification response
                try:
                    if sys_name == "Windows":
                        pyautogui.press("printscreen")
                    elif sys_name == "Darwin":
                        pyautogui.hotkey("command", "shift", "3")
                except Exception:
                    pass

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

            return {
                "status": "success",
                "action": "take_screenshot",
                "width": img.width,
                "height": img.height,
                "saved_path": saved_path,
                "base64": b64_str
            }
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