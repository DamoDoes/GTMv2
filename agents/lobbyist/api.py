"""FastAPI REST endpoint for the Lobbyist agent.

Run with:
    uvicorn agents.lobbyist.api:app --reload --port 8000

Endpoints:
    POST /query         — Run a natural-language query through the agent
    POST /tool/{name}   — Call a specific tool directly
    GET  /tools         — List available tools
    GET  /health        — Health check
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agents.lobbyist.agent import LobbyistAgent
from agents.lobbyist.tools import TOOLS

app = FastAPI(
    title="GTMv2 Lobbyist Agent",
    description="Congressional lobbyist research assistant powered by GTMv2 data",
    version="0.1.0",
)

_agent: LobbyistAgent | None = None


def _get_agent() -> LobbyistAgent:
    global _agent
    if _agent is None:
        _agent = LobbyistAgent()
    return _agent


# ── Request / response models ────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    verbose: bool = False


class QueryResponse(BaseModel):
    answer: str


class ToolRequest(BaseModel):
    parameters: dict[str, str]


class ToolResponse(BaseModel):
    tool: str
    result: object


class ToolInfo(BaseModel):
    name: str
    description: str
    parameters: dict[str, str]


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "tools": len(TOOLS)}


@app.get("/tools", response_model=list[ToolInfo])
def list_tools():
    """List all available tools and their parameter schemas."""
    return [
        ToolInfo(name=name, description=spec["description"], parameters=spec["parameters"])
        for name, spec in TOOLS.items()
    ]


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    """Run a natural-language query through the lobbyist agent."""
    agent = _get_agent()
    answer = agent.run(req.query, verbose=req.verbose)
    return QueryResponse(answer=answer)


@app.post("/tool/{tool_name}", response_model=ToolResponse)
def call_tool(tool_name: str, req: ToolRequest):
    """Call a specific tool directly by name, bypassing the LLM."""
    spec = TOOLS.get(tool_name)
    if not spec:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {tool_name}")
    try:
        result = spec["function"](**req.parameters)
        return ToolResponse(tool=tool_name, result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
