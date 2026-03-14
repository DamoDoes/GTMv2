"""Data access tools for the Tax Filing agent.

Reuses the shared data loading from the lobbyist tools and adds
tax-specific queries and cross-references.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "data"


def _load_json(filename: str) -> Any:
    with open(DATA_DIR / filename) as f:
        return json.load(f)


def get_state_tax_profile(abbr: str) -> dict | None:
    """Return tax-focused metrics for a state: filers, tax paid, EITC, scores."""
    states = _load_json("states.json")
    state = states.get(abbr.upper())
    if not state:
        return None
    return {
        "abbr": abbr.upper(),
        "totalFilers": state.get("totalFilers"),
        "totalFedTaxPaidB": state.get("totalFedTaxPaidB"),
        "adultPop18": state.get("adultPop18"),
        "eitcClaimsThousands": state.get("eitcClaimsThousands"),
        "eitcParticipationRate": state.get("eitcParticipationRate"),
        "eitcUnclaimedRate": state.get("eitcUnclaimedRate"),
        "taxDensityScore": state.get("taxDensityScore"),
        "eitcOpportunityScore": state.get("eitcOpportunityScore"),
        "filingComplexityScore": state.get("filingComplexityScore"),
        "digitalAdoptionScore": state.get("digitalAdoptionScore"),
    }


def get_eitc_opportunities(min_unclaimed_rate: str = "20") -> list[dict]:
    """Find states with EITC unclaimed rates above the given threshold (default 20%)."""
    threshold = float(min_unclaimed_rate)
    states = _load_json("states.json")
    results = []
    for abbr, state in states.items():
        if abbr.startswith("_"):
            continue
        rate = state.get("eitcUnclaimedRate")
        if rate is not None and rate >= threshold:
            results.append({
                "abbr": abbr,
                "eitcUnclaimedRate": rate,
                "eitcClaimsThousands": state.get("eitcClaimsThousands"),
                "eitcParticipationRate": state.get("eitcParticipationRate"),
                "totalFilers": state.get("totalFilers"),
            })
    results.sort(key=lambda x: x["eitcUnclaimedRate"], reverse=True)
    return results


def compare_states_tax(state1: str, state2: str) -> dict:
    """Compare two states on tax filing metrics side by side."""
    p1 = get_state_tax_profile(state1)
    p2 = get_state_tax_profile(state2)
    return {"state1": p1, "state2": p2}


def get_state_fec(abbr: str) -> dict | None:
    """Return FEC contribution summary for a state."""
    fec = _load_json("fec-contributions.json")
    return fec.get(abbr.upper())


TOOLS: dict[str, dict] = {
    "get_state_tax_profile": {
        "function": get_state_tax_profile,
        "description": "Get tax-focused state profile: filers, federal tax paid, EITC rates, filing complexity, digital adoption.",
        "parameters": {"abbr": "Two-letter state code, e.g. 'CA'"},
    },
    "get_eitc_opportunities": {
        "function": get_eitc_opportunities,
        "description": "Find states with EITC unclaimed rates above a threshold. Defaults to 20%.",
        "parameters": {"min_unclaimed_rate": "Minimum unclaimed rate percentage (default '20')"},
    },
    "compare_states_tax": {
        "function": compare_states_tax,
        "description": "Compare two states on tax filing metrics side by side.",
        "parameters": {"state1": "First state code", "state2": "Second state code"},
    },
    "get_state_fec": {
        "function": get_state_fec,
        "description": "Get FEC contribution summary (total amount, small-dollar share, per-capita) for a state.",
        "parameters": {"abbr": "Two-letter state code"},
    },
}
