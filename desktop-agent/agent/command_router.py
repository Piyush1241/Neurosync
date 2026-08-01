import logging
import time
import traceback
from typing import Any, Optional
import time

from automation.app_launcher import AppLauncher
from automation.mouse_controller import MouseController
from automation.keyboard_controller import KeyboardController
from automation.file_transfer_engine import FileTransferEngine

logger = logging.getLogger(__name__)
_REGISTRY: dict[str, dict] = {

    # ── Remote File Transfer & Management ──
    "file_list_dir":     {"fn": lambda c: FileTransferEngine.list_dir(c.get("dir_path", "~"))},
    "file_read_text":    {"fn": lambda c: FileTransferEngine.read_file_text(c["file_path"]), "required": ["file_path"]},
    "file_save_text":    {"fn": lambda c: FileTransferEngine.save_file_text(c["file_path"], c["content"]), "required": ["file_path", "content"]},
    "file_get_preview":  {"fn": lambda c: FileTransferEngine.get_file_preview(c["file_path"]), "required": ["file_path"]},
    "file_read_chunk":   {"fn": lambda c: FileTransferEngine.read_file_chunk(c["file_path"], c["chunk_index"]), "required": ["file_path", "chunk_index"]},
    "file_write_chunk":  {"fn": lambda c: FileTransferEngine.write_file_chunk(c["file_path"], c["chunk_index"], c["total_chunks"], c["chunk_b64"]), "required": ["file_path", "chunk_index", "total_chunks", "chunk_b64"]},

    # ── App launcher ──
    "wait": {"fn": lambda c: time.sleep(c.get("seconds", 1)) or {"status": "success", "waited": c.get("seconds", 1)}},
    "open_chrome":       {"fn": lambda c: AppLauncher.open_chrome(c.get("url", ""))},
    "open_firefox":      {"fn": lambda c: AppLauncher.open_firefox(c.get("url", ""))},
    "open_edge":         {"fn": lambda c: AppLauncher.open_edge(c.get("url", ""))},
    "open_vscode":       {"fn": lambda c: AppLauncher.open_vscode(c.get("path", ""))},
    "open_notepad":      {"fn": lambda c: AppLauncher.open_notepad(c.get("file_path", ""))},
    "open_sublime":      {"fn": lambda c: AppLauncher.open_sublime(c.get("file_path", ""))},
    "open_pycharm":      {"fn": lambda c: AppLauncher.open_pycharm(c.get("project_path", ""))},
    "open_terminal":     {"fn": lambda c: AppLauncher.open_terminal()},
    "open_excel":        {"fn": lambda c: AppLauncher.open_excel(c.get("file_path", ""))},
    "open_word":         {"fn": lambda c: AppLauncher.open_word(c.get("file_path", ""))},
    "open_calculator":   {"fn": lambda c: AppLauncher.open_calculator()},
    "open_vlc":          {"fn": lambda c: AppLauncher.open_vlc(c.get("file_path", ""))},
    "open_spotify":      {"fn": lambda c: AppLauncher.open_spotify()},
    "open_file_manager": {"fn": lambda c: AppLauncher.open_file_manager(c.get("path", ""))},
    "open_app":          {"fn": lambda c: AppLauncher.open_app(c["app_name"], c.get("args")), "required": ["app_name"]},
    "kill_app":          {"fn": lambda c: AppLauncher.kill_app(c["label"]), "required": ["label"]},
    "list_running_apps": {"fn": lambda c: AppLauncher.list_running()},
    "is_app_running":    {"fn": lambda c: AppLauncher.is_running(c["label"]), "required": ["label"]},

    # ── Mouse ──
    "mouse_move":             {"fn": lambda c: MouseController.move(c["x"], c["y"], c.get("duration", 0.0)),             "required": ["x", "y"]},
    "mouse_move_relative":    {"fn": lambda c: MouseController.move_relative(c["dx"], c["dy"], c.get("duration", 0.0)), "required": ["dx", "dy"]},
    "mouse_move_smooth":      {"fn": lambda c: MouseController.move_smooth(c["x"], c["y"], c.get("steps", 20)),         "required": ["x", "y"]},
    "mouse_click":            {"fn": lambda c: MouseController.click(c.get("x"), c.get("y"), c.get("button", "left"))},
    "mouse_right_click":      {"fn": lambda c: MouseController.right_click(c.get("x"), c.get("y"))},
    "mouse_middle_click":     {"fn": lambda c: MouseController.middle_click(c.get("x"), c.get("y"))},
    "mouse_double_click":     {"fn": lambda c: MouseController.double_click(c.get("x"), c.get("y"))},
    "mouse_triple_click":     {"fn": lambda c: MouseController.triple_click(c.get("x"), c.get("y"))},
    "mouse_drag":             {"fn": lambda c: MouseController.drag(c["x1"], c["y1"], c["x2"], c["y2"], c.get("duration", 0.4), c.get("button", "left")), "required": ["x1", "y1", "x2", "y2"]},
    "mouse_drag_relative":    {"fn": lambda c: MouseController.drag_relative(c["dx"], c["dy"], c.get("duration", 0.4)), "required": ["dx", "dy"]},
    "mouse_scroll":           {"fn": lambda c: MouseController.scroll(c["amount"], c.get("x"), c.get("y")),             "required": ["amount"]},
    "mouse_scroll_horizontal":{"fn": lambda c: MouseController.scroll_horizontal(c["amount"]),                          "required": ["amount"]},
    "mouse_down":             {"fn": lambda c: MouseController.mouse_down(c.get("button", "left"), c.get("x"), c.get("y"))},
    "mouse_up":               {"fn": lambda c: MouseController.mouse_up(c.get("button", "left"))},
    "get_mouse_position":     {"fn": lambda c: MouseController.get_position()},
    "get_screen_size":        {"fn": lambda c: MouseController.get_screen_size()},
    "mouse_to_center":        {"fn": lambda c: MouseController.move_to_center()},
    "mouse_to_corner":        {"fn": lambda c: MouseController.move_to_corner(c.get("corner", "top-left"))},
    "get_pixel_color":        {"fn": lambda c: MouseController.pixel_color(c["x"], c["y"]),                             "required": ["x", "y"]},
    "get_mouse_history":      {"fn": lambda c: MouseController.get_history()},

    # ── Keyboard ──
    "type_text":        {"fn": lambda c: KeyboardController.type_text(c["text"], c.get("interval", 0.03)),    "required": ["text"]},
    "type_text_fast":   {"fn": lambda c: KeyboardController.type_text_fast(c["text"]),                        "required": ["text"]},
    "press_key":        {"fn": lambda c: KeyboardController.press_key(c["key"]),                              "required": ["key"]},
    "key_down":         {"fn": lambda c: KeyboardController.key_down(c["key"]),                               "required": ["key"]},
    "key_up":           {"fn": lambda c: KeyboardController.key_up(c["key"]),                                 "required": ["key"]},
    "press_key_times":  {"fn": lambda c: KeyboardController.press_key_times(c["key"], c["count"], c.get("interval", 0.1)), "required": ["key", "count"]},
    "hotkey":           {"fn": lambda c: KeyboardController.hotkey(*c["keys"]),                               "required": ["keys"]},
    "copy":             {"fn": lambda c: KeyboardController.copy()},
    "paste":            {"fn": lambda c: KeyboardController.paste()},
    "cut":              {"fn": lambda c: KeyboardController.cut()},
    "select_all":       {"fn": lambda c: KeyboardController.select_all()},
    "undo":             {"fn": lambda c: KeyboardController.undo()},
    "redo":             {"fn": lambda c: KeyboardController.redo()},
    "save":             {"fn": lambda c: KeyboardController.save()},
    "find":             {"fn": lambda c: KeyboardController.find()},
    "close_window":     {"fn": lambda c: KeyboardController.close_window()},
    "switch_window":    {"fn": lambda c: KeyboardController.switch_window()},
    "minimize_window":  {"fn": lambda c: KeyboardController.minimize_window()},
    "maximize_window":  {"fn": lambda c: KeyboardController.maximize_window()},
    "show_desktop":     {"fn": lambda c: KeyboardController.show_desktop()},
    "lock_screen":      {"fn": lambda c: KeyboardController.lock_screen()},
    "screenshot_key":   {"fn": lambda c: KeyboardController.take_screenshot_key()},
    "read_clipboard":   {"fn": lambda c: KeyboardController.read_clipboard()},
    "write_clipboard":  {"fn": lambda c: KeyboardController.write_clipboard(c["text"]),                       "required": ["text"]},
    "clear_clipboard":  {"fn": lambda c: KeyboardController.clear_clipboard()},
    "run_sequence":     {"fn": lambda c: KeyboardController.run_sequence(c["steps"]),                         "required": ["steps"]},
}


# ── Validator ─────────────────────────────────────────────────────────────────

def _validate(command: dict, entry: dict) -> Optional[str]:
    """Return an error message if required fields are missing, else None."""
    required = entry.get("required", [])
    missing = [f for f in required if f not in command]
    if missing:
        return f"Missing required field(s): {missing}"
    return None


# ── Main dispatcher ───────────────────────────────────────────────────────────

def execute(command: dict) -> dict:
    """
    Route a command dict to the correct handler.

    Always returns:
    {
        "status":     "success" | "error",
        "action":     str,
        "request_id": str | None,
        "duration_ms": float,
        ...result fields...
    }
    """
    start = time.perf_counter()
    action = command.get("action", "")
    request_id = command.get("request_id")

    def _wrap(result: dict) -> dict:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            **result,
            "action": action,
            "request_id": request_id,
            "duration_ms": elapsed,
        }

    if not action:
        logger.warning("Command received with no 'action' field")
        return _wrap({"status": "error", "message": "No 'action' specified in command"})

    entry = _REGISTRY.get(action)
    if entry is None:
        logger.warning(f"Unknown action: '{action}'")
        return _wrap({
            "status": "error",
            "message": f"Unknown action: '{action}'",
            "available_actions": sorted(_REGISTRY.keys()),
        })

    err = _validate(command, entry)
    if err:
        logger.warning(f"Validation failed for '{action}': {err}")
        return _wrap({"status": "error", "message": err})

    try:
        logger.debug(f"Executing action='{action}' request_id={request_id}")
        result = entry["fn"](command)
        if result.get("status") == "error":
            logger.warning(f"Action '{action}' returned error: {result.get('message')}")
        else:
            logger.info(f"Action '{action}' succeeded in {round((time.perf_counter()-start)*1000,2)}ms")
        return _wrap(result)

    except Exception as e:
        logger.error(f"Unhandled exception in action '{action}': {e}\n{traceback.format_exc()}")
        return _wrap({
            "status": "error",
            "message": f"Internal error: {str(e)}",
            "traceback": traceback.format_exc(),
        })


# ── Utility ───────────────────────────────────────────────────────────────────

def list_actions() -> list[str]:
    """Return all registered action names sorted alphabetically."""
    return sorted(_REGISTRY.keys())


def action_info(action: str) -> dict:
    """Return required fields and description for a given action."""
    entry = _REGISTRY.get(action)
    if not entry:
        return {"status": "error", "message": f"Unknown action: '{action}'"}
    return {
        "status": "success",
        "action": action,
        "required_fields": entry.get("required", []),
    }
    
