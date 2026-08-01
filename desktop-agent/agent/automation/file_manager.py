import os
import shutil
import time
import base64
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class FileManager:
    @staticmethod
    def list_files(path: str = "~") -> List[Dict[str, Any]]:
        expanded = os.path.expanduser(path) if path == "~" or path.startswith("~/") else os.path.abspath(path)
        if not os.path.exists(expanded):
            expanded = os.path.expanduser("~")
        
        items = []
        try:
            with os.scandir(expanded) as entries:
                for entry in entries:
                    try:
                        stat = entry.stat()
                        is_dir = entry.is_dir()
                        ext = os.path.splitext(entry.name)[1].lstrip('.').lower() if not is_dir else ''
                        size_str = "—"
                        if not is_dir:
                            bytes_size = stat.st_size
                            if bytes_size < 1024:
                                size_str = f"{bytes_size} B"
                            elif bytes_size < 1024 * 1024:
                                size_str = f"{bytes_size / 1024:.1f} KB"
                            else:
                                size_str = f"{bytes_size / (1024 * 1024):.1f} MB"
                        
                        modified_str = time.strftime('%Y-%m-%d %H:%M', time.localtime(stat.st_mtime))
                        items.append({
                            "name": entry.name,
                            "type": "folder" if is_dir else "file",
                            "size": size_str,
                            "modified": modified_str,
                            "extension": ext,
                            "path": entry.path
                        })
                    except Exception:
                        continue
        except Exception as e:
            logger.error(f"Error scanning directory {expanded}: {e}")
            return []
            
        return sorted(items, key=lambda x: (x["type"] != "folder", x["name"].lower()))

    @staticmethod
    def create_folder(path: str) -> Dict[str, Any]:
        try:
            expanded = os.path.expanduser(path)
            os.makedirs(expanded, exist_ok=True)
            return {"status": "success", "message": f"Created folder {path}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def delete_item(path: str) -> Dict[str, Any]:
        try:
            expanded = os.path.expanduser(path)
            if os.path.isdir(expanded):
                shutil.rmtree(expanded)
            elif os.path.isfile(expanded):
                os.remove(expanded)
            return {"status": "success", "message": f"Deleted {path}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def rename_item(old_path: str, new_path: str) -> Dict[str, Any]:
        try:
            old_exp = os.path.expanduser(old_path)
            new_exp = os.path.expanduser(new_path)
            os.rename(old_exp, new_exp)
            return {"status": "success", "message": f"Renamed to {new_path}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def download_file(path: str) -> Dict[str, Any]:
        """Read desktop file and return base64 content to mobile app."""
        try:
            expanded = os.path.expanduser(path)
            if not os.path.isfile(expanded):
                return {"status": "error", "message": "File not found"}
            with open(expanded, "rb") as f:
                data = f.read()
            b64_data = base64.b64encode(data).decode('utf-8')
            filename = os.path.basename(expanded)
            return {"status": "success", "filename": filename, "content_b64": b64_data}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @staticmethod
    def upload_file(destination_path: str, content_b64: str) -> Dict[str, Any]:
        """Write base64 content sent from mobile app to desktop path."""
        try:
            expanded = os.path.expanduser(destination_path)
            os.makedirs(os.path.dirname(expanded), exist_ok=True)
            data = base64.b64decode(content_b64)
            with open(expanded, "wb") as f:
                f.write(data)
            return {"status": "success", "message": f"Uploaded file to {destination_path}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
