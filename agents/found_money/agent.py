"""Found Money Agent — identifies unclaimed benefits and underutilized resources."""

from __future__ import annotations

import json
from typing import Any

import anthropic

from agents.found_money.prompts import SYSTEM_PROMPT
from agents.found_money.tools import TOOLS


def _build_tool_schemas() -> list[dict]:
    schemas = []
    for name, spec in TOOLS.items():
        properties = {}
        required = []
        for param_name, param_desc in spec["parameters"].items():
            properties[param_name] = {"type": "string", "description": param_desc}
            required.append(param_name)
        schemas.append({
            "name": name,
            "description": spec["description"],
            "input_schema": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        })
    return schemas


def _execute_tool(name: str, inputs: dict[str, Any]) -> str:
    spec = TOOLS.get(name)
    if not spec:
        return json.dumps({"error": f"Unknown tool: {name}"})
    try:
        result = spec["function"](**inputs)
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


class FoundMoneyAgent:
    """Agentic loop for found-money research queries."""

    def __init__(self, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic()
        self.model = model
        self.tool_schemas = _build_tool_schemas()

    def run(self, query: str, *, verbose: bool = False) -> str:
        messages: list[dict] = [{"role": "user", "content": query}]

        for _ in range(10):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=self.tool_schemas,
                messages=messages,
            )

            if verbose:
                print(f"[found-money] stop_reason={response.stop_reason}")

            text_parts = []
            tool_uses = []
            for block in response.content:
                if block.type == "text":
                    text_parts.append(block.text)
                elif block.type == "tool_use":
                    tool_uses.append(block)

            if response.stop_reason == "end_turn" or not tool_uses:
                return "\n".join(text_parts)

            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for tool_use in tool_uses:
                if verbose:
                    print(f"[found-money] calling {tool_use.name}({tool_use.input})")
                result_str = _execute_tool(tool_use.name, tool_use.input)
                if verbose:
                    print(f"[found-money] -> {result_str[:200]}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": result_str,
                })

            messages.append({"role": "user", "content": tool_results})

        return "\n".join(text_parts) if text_parts else "(Agent reached maximum iterations)"
