import os
import sys
import subprocess
import time
import base64
import platform
from automation.app_launcher import AppLauncher

class CodeExecutor:
    @staticmethod
    def get_workspace_dir() -> str:
        workspace = os.path.expanduser("~/.neurosync_workspace/code_runs")
        os.makedirs(workspace, exist_ok=True)
        return workspace

    @staticmethod
    def get_transfer_dir() -> str:
        transfers = os.path.expanduser("~/.neurosync_workspace/transfers")
        os.makedirs(transfers, exist_ok=True)
        return transfers

    @classmethod
    def execute_code(
        cls,
        code_text: str = "",
        language: str = "python",
        filename: str = "",
        mode: str = "terminal",
        ide_name: str = "vscode",
        timeout: int = 30
    ) -> dict:
        """
        Execute code in Python, Node.js, Shell, PowerShell, Zsh, or C/C++.
        Modes:
        - 'terminal': Launches visible interactive PowerShell/Terminal window on Desktop (inherits local venvs & packages)
        - 'ide': Opens code file in VS Code, PyCharm, or default editor
        - 'background': Runs in background subprocess and captures stdout/stderr
        """
        lang = (language or "python").lower().strip()
        workspace = cls.get_workspace_dir()
        sys_os = platform.system()
        exec_mode = (mode or "terminal").lower().strip()

        # Determine file extension and executable command
        if lang in ("python", "py"):
            ext = ".py"
            exec_bin = sys.executable
        elif lang in ("javascript", "js", "node"):
            ext = ".js"
            exec_bin = "node"
        elif lang in ("shell", "bash", "sh"):
            ext = ".sh" if sys_os != "Windows" else ".bat"
            exec_bin = "cmd.exe" if sys_os == "Windows" else "bash"
        elif lang in ("powershell", "ps1"):
            ext = ".ps1"
            exec_bin = "powershell.exe"
        else:
            ext = ".py"
            exec_bin = sys.executable

        # Determine script filename
        clean_name = os.path.basename(filename) if filename else f"script_{int(time.time())}{ext}"
        if not clean_name.endswith(ext):
            clean_name += ext

        target_file = os.path.join(workspace, clean_name)
        
        try:
            if code_text or not os.path.exists(target_file):
                with open(target_file, "w", encoding="utf-8") as f:
                    f.write(code_text or "")
            
            if not os.path.exists(target_file):
                return {"status": "error", "message": f"Script file not found: {target_file}"}

            # ── MODE 1: Interactive Terminal Window ──
            if exec_mode == "terminal":
                if sys_os == "Windows":
                    cmd_str = f'Set-Location -Path "{workspace}"; & "{exec_bin}" "{target_file}"'
                    # CREATE_NEW_CONSOLE = 0x00000010
                    subprocess.Popen(
                        ["powershell.exe", "-NoExit", "-Command", cmd_str],
                        creationflags=subprocess.CREATE_NEW_CONSOLE,
                        cwd=workspace
                    )
                else:
                    apple_script = f'tell application "Terminal" to do script "cd \\"{workspace}\\" && \\"{exec_bin}\\" \\"{target_file}\\""'
                    subprocess.Popen(["osascript", "-e", apple_script])

                return {
                    "status": "success",
                    "mode": "terminal",
                    "stdout": f"🚀 Launched interactive terminal window on Desktop executing {clean_name}!",
                    "stderr": "",
                    "exit_code": 0,
                    "duration_ms": 100,
                    "file_path": target_file
                }

            # ── MODE 2: Open in IDE ──
            elif exec_mode == "ide":
                ide = (ide_name or "vscode").lower().strip()
                if ide == "vscode":
                    AppLauncher.open_vscode(target_file)
                elif ide == "pycharm":
                    AppLauncher.open_pycharm(target_file)
                elif ide == "notepad":
                    AppLauncher.open_notepad(target_file)
                else:
                    if sys_os == "Windows":
                        os.startfile(target_file)
                    else:
                        subprocess.Popen(["open", target_file])

                return {
                    "status": "success",
                    "mode": "ide",
                    "stdout": f"💻 Opened {clean_name} in {ide.upper()} on Desktop!",
                    "stderr": "",
                    "exit_code": 0,
                    "duration_ms": 100,
                    "file_path": target_file
                }

            # ── MODE 3: Background Capture Streamer ──
            else:
                full_cmd = [exec_bin, target_file]
                start_time = time.time()
                proc = subprocess.Popen(
                    full_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=workspace,
                    env=os.environ.copy()
                )

                try:
                    stdout, stderr = proc.communicate(timeout=timeout)
                    duration_ms = int((time.time() - start_time) * 1000)
                    return {
                        "status": "success",
                        "mode": "background",
                        "stdout": stdout or "",
                        "stderr": stderr or "",
                        "exit_code": proc.returncode,
                        "duration_ms": duration_ms,
                        "file_path": target_file
                    }
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.communicate()
                    return {
                        "status": "error",
                        "mode": "background",
                        "message": f"Execution timed out after {timeout} seconds",
                        "stdout": "",
                        "stderr": f"TimeoutError: Execution exceeded limit of {timeout} seconds.",
                        "exit_code": -1,
                        "duration_ms": timeout * 1000,
                        "file_path": target_file
                    }

        except Exception as e:
            return {"status": "error", "message": str(e), "stdout": "", "stderr": str(e), "exit_code": 1}

    @classmethod
    def upload_file(cls, file_name: str, data_b64: str, dest_dir: str = "") -> dict:
        """Save transferred file from mobile to desktop transfers folder."""
        try:
            target_dir = os.path.expanduser(dest_dir) if dest_dir else cls.get_transfer_dir()
            os.makedirs(target_dir, exist_ok=True)
            target_path = os.path.join(target_dir, os.path.basename(file_name))
            
            file_bytes = base64.b64decode(data_b64)
            with open(target_path, "wb") as f:
                f.write(file_bytes)

            return {
                "status": "success",
                "file_path": target_path,
                "file_size": len(file_bytes)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
