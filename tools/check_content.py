#!/usr/bin/env python3
"""Check maintained local references, manifest syntax and publication hygiene."""

import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
excluded = {".git", "node_modules", "dist", ".turbo", ".pnpm-store", "__pycache__"}
maintained = []
for directory, subdirectories, filenames in os.walk(ROOT):
    subdirectories[:] = [name for name in subdirectories if name not in excluded]
    maintained.extend(Path(directory) / name for name in filenames)
markdown_files = [path for path in maintained if path.suffix == ".md"]
for path in markdown_files:
    text = path.read_text()
    if re.search(r"/Users/[^/\s]+/|/home/[^/\s]+/|\brepo_[a-z0-9_]+__[0-9a-f]{6,}", text):
        errors.append(f"{path.relative_to(ROOT)} contains a private local path or namespace")
    if re.search(r"\b(?:ghp_[A-Za-z0-9]{25,}|sk-proj-[A-Za-z0-9_-]{25,})\b", text):
        errors.append(f"{path.relative_to(ROOT)} contains a credential-shaped value")
    prose = re.sub(r"(?ms)^\x60\x60\x60.*?^\x60\x60\x60[^\n]*$", "", text)
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", prose):
        url = urlsplit(target.strip("<>"))
        if url.scheme or target.startswith("#"):
            continue
        destination = (path.parent / unquote(url.path)).resolve()
        if not destination.exists():
            errors.append(f"{path.relative_to(ROOT)}: missing local reference {target}")

for path in maintained:
    if path.suffix == ".json":
        try:
            json.loads(path.read_text())
        except (ValueError, UnicodeError) as error:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON: {error}")

for name in ("issue-closure", "pr-ownership", "project-setup"):
    path = ROOT / "skills" / name / "SKILL.md"
    text = path.read_text()
    if not text.startswith("---\n") or f"name: {name}\n" not in text.split("---", 2)[1]:
        errors.append(f"Invalid skill name/frontmatter: {name}")
    if "description:" not in text.split("---", 2)[1]:
        errors.append(f"Missing skill description: {name}")

disclosed = [ROOT / "README.md", *sorted((ROOT / "docs").rglob("*.md"))]
for path in disclosed:
    if "DISCLOSURES.md" not in path.read_text():
        errors.append(f"{path.relative_to(ROOT)} must link DISCLOSURES.md (no-affiliation and paid-service disclosure)")
if "MIT License" not in (ROOT / "LICENSE").read_text().splitlines()[0]:
    errors.append("LICENSE must be the MIT License")

articles = sorted((ROOT / "docs/articles").glob("[0-9][0-9]-*.md"))
if len(articles) < 12:
    errors.append(f"Expected at least 12 complete articles; found {len(articles)}")
counts = {}
for path in articles:
    text = path.read_text()
    prose = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    words = len(prose.split())
    counts[path.name] = words
    if words < 950:
        errors.append(f"{path.name} is only {words} words; expand the substance before release")

report = {"markdown_files": len(markdown_files), "articles": counts, "errors": errors}
print(json.dumps(report, indent=2))
raise SystemExit(bool(errors))
