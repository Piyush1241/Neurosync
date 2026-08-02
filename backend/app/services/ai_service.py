import json
import logging
import asyncio
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger("ai_service")
SYSTEM_PROMPT = """You are NeuroSync, an AI that controls Windows PCs remotely.

Convert the user's natural language request into a JSON command plan.

SUPPORTED ACTIONS (use ONLY these):

## App Control
- open_notepad
- open_chrome  
- open_calculator
- open_explorer
- open_app          payload: {"app_name": "spotify"}
- close_app         payload: {"app_name": "notepad"}
- kill_process      payload: {"process_name": "notepad.exe"}

## Mouse Control
- move_mouse        payload: {"x": 500, "y": 300}
- click_mouse       payload: {"button": "left", "x": 500, "y": 300}
- double_click      payload: {"x": 500, "y": 300}
- right_click       payload: {"x": 500, "y": 300}
- scroll            payload: {"direction": "up", "amount": 3}
- drag_mouse        payload: {"start_x": 100, "start_y": 100, "end_x": 500, "end_y": 500}

## Keyboard Control
- type_text         payload: {"text": "Hello World"}
- press_key         payload: {"key": "enter"}
- hotkey            payload: {"keys": ["ctrl", "c"]}
- press_enter
- press_escape
- press_tab
- press_backspace
- press_delete
- copy              (Ctrl+C)
- paste             (Ctrl+V)
- select_all        (Ctrl+A)
- undo              (Ctrl+Z)
- redo              (Ctrl+Y)
- save              (Ctrl+S)

## Window Management
- minimize_window
- maximize_window
- close_window
- focus_window       payload: {"app_name": "chrome"}
- minimize_window
- maximize_window
- close_window
- switch_window     payload: {"window_title": "Notepad"}
- get_windows       (returns list of open windows)

## System
- take_screenshot
- lock_screen
- sleep_system
- restart_system
- shutdown_system
- get_system_info
- get_running_processes

## Special Sequences
For typing text:
- DO NOT open Notepad unless the user explicitly mentions "notepad"!
- If the user asks to type or write without mentioning an application (e.g., "type Hello World", "write http://example.com"), ONLY send type_text so it types into whichever active window is currently open on their laptop:
  [{"action": "type_text", "payload": {"text": "Hello World"}}]
- If the user specifies an app to type in (e.g., "type hello in chrome", "type notes in word"):
  First focus the target window, then type_text:
  [{"action": "focus_window", "payload": {"app_name": "chrome"}}, {"action": "type_text", "payload": {"text": "hello"}}]
- ONLY include open_notepad if the user explicitly says "notepad" or "open notepad"!

IMPORTANT RULES:
- Return ONLY valid JSON, no explanation, no markdown fences
- For calculator: use click_mouse on button positions OR type the numbers with type_text then press "="
- For typing in apps: type into the currently active window unless an app name is specified (then focus_window first)
- Break complex tasks into logical sequential steps

Return format:
{
  "steps": [
    {"action": "focus_window", "payload": {"app_name": "chrome"}},
    {"action": "type_text", "payload": {"text": "hello"}},
    {"action": "press_key", "payload": {"key": "enter"}}
  ]
}"""

class AIService:
    def __init__(self, manager, db):
        self.manager = manager
        self.db = db
        api_key = getattr(settings, "OPEN_API_KEY", "") or getattr(settings, "OPENROUTER_API_KEY", "") or getattr(settings, "OPENAI_API_KEY", "") or "sk-placeholder"
        self.client = AsyncOpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")

    def _rule_based_fallback(self, prompt: str) -> dict:
        p = prompt.lower().strip()
        steps = []

        # 1. Explicit Notepad request
        if "notepad" in p:
            steps.append({"action": "open_notepad"})
            text_to_type = None
            if "type " in p:
                text_to_type = prompt.split("type ", 1)[1].strip()
            elif "write " in p:
                text_to_type = prompt.split("write ", 1)[1].strip()
            if text_to_type and "notepad" not in text_to_type:
                steps.append({"action": "type_text", "payload": {"text": text_to_type}})
            return {"steps": steps}

        # 2. Chrome / Browser search or navigation
        if "chrome" in p or "browser" in p:
            if "search" in p or "find" in p or "google" in p:
                query = prompt
                for kw in ["open chrome and ", "open chrome ", "search ", "google ", "in chrome ", "on chrome "]:
                    query = query.replace(kw, "")
                query = query.strip()
                if query:
                    steps.append({"action": "open_chrome", "payload": {"url": f"https://www.google.com/search?q={query}"}})
                else:
                    steps.append({"action": "open_chrome", "payload": {"url": "https://www.google.com"}})
            else:
                steps.append({"action": "open_chrome"})
            return {"steps": steps}

        # 3. Generic typing / writing without opening Notepad
        if p.startswith("type ") or p.startswith("write ") or "type " in p or "write " in p:
            raw_text = prompt
            if "type " in p:
                raw_text = prompt.split("type ", 1)[1].strip()
            elif "write " in p:
                raw_text = prompt.split("write ", 1)[1].strip()

            # Check if user specified a target app ("in chrome", "in word", "in discord")
            if " in " in raw_text.lower():
                parts = raw_text.lower().rsplit(" in ", 1)
                text_content = raw_text[:len(parts[0])].strip()
                target_app = parts[1].strip()
                steps.append({"action": "focus_window", "payload": {"app_name": target_app}})
                steps.append({"action": "type_text", "payload": {"text": text_content}})
            else:
                steps.append({"action": "type_text", "payload": {"text": raw_text}})
            return {"steps": steps}

        # 4. App launchers & utilities
        if "calculator" in p or "calc" in p:
            steps.append({"action": "open_calculator"})
        elif "screenshot" in p:
            steps.append({"action": "take_screenshot"})
        elif "lock" in p:
            steps.append({"action": "lock_screen"})
        elif "explorer" in p or "files" in p or "my computer" in p:
            steps.append({"action": "open_explorer"})
        elif "running" in p or "process" in p or "task" in p:
            steps.append({"action": "get_running_processes"})
        elif "sys" in p or "specs" in p or "info" in p:
            steps.append({"action": "get_system_info"})
        elif "shutdown" in p:
            steps.append({"action": "shutdown_system"})
        elif "restart" in p:
            steps.append({"action": "restart_system"})

        if steps:
            return {"steps": steps}
        return {}

    async def generate_commands(self, prompt: str) -> dict:
        fallback = self._rule_based_fallback(prompt)
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )
            raw = response.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            parsed = json.loads(raw.strip())
            if parsed.get("steps"):
                return parsed
            return fallback if fallback else parsed
        except Exception as e:
            logger.warning(f"AI API call failed, using fallback: {e}")
            if fallback:
                return fallback
            return {"steps": [], "error": str(e)}

    async def execute_ai_task(self, device_id: str, prompt: str, user_id: str) -> dict:
        plan = await self.generate_commands(prompt)

        if "error" in plan:
            return {"status": "error", "message": plan["error"]}

        steps = plan.get("steps", [])
        if not steps:
            return {"status": "error", "message": "No steps generated"}

        results = []
        for i, step in enumerate(steps):
            action = step.get("action")
            payload = step.get("payload", {})
            delay = step.get("delay", 0.8)

            sent = await self.manager.send_to_device(device_id, {
                "type": "command",
                "action": action,
                "payload": payload
            })

            results.append({
                "step": i + 1,
                "action": action,
                "payload": payload,
                "sent": sent
            })

            await asyncio.sleep(delay)

        self._save_history(device_id, user_id, prompt, plan, results)

        return {
            "status": "executed",
            "prompt": prompt,
            "steps_total": len(steps),
            "results": results
        }

    def _save_history(self, device_id, user_id, prompt, plan, results):
        if self.db is None:
            return
        try:
            from app.models.ai_history import AIHistory
            record = AIHistory(
                device_id=device_id,
                user_id=user_id,
                prompt=prompt,
                generated_plan=plan,
                result={"steps": results}
            )
            self.db.add(record)
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to save AI history: {e}")