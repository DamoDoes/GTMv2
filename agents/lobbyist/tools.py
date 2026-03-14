"""Data access tools for the Lobbyist agent.

Each tool loads from the GTMv2 public/data JSON files and returns
structured results the agent can reason over.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"


def _load_json(filename: str) -> Any:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


# ── State-level data ─────────────────────────────────────────────────────

def get_state(abbr: str) -> dict | None:
    """Return state metrics for a two-letter abbreviation (e.g. 'CA')."""
    states = _load_json("states.json")
    return states.get(abbr.upper())


def list_states() -> list[str]:
    """Return all available state abbreviations."""
    states = _load_json("states.json")
    return [k for k in states if not k.startswith("_")]


def get_state_fec(abbr: str) -> dict | None:
    """Return FEC contribution summary for a state."""
    fec = _load_json("fec-contributions.json")
    return fec.get(abbr.upper())


# ── District-level data ──────────────────────────────────────────────────

def get_district(district_code: str) -> dict | None:
    """Look up a congressional district by code (e.g. 'CA-34').

    Handles both the nested-object format and the flat-array format.
    """
    raw = _load_json("districts-meta.json")
    # Nested object format: {"districts": {"CA-34": {...}}}
    if isinstance(raw, dict) and "districts" in raw:
        districts = raw["districts"]
        if isinstance(districts, dict):
            return districts.get(district_code.upper())
    # Flat array format
    if isinstance(raw, list):
        for d in raw:
            code = d.get("code") or f"{d.get('state', '')}-{d.get('district_number', '')}"
            if code.upper() == district_code.upper():
                return d
    return None


def get_districts_for_state(abbr: str) -> list[dict]:
    """Return all congressional districts in a state."""
    raw = _load_json("districts-meta.json")
    results = []
    if isinstance(raw, dict) and "districts" in raw:
        districts = raw["districts"]
        if isinstance(districts, dict):
            for code, meta in districts.items():
                if meta.get("state", "").upper() == abbr.upper():
                    results.append({**meta, "code": code})
    elif isinstance(raw, list):
        for d in raw:
            if d.get("state", "").upper() == abbr.upper():
                results.append(d)
    return results


# ── Candidate data ───────────────────────────────────────────────────────

def get_candidates_for_district(district_code: str) -> list[dict]:
    """Return all filed candidates for a district (e.g. 'TX-31')."""
    raw = _load_json("candidates.json")
    candidates = raw.get("candidates", raw) if isinstance(raw, dict) else raw
    if not isinstance(candidates, list):
        return []
    return [
        c for c in candidates
        if (c.get("district") or "").upper() == district_code.upper()
    ]


def get_candidates_for_state(abbr: str) -> list[dict]:
    """Return all filed candidates in a state."""
    raw = _load_json("candidates.json")
    candidates = raw.get("candidates", raw) if isinstance(raw, dict) else raw
    if not isinstance(candidates, list):
        return []
    return [
        c for c in candidates
        if (c.get("state") or "").upper() == abbr.upper()
    ]


# ── Politician issues & positions ────────────────────────────────────────

def get_politician_issues(abbr: str) -> dict | None:
    """Return politician issue positions for a state."""
    issues = _load_json("politician-issues.json")
    return issues.get(abbr.upper())


# ── Protest & civic activity ─────────────────────────────────────────────

def get_protests_for_state(abbr: str) -> list[dict]:
    """Return protest events for a state."""
    raw = _load_json("protest-activity.json")
    if isinstance(raw, list):
        return [p for p in raw if (p.get("state") or "").upper() == abbr.upper()]
    if isinstance(raw, dict):
        events = raw.get(abbr.upper(), [])
        if isinstance(events, list):
            return events
    return []


# ── Trends ───────────────────────────────────────────────────────────────

def get_trends_for_district(district_code: str) -> dict | None:
    """Return search-interest trends for a district."""
    trends = _load_json("trends-by-district.json")
    return trends.get(district_code.upper())


# ── Tool registry (for agent tool-use loop) ──────────────────────────────

TOOLS: dict[str, dict] = {
    "get_state": {
        "function": get_state,
        "description": "Get state-level metrics (senators, tax, EITC, scores) for a state abbreviation.",
        "parameters": {"abbr": "Two-letter state code, e.g. 'CA'"},
    },
    "get_state_fec": {
        "function": get_state_fec,
        "description": "Get FEC contribution summary (total amount, small-dollar share, per-capita) for a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_district": {
        "function": get_district,
        "description": "Look up a congressional district by code (e.g. 'CA-34') for demographics, member, PVI, margins.",
        "parameters": {"district_code": "District code like 'CA-34'"},
    },
    "get_districts_for_state": {
        "function": get_districts_for_state,
        "description": "List all congressional districts in a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_candidates_for_district": {
        "function": get_candidates_for_district,
        "description": "Get all filed candidates for a congressional district.",
        "parameters": {"district_code": "District code like 'TX-31'"},
    },
    "get_candidates_for_state": {
        "function": get_candidates_for_state,
        "description": "Get all filed candidates in a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_politician_issues": {
        "function": get_politician_issues,
        "description": "Get politician issue positions and statewide themes for a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_protests_for_state": {
        "function": get_protests_for_state,
        "description": "Get protest/civic activity events for a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_trends_for_district": {
        "function": get_trends_for_district,
        "description": "Get search-interest trends for a district.",
        "parameters": {"district_code": "District code like 'CA-34'"},
    },
}
