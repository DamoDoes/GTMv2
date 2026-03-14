"""Data access tools for the Found Money agent.

Focuses on identifying unclaimed benefits, underutilized credits,
and misallocated spending.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"


def _load_json(filename: str) -> Any:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


def get_eitc_profile(abbr: str) -> dict | None:
    """Return EITC-focused metrics for a state."""
    states = _load_json("states.json")
    state = states.get(abbr.upper())
    if not state:
        return None
    return {
        "abbr": abbr.upper(),
        "eitcClaimsThousands": state.get("eitcClaimsThousands"),
        "eitcParticipationRate": state.get("eitcParticipationRate"),
        "eitcUnclaimedRate": state.get("eitcUnclaimedRate"),
        "eitcOpportunityScore": state.get("eitcOpportunityScore"),
        "totalFilers": state.get("totalFilers"),
        "adultPop18": state.get("adultPop18"),
    }


def rank_states_by_eitc_opportunity() -> list[dict]:
    """Rank all states by EITC opportunity score (highest first)."""
    states = _load_json("states.json")
    results = []
    for abbr, state in states.items():
        if abbr.startswith("_"):
            continue
        results.append({
            "abbr": abbr,
            "eitcOpportunityScore": state.get("eitcOpportunityScore", 0),
            "eitcUnclaimedRate": state.get("eitcUnclaimedRate", 0),
            "eitcClaimsThousands": state.get("eitcClaimsThousands", 0),
        })
    results.sort(key=lambda x: x["eitcOpportunityScore"], reverse=True)
    return results


def get_small_dollar_profile(abbr: str) -> dict | None:
    """Return small-dollar donor profile for a state from FEC data."""
    fec = _load_json("fec-contributions.json")
    data = fec.get(abbr.upper())
    if not data:
        return None
    return {
        "abbr": abbr.upper(),
        "totalAmount": data.get("totalAmount"),
        "smallDollarAmount": data.get("smallDollarAmount"),
        "smallDollarShare": data.get("smallDollarShare"),
        "avgContribution": data.get("avgContribution"),
        "contributionsPerCapita": data.get("contributionsPerCapita"),
    }


def get_election_waste(abbr: str) -> dict | None:
    """Return election administration 'waste' metrics: rejected ballots, provisional counts."""
    eac = _load_json("eac-election-admin.json")
    data = eac.get(abbr.upper())
    if not data:
        return None
    transmitted = data.get("mailBallotsTransmitted", 0)
    rejected = data.get("mailBallotsRejected", 0)
    rejection_rate = (rejected / transmitted * 100) if transmitted else 0
    return {
        "abbr": abbr.upper(),
        "registeredVoters": data.get("registeredVoters"),
        "mailBallotsTransmitted": transmitted,
        "mailBallotsRejected": rejected,
        "mailBallotRejectionRate": round(rejection_rate, 2),
        "mailRejectionReasons": data.get("mailRejectionReasons"),
        "provisionalBallotsCast": data.get("provisionalBallotsCast"),
        "provisionalBallotsCounted": data.get("provisionalBallotsCounted"),
        "provisionalBallotsRejected": data.get("provisionalBallotsRejected"),
    }


def find_low_coalition_districts(abbr: str) -> list[dict]:
    """Find districts in a state with the lowest coalition thresholds (easiest to organize)."""
    raw = _load_json("districts-meta.json")
    districts = []
    if isinstance(raw, dict) and "districts" in raw:
        for code, meta in raw["districts"].items():
            if meta.get("state", "").upper() == abbr.upper():
                districts.append({**meta, "code": code})
    elif isinstance(raw, list):
        districts = [d for d in raw if d.get("state", "").upper() == abbr.upper()]

    results = [
        {
            "code": d.get("code", f"{d.get('state')}-{d.get('district_number')}"),
            "member": d.get("member"),
            "party": d.get("party"),
            "coalition_threshold": d.get("coalition_threshold"),
            "poverty_rate": d.get("poverty_rate"),
            "median_income": d.get("median_income"),
        }
        for d in districts
        if d.get("coalition_threshold") is not None
    ]
    results.sort(key=lambda x: x["coalition_threshold"] or float("inf"))
    return results


TOOLS: dict[str, dict] = {
    "get_eitc_profile": {
        "function": get_eitc_profile,
        "description": "Get EITC-focused metrics for a state: claims, participation, unclaimed rate, opportunity score.",
        "parameters": {"abbr": "Two-letter state code, e.g. 'CA'"},
    },
    "rank_states_by_eitc_opportunity": {
        "function": rank_states_by_eitc_opportunity,
        "description": "Rank all 50 states by EITC opportunity score (highest unclaimed benefits first).",
        "parameters": {},
    },
    "get_small_dollar_profile": {
        "function": get_small_dollar_profile,
        "description": "Get small-dollar donor profile for a state: total, share, average contribution, per-capita.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "get_election_waste": {
        "function": get_election_waste,
        "description": "Get election administration waste: mail ballot rejection rate, provisional ballot stats, rejection reasons.",
        "parameters": {"abbr": "Two-letter state code"},
    },
    "find_low_coalition_districts": {
        "function": find_low_coalition_districts,
        "description": "Find districts in a state with the lowest coalition thresholds (fewest people needed to swing an outcome).",
        "parameters": {"abbr": "Two-letter state code"},
    },
}
