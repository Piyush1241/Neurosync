import subprocess
import platform
import os
import shutil
import psutil
import logging
from typing import Optional, List, Union

logger = logging.getLogger(__name__)


class AppLauncher:
    _launched: dict = {}

    @staticmethod
    def _system() -> str:
        return platform.system()

    @staticmethod
    def _which(cmd: str) -> bool:
        """Return True if a command exists on PATH."""
        return shutil.which(cmd) is not None

    @classmethod
    def _find_executable(cls, paths: List[str]) -> Optional[str]:
        """Return the first existing path from the list, or None."""
        for p in paths:
            expanded = os.path.expandvars(p)
            if os.path.isfile(expanded):
                return expanded
        return None

    @classmethod
    def _launch(cls, args: Union[List[str], str], shell: bool = False, label: str = "") -> dict:
        try:
            proc = subprocess.Popen(
                args,
                shell=shell,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if label:
                cls._launched[label] = psutil.Process(proc.pid)
            logger.info(f"Launched '{label or args}' pid={proc.pid}")
            return {"status": "success", "pid": proc.pid, "app": label or str(args)}
        except FileNotFoundError:
            msg = f"Executable not found: {args}"
            logger.error(msg)
            return {"status": "error", "message": msg}
        except Exception as e:
            logger.exception(f"Failed to launch {label}")
            return {"status": "error", "message": str(e)}

    # ── Browser launchers ───────────────────────────────────────────────────

    @classmethod
    def open_chrome(cls, url: str = "") -> dict:
        sys = cls._system()
        url_arg = [url] if url else []

        if sys == "Darwin":
            return cls._launch(["open", "-a", "Google Chrome"] + url_arg, label="chrome")
        elif sys == "Windows":
            chrome_paths = [
                r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe",
                r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe",
                r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
            ]
            exe = cls._find_executable(chrome_paths)
            if not exe:
                return {"status": "error", "message": "Chrome not found (searched Program Files, LocalAppData)"}
            return cls._launch([exe] + url_arg, label="chrome")
        elif sys == "Linux":
            exe = next((e for e in ["google-chrome", "chromium-browser", "chromium"] if cls._which(e)), None)
            if not exe:
                return {"status": "error", "message": "Chrome/Chromium not found"}
            return cls._launch([exe] + url_arg, label="chrome")

        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_firefox(cls, url: str = "") -> dict:
        sys = cls._system()
        url_arg = [url] if url else []

        if sys == "Darwin":
            return cls._launch(["open", "-a", "Firefox"] + url_arg, label="firefox")
        elif sys == "Windows":
            firefox_paths = [
                r"%PROGRAMFILES%\Mozilla Firefox\firefox.exe",
                r"%PROGRAMFILES(X86)%\Mozilla Firefox\firefox.exe",
            ]
            exe = cls._find_executable(firefox_paths)
            if not exe:
                return {"status": "error", "message": "Firefox not found (searched Program Files)"}
            return cls._launch([exe] + url_arg, label="firefox")
        elif sys == "Linux":
            return cls._launch(["firefox"] + url_arg, label="firefox")

        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_edge(cls, url: str = "") -> dict:
        sys = cls._system()
        url_arg = [url] if url else []

        if sys == "Darwin":
            return cls._launch(["open", "-a", "Microsoft Edge"] + url_arg, label="edge")
        elif sys == "Windows":
            edge_paths = [
                r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe",
                r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe",
            ]
            exe = cls._find_executable(edge_paths)
            if not exe:
                return {"status": "error", "message": "Microsoft Edge not found (searched Program Files)"}
            return cls._launch([exe] + url_arg, label="edge")
        elif sys == "Linux":
            return cls._launch(["microsoft-edge"] + url_arg, label="edge")

        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    # ── Editors / IDEs ──────────────────────────────────────────────────────

    @classmethod
    def open_vscode(cls, path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            if cls._which("code"):
                return cls._launch(["code"] + ([path] if path else []), label="vscode")
            return cls._launch(["open", "-a", "Visual Studio Code"] + ([path] if path else []), label="vscode")
        elif sys == "Windows":
            if cls._which("code"):
                return cls._launch(["code"] + ([path] if path else []), label="vscode")
            candidates = [
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"),
                os.path.expandvars(r"%PROGRAMFILES%\Microsoft VS Code\Code.exe"),
                os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft VS Code\Code.exe"),
            ]
            for exe in candidates:
                if os.path.exists(exe):
                    return cls._launch([exe] + ([path] if path else []), label="vscode")
            return {"status": "error", "message": "VSCode not found"}
        elif sys == "Linux":
            return cls._launch(["code"] + ([path] if path else []), label="vscode")
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_notepad(cls, file_path: str = "") -> dict:
        sys = cls._system()
        import time
        if sys == "Darwin":
            args = ["open", "-a", "TextEdit"] + ([file_path] if file_path else [])
            res = cls._launch(args, label="notepad")
            # Ensure TextEdit is active and has an open document window
            cmd = 'osascript -e \'tell application "TextEdit" to activate\' -e \'tell application "TextEdit" to if (count of documents) is 0 then make new document\''
            os.system(cmd)
            time.sleep(0.5)
            return res
        elif sys == "Windows":
            args = ["notepad"] + ([file_path] if file_path else [])
            res = cls._launch(args, label="notepad")
            time.sleep(0.5)
            return res
        elif sys == "Linux":
            for editor in ["gedit", "kate", "mousepad", "xed"]:
                if cls._which(editor):
                    res = cls._launch([editor] + ([file_path] if file_path else []), label=editor)
                    time.sleep(0.5)
                    return res
            return {"status": "error", "message": "No text editor found"}
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_sublime(cls, file_path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Sublime Text"] + ([file_path] if file_path else []), label="sublime")
        elif sys == "Windows":
            exe = r"C:\Program Files\Sublime Text\sublime_text.exe"
            args = [exe] + ([file_path] if file_path else [])
            return cls._launch(args, label="sublime")
        elif sys == "Linux":
            return cls._launch(["subl"] + ([file_path] if file_path else []), label="sublime")
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_pycharm(cls, project_path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "PyCharm"] + ([project_path] if project_path else []), label="pycharm")
        elif sys == "Windows":
            return cls._launch(["charm"] + ([project_path] if project_path else []), label="pycharm")
        elif sys == "Linux":
            return cls._launch(["pycharm"] + ([project_path] if project_path else []), label="pycharm")
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    # ── Terminal ────────────────────────────────────────────────────────────

    @classmethod
    def open_terminal(cls) -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Terminal"], label="terminal")
        elif sys == "Windows":
            if cls._which("wt"):
                return cls._launch(["wt"], label="terminal")
            return cls._launch(["cmd"], label="cmd")
        elif sys == "Linux":
            for term in ["gnome-terminal", "konsole", "xterm", "xfce4-terminal", "alacritty"]:
                if cls._which(term):
                    return cls._launch([term], label=term)
            return {"status": "error", "message": "No terminal emulator found"}
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    # ── Office / Productivity ───────────────────────────────────────────────

    @classmethod
    def open_excel(cls, file_path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Microsoft Excel"] + ([file_path] if file_path else []), label="excel")
        elif sys == "Windows":
            cmd = f'start excel {" " + file_path if file_path else ""}'
            return cls._launch(cmd, shell=True, label="excel")
        return {"status": "error", "message": "Excel not available on this OS"}

    @classmethod
    def open_word(cls, file_path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Microsoft Word"] + ([file_path] if file_path else []), label="word")
        elif sys == "Windows":
            args = ["start", "winword"] + ([file_path] if file_path else [])
            return cls._launch(args, shell=True, label="word")
        return {"status": "error", "message": "Word not available on this OS"}

    @classmethod
    def open_calculator(cls) -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Calculator"], label="calculator")
        elif sys == "Windows":
            return cls._launch(["calc"], label="calculator")
        elif sys == "Linux":
            for calc in ["gnome-calculator", "kcalc", "galculator"]:
                if cls._which(calc):
                    return cls._launch([calc], label="calculator")
            return {"status": "error", "message": "No calculator found"}
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    # ── Media ───────────────────────────────────────────────────────────────

    @classmethod
    def open_vlc(cls, file_path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "VLC"] + ([file_path] if file_path else []), label="vlc")
        elif sys == "Windows":
            vlc = r"C:\Program Files\VideoLAN\VLC\vlc.exe"
            args = [vlc] + ([file_path] if file_path else [])
            return cls._launch(args, label="vlc")
        elif sys == "Linux":
            return cls._launch(["vlc"] + ([file_path] if file_path else []), label="vlc")
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_spotify(cls) -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open", "-a", "Spotify"], label="spotify")
        elif sys == "Windows":
            candidates = [
                os.path.expandvars(r"%APPDATA%\Spotify\Spotify.exe"),
                os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\Spotify.exe"),
                os.path.expandvars(r"%PROGRAMFILES%\Spotify\Spotify.exe"),
            ]
            for exe in candidates:
                if os.path.exists(exe):
                    return cls._launch([exe], label="spotify")
            return {"status": "error", "message": "Spotify not found"}
        elif sys == "Linux":
            return cls._launch(["spotify"], label="spotify")
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    @classmethod
    def open_file_manager(cls, path: str = "") -> dict:
        sys = cls._system()
        if sys == "Darwin":
            return cls._launch(["open"] + ([path] if path else ["."]), label="finder")
        elif sys == "Windows":
            args = ["explorer"] + ([path] if path else [])
            return cls._launch(args, label="explorer")
        elif sys == "Linux":
            for fm in ["nautilus", "thunar", "dolphin", "nemo"]:
                if cls._which(fm):
                    return cls._launch([fm] + ([path] if path else []), label=fm)
            return {"status": "error", "message": "No file manager found"}
        return {"status": "error", "message": f"Unsupported OS: {sys}"}

    # ── Generic launcher (unchanged) ────────────────────────────────────────

    @classmethod
    def open_app(cls, app_name: str, args: list[str] = None) -> dict:
        """Open any app by name or full path."""
        cmd = [app_name] + (args or [])
        return cls._launch(cmd, label=app_name)

    # ── Process management (unchanged) ──────────────────────────────────────

    @classmethod
    def kill_app(cls, label: str) -> dict:
        proc = cls._launched.get(label)
        if not proc:
            return {"status": "error", "message": f"No tracked process for '{label}'"}
        try:
            proc.terminate()
            proc.wait(timeout=5)
            del cls._launched[label]
            return {"status": "success", "message": f"'{label}' terminated"}
        except psutil.NoSuchProcess:
            del cls._launched[label]
            return {"status": "success", "message": f"'{label}' was already gone"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def list_running(cls) -> dict:
        alive = {}
        dead = []
        for label, proc in cls._launched.items():
            try:
                if proc.is_running():
                    alive[label] = proc.pid
                else:
                    dead.append(label)
            except psutil.NoSuchProcess:
                dead.append(label)
        for d in dead:
            del cls._launched[d]
        return {"status": "success", "running": alive}

    @classmethod
    def is_running(cls, label: str) -> dict:
        proc = cls._launched.get(label)
        if not proc:
            return {"status": "success", "running": False, "message": "Not in tracked processes"}
        try:
            running = proc.is_running()
            return {"status": "success", "running": running, "pid": proc.pid}
        except psutil.NoSuchProcess:
            del cls._launched[label]
            return {"status": "success", "running": False}

    # ── System Info, Processes & Power Controls (Cross-Platform) ────────────

    @classmethod
    def get_running_processes(cls, limit: int = 50) -> dict:
        """Return list of top running processes for Windows, macOS, and Linux."""
        try:
            procs = []
            for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username']):
                try:
                    info = p.info
                    procs.append({
                        "pid": info['pid'],
                        "name": info['name'] or 'Unknown',
                        "cpu_percent": info['cpu_percent'] or 0.0,
                        "memory_percent": round(info['memory_percent'] or 0.0, 2),
                        "username": info.get('username') or ''
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue

            procs.sort(key=lambda x: x['cpu_percent'], reverse=True)
            return {
                "status": "success",
                "total_processes": len(procs),
                "processes": procs[:limit]
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def get_system_info(cls) -> dict:
        """Return hardware specs, OS version, and resource usage for Windows, macOS, and Linux."""
        try:
            import time
            vm = psutil.virtual_memory()
            sys_platform = platform.system()
            disk_path = '/' if sys_platform != 'win32' else 'C:\\'
            du = psutil.disk_usage(disk_path)
            boot_time = psutil.boot_time()
            uptime_sec = int(time.time() - boot_time)

            return {
                "status": "success",
                "platform": sys_platform,
                "os_release": platform.release(),
                "os_version": platform.version(),
                "architecture": platform.machine(),
                "processor": platform.processor() or sys_platform,
                "hostname": platform.node(),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "cpu_count_physical": psutil.cpu_count(logical=False),
                "cpu_percent": round(psutil.cpu_percent(interval=0.1), 1),
                "ram_total_gb": round(vm.total / (1024 ** 3), 2),
                "ram_used_gb": round(vm.used / (1024 ** 3), 2),
                "ram_percent": round(vm.percent, 1),
                "disk_total_gb": round(du.total / (1024 ** 3), 2),
                "disk_used_gb": round(du.used / (1024 ** 3), 2),
                "disk_percent": round(du.percent, 1),
                "uptime_hours": round(uptime_sec / 3600, 2),
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def shutdown_system(cls) -> dict:
        """Initiate system shutdown cross-platform."""
        sys_name = cls._system()
        try:
            if sys_name == "Windows":
                subprocess.Popen(["shutdown", "/s", "/t", "5"])
            elif sys_name == "Darwin":
                subprocess.Popen(["osascript", "-e", 'tell application "System Events" to shut down'])
            elif sys_name == "Linux":
                subprocess.Popen(["shutdown", "-h", "now"])
            return {"status": "success", "message": f"Shutdown initiated on {sys_name}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def restart_system(cls) -> dict:
        """Initiate system restart cross-platform."""
        sys_name = cls._system()
        try:
            if sys_name == "Windows":
                subprocess.Popen(["shutdown", "/r", "/t", "5"])
            elif sys_name == "Darwin":
                subprocess.Popen(["osascript", "-e", 'tell application "System Events" to restart'])
            elif sys_name == "Linux":
                subprocess.Popen(["shutdown", "-r", "now"])
            return {"status": "success", "message": f"Restart initiated on {sys_name}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def sleep_system(cls) -> dict:
        """Put system to sleep cross-platform."""
        sys_name = cls._system()
        try:
            if sys_name == "Windows":
                subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
            elif sys_name == "Darwin":
                subprocess.Popen(["pmset", "sleepnow"])
            elif sys_name == "Linux":
                subprocess.Popen(["systemctl", "suspend"])
            return {"status": "success", "message": f"Sleep initiated on {sys_name}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def get_windows(cls) -> dict:
        """Return list of active visible window titles cross-platform."""
        sys_name = cls._system()
        windows = []
        try:
            if sys_name == "Windows":
                try:
                    import pygetwindow as gw
                    windows = [w.title for w in gw.getAllWindows() if w.title and w.visible]
                except Exception:
                    for p in psutil.process_iter(['name']):
                        if p.info['name'] and p.info['name'].endswith('.exe'):
                            windows.append(p.info['name'])
            elif sys_name == "Darwin":
                script = 'tell application "System Events" to get name of every process whose visible is true'
                res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                if res.returncode == 0:
                    windows = [w.strip() for w in res.stdout.strip().split(',') if w.strip()]
            elif sys_name == "Linux":
                res = subprocess.run(['wmctrl', '-l'], capture_output=True, text=True)
                if res.returncode == 0:
                    for line in res.stdout.strip().split('\n'):
                        parts = line.split(maxsplit=3)
                        if len(parts) >= 4:
                            windows.append(parts[3])
            return {"status": "success", "windows": windows}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @classmethod
    def focus_window(cls, app_name: str) -> dict:
        """Bring target application window to front cross-platform (Windows, macOS, Linux)."""
        sys_name = cls._system()
        target = app_name.lower().strip()
        if not target:
            return {"status": "error", "message": "No application name provided"}

        try:
            if sys_name == "Windows":
                # Try pygetwindow first
                try:
                    import pygetwindow as gw
                    matching = [w for w in gw.getAllWindows() if target in w.title.lower()]
                    if matching:
                        w = matching[0]
                        if w.isMinimized:
                            w.restore()
                        w.activate()
                        return {"status": "success", "action": "focus_window", "title": w.title}
                except Exception:
                    pass

                # Fallback to Win32 API
                import ctypes
                user32 = ctypes.windll.user32
                found = []

                def enum_handler(hwnd, extra):
                    if user32.IsWindowVisible(hwnd):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buff = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buff, length + 1)
                            title = buff.value
                            if target in title.lower():
                                user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                                user32.SetForegroundWindow(hwnd)
                                extra.append(title)
                    return True

                WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
                user32.EnumWindows(WNDENUMPROC(enum_handler), ctypes.py_object(found))

                if found:
                    return {"status": "success", "action": "focus_window", "title": found[0]}
                return {"status": "error", "message": f"Window matching '{app_name}' not found"}

            elif sys_name == "Darwin":
                script = f'tell application "{app_name}" to activate'
                res = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
                if res.returncode == 0:
                    return {"status": "success", "action": "focus_window", "app": app_name}
                subprocess.run(['open', '-a', app_name])
                return {"status": "success", "action": "focus_window", "app": app_name}

            elif sys_name == "Linux":
                subprocess.run(['wmctrl', '-a', app_name])
                return {"status": "success", "action": "focus_window", "app": app_name}

            return {"status": "error", "message": f"Unsupported OS: {sys_name}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}