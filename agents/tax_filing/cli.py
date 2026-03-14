"""CLI entry point for the Tax Filing agent.

Usage:
    python -m agents.tax_filing "Which states have the highest EITC unclaimed rates?"
    python -m agents.tax_filing  # interactive mode

In interactive mode, paste multi-line prompts freely. Press Enter twice
(blank line) to submit, or just type a single line and press Enter once.
"""

from __future__ import annotations

import select
import sys

from agents.tax_filing.agent import TaxFilingAgent


def _read_multiline(prompt: str = "> ") -> str | None:
    """Read input that supports multi-line paste."""
    try:
        first = input(prompt)
    except (EOFError, KeyboardInterrupt):
        return None

    lines = [first]
    if not sys.stdin.isatty():
        for line in sys.stdin:
            lines.append(line.rstrip("\n"))
        return "\n".join(lines).strip() or None

    while True:
        try:
            ready, _, _ = select.select([sys.stdin], [], [], 0.05)
        except (ValueError, OSError):
            break
        if not ready:
            break
        try:
            line = input()
        except (EOFError, KeyboardInterrupt):
            break
        if not line:
            break
        lines.append(line)

    return "\n".join(lines).strip() or None


def main() -> None:
    verbose = "--verbose" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--verbose"]

    agent = TaxFilingAgent()

    if args:
        query = " ".join(args)
        print(agent.run(query, verbose=verbose))
    else:
        print("Tax Filing Agent (type 'quit' to exit)")
        print("Paste multi-line prompts freely; blank line or Enter submits.")
        print("-" * 40)
        while True:
            query = _read_multiline("\n> ")
            if query is None or query.lower() in ("quit", "exit", "q"):
                print()
                break
            print()
            print(agent.run(query, verbose=verbose))


if __name__ == "__main__":
    main()
