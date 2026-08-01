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
For multi-step tasks like "open calculator and compute 3 + 5", think step by step:
1. open_calculator
2. Wait logic is handled by the backend (0.8s between steps)
3. click_mouse on the right calculator buttons OR type_text the expression
4. press_key "enter" or "="

IMPORTANT RULES:
- Return ONLY valid JSON, no explanation, no markdown fences
- For calculator: use click_mouse on button positions OR type the numbers with type_text then press "="
- For typing in apps: always ensure the app/field is focused first
- Break complex tasks into logical sequential steps
- If unsure of exact coordinates, use type_text + press_key approach (safer than coordinates)

Return format:
{
  "steps": [
    {"action": "open_calculator"},
    {"action": "type_text", "payload": {"text": "3+5"}},
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
        if "notepad" in p:
            steps.append({"action": "open_notepad"})
            if "type" in p or "write" in p:
                text_to_type = "Hello"
                if "type " in p:
                    text_to_type = prompt.split("type ", 1)[1].strip()
                elif "write " in p:
                    text_to_type = prompt.split("write ", 1)[1].strip()
                steps.append({"action": "type_text", "payload": {"text": text_to_type}})
        elif "calculator" in p or "calc" in p:
            steps.append({"action": "open_calculator"})
        elif "screenshot" in p:
            steps.append({"action": "take_screenshot"})
        elif "lock" in p:
            steps.append({"action": "lock_screen"})
        elif "chrome" in p or "browser" in p:
            steps.append({"action": "open_chrome"})
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