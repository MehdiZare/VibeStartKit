#!/usr/bin/env python3
"""Check the interpreter before loading the Python 3.12+ starter."""

import sys

if sys.version_info < (3, 12):
    print("VibeStartKit needs Python 3.12 or newer. Select a supported interpreter, or run: uv run --python 3.12 starter.py --help", file=sys.stderr)
    raise SystemExit(2)

from vibestartkit.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
