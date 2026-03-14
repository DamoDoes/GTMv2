"""CLI entry point for the Tax Filing agent.

Usage:
    python -m agents.tax_filing "Which states have the highest EITC unclaimed rates?"
    python -m agents.tax_filing  # interactive mode
"""

from __future__ import annotations

import sys

from agents.tax_filing.agent import TaxFilingAgent


def main() -> None:
    verbose = "--verbose" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--verbose"]

    agent = TaxFilingAgent()

    if args:
        query = " ".join(args)
        print(agent.run(query, verbose=verbose))
    else:
        print("Tax Filing Agent (type 'quit' to exit)")
        print("-" * 40)
        while True:
            try:
                query = input("\n> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if not query or query.lower() in ("quit", "exit", "q"):
                break
            print()
            print(agent.run(query, verbose=verbose))


if __name__ == "__main__":
    main()
