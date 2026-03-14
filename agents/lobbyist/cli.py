"""CLI entry point for the Lobbyist agent.

Usage:
    python -m agents.lobbyist.cli "What federal spending goes to CA-34?"
    python -m agents.lobbyist.cli --verbose "Who are the senators in Texas?"
    python -m agents.lobbyist.cli  # interactive mode
"""

from __future__ import annotations

import sys

from agents.lobbyist.agent import LobbyistAgent


def main() -> None:
    verbose = "--verbose" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--verbose"]

    agent = LobbyistAgent()

    if args:
        # One-shot mode: run the query and exit
        query = " ".join(args)
        print(agent.run(query, verbose=verbose))
    else:
        # Interactive REPL
        print("Lobbyist Agent (type 'quit' to exit)")
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
