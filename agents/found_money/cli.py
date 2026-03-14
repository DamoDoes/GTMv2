"""CLI entry point for the Found Money agent.

Usage:
    python -m agents.found_money "Where is the most EITC money being left on the table?"
    python -m agents.found_money  # interactive mode
"""

from __future__ import annotations

import sys

from agents.found_money.agent import FoundMoneyAgent


def main() -> None:
    verbose = "--verbose" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--verbose"]

    agent = FoundMoneyAgent()

    if args:
        query = " ".join(args)
        print(agent.run(query, verbose=verbose))
    else:
        print("Found Money Agent (type 'quit' to exit)")
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
