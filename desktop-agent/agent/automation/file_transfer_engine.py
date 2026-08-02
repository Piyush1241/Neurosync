import os
import sys
import base64
import math
import mimetypes
import shutil

CHUNK_SIZE = 256 * 1024  # 256 KB chunks

class FileTransferEngine:
    @staticmethod
    def list_dir(dir_path: str = "~") -> dict:
        try:
            if not dir_path or dir_path in ("~", "ROOT", "Device Root", "/"):
                target = os.path.expanduser("~")
            elif dir_path.startswith("~"):
                target = os.path.expanduser(dir_path)
            else:
                home_candidate = os.path.expanduser(f"~/{dir_path}")
                if os.path.exists(home_candidate):
                    target = home_candidate
                else:
                    target = os.path.abspath(dir_path)
            target = os.path.abspath(target)
            
            if not os.path.exists(target):
                return {"status": "error", "message": f"Path not found: {dir_path}"}
            if not os.path.isdir(target):
                return {"status": "error", "message": f"Path is not a directory: {dir_path}"}

            entries = []
            try:
                with os.scandir(target) as it:
                    for entry in it:
                        try:
                            # Skip inaccessible system junction points or broken symlinks on Windows
                            is_dir = entry.is_dir(follow_symlinks=False)
                            size_bytes = 0
                            mod_time = 0
                            try:
                                stat = entry.stat(follow_symlinks=False)
                                size_bytes = stat.st_size
                                mod_time = int(stat.st_mtime)
                            except (PermissionError, OSError):
                                pass
                            
                            if is_dir:
                                size_str = "—"
                            elif size_bytes < 1024:
                                size_str = f"{size_bytes} B"
                            elif size_bytes < 1024 * 1024:
                                size_str = f"{size_bytes / 1024:.1f} KB"
                            elif size_bytes < 1024 * 1024 * 1024:
                                size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                            else:
                                size_str = f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

                            entries.append({
                                "name": entry.name,
                                "path": entry.path,
                                "type": "folder" if is_dir else "file",
                                "size": size_str,
                                "size_bytes": size_bytes,
                                "modified": mod_time,
                                "extension": os.path.splitext(entry.name)[1].lower() if not is_dir else ""
                            })
                        except (PermissionError, OSError):
                            continue
            except PermissionError:
                return {"status": "error", "message": f"Access Denied: You do not have permission to access system directory '{dir_path}'."}
            except OSError as os_err:
                return {"status": "error", "message": f"Directory Access Error: {os_err}"}

            entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
            
            # Parent path logic
            parent_path = os.path.dirname(target) if target != os.path.dirname(target) else target

            return {
                "status": "success",
                "current_path": target,
                "display_path": "~" if target == os.path.expanduser("~") else target,
                "parent_path": parent_path,
                "entries": entries,
                "total_count": len(entries)
            }
        except PermissionError:
            return {"status": "error", "message": f"Access Denied: You do not have permission to access '{dir_path}'."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            return {"status": "error", "message": str(e)}

    @staticmethod
    def read_file_text(file_path: str, max_bytes: int = 500000) -> dict:
        try:
            target = os.path.expanduser(file_path) if file_path.startswith("~") else file_path
            if not os.path.exists(target):
                return {"status": "error", "message": "File does not exist"}

            size = os.path.getsize(target)
            if size > max_bytes:
                return {"status": "error", "message": f"File is too large ({size} bytes) for inline text editing (max {max_bytes} bytes)."}

            with open(target, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            return {
                "status": "success",
                "file_path": target,
                "file_name": os.path.basename(target),
                "size_bytes": size,
                "content": content
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def save_file_text(file_path: str, content: str) -> dict:
        try:
            target = os.path.expanduser(file_path) if file_path.startswith("~") else file_path
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "status": "success",
                "file_path": target,
                "size_bytes": os.path.getsize(target)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def get_file_preview(file_path: str) -> dict:
        try:
            target = os.path.expanduser(file_path) if file_path.startswith("~") else file_path
            if not os.path.exists(target):
                return {"status": "error", "message": "File not found"}

            mime_type, _ = mimetypes.guess_type(target)
            mime_type = mime_type or "application/octet-stream"

            if mime_type.startswith("image/"):
                with open(target, "rb") as f:
                    data = base64.b64encode(f.read()).decode("utf-8")
                return {
                    "status": "success",
                    "preview_type": "image",
                    "mime_type": mime_type,
                    "base64": data
                }
            elif mime_type.startswith("text/") or target.endswith((".py", ".js", ".ts", ".json", ".html", ".css", ".md", ".txt", ".yml", ".yaml", ".sh")):
                res = FileTransferEngine.read_file_text(target, max_bytes=100000)
                if res["status"] == "success":
                    return {
                        "status": "success",
                        "preview_type": "text",
                        "mime_type": mime_type,
                        "text": res["content"]
                    }

            return {"status": "error", "message": "Preview not supported for this file type"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def read_file_chunk(file_path: str, chunk_index: int) -> dict:
        try:
            target = os.path.expanduser(file_path) if file_path.startswith("~") else file_path
            if not os.path.exists(target):
                return {"status": "error", "message": "File not found"}

            total_size = os.path.getsize(target)
            total_chunks = math.ceil(total_size / CHUNK_SIZE) or 1

            if chunk_index < 0 or chunk_index >= total_chunks:
                return {"status": "error", "message": f"Chunk index {chunk_index} out of bounds (total {total_chunks})"}

            offset = chunk_index * CHUNK_SIZE
            with open(target, "rb") as f:
                f.seek(offset)
                chunk_bytes = f.read(CHUNK_SIZE)

            chunk_b64 = base64.b64encode(chunk_bytes).decode("utf-8")

            return {
                "status": "success",
                "file_name": os.path.basename(target),
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "total_size": total_size,
                "chunk_size": len(chunk_bytes),
                "data_b64": chunk_b64,
                "is_last": (chunk_index == total_chunks - 1)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def write_file_chunk(file_path: str, chunk_index: int, total_chunks: int, chunk_b64: str) -> dict:
        try:
            target = os.path.expanduser(file_path) if file_path.startswith("~") else file_path
            os.makedirs(os.path.dirname(target), exist_ok=True)

            chunk_bytes = base64.b64decode(chunk_b64)
            mode = "wb" if chunk_index == 0 else "ab"

            with open(target, mode) as f:
                f.write(chunk_bytes)

            is_complete = (chunk_index == total_chunks - 1)

            return {
                "status": "success",
                "file_path": target,
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "is_complete": is_complete
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
