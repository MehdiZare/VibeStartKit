#!/usr/bin/env python3
"""Project-local VibeStartKit setup. Python 3.12+, standard library only."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ("issue-closure", "pr-ownership")
CLIENTS = {
    "claude-code": (".claude/skills",),
    "codex": (".agents/skills",),
    "cursor": (".agents/skills",),
    "opencode": (".agents/skills",),
    "all": (".agents/skills", ".claude/skills"),
}

type FilePlan = dict[Path, bytes]


def emit(value: object) -> None:
    print(json.dumps(value, indent=2))


def project_path(value: Path) -> Path:
    result = value.expanduser().resolve()
    if result in (Path(result.anchor), Path.home().resolve()):
        raise ValueError("Choose a project directory, not a filesystem root or home directory.")
    if result.exists() and not result.is_dir():
        raise ValueError(f"Project path is not a directory: {result}")
    return result


def check_destination(project: Path, destination: Path) -> None:
    destination.relative_to(project)
    for candidate in (destination, *destination.parents):
        if candidate == project:
            break
        if candidate.is_symlink():
            raise ValueError(f"Refusing a destination symlink: {candidate}")


def source_files(directory: Path) -> list[Path]:
    files = sorted(p for p in directory.rglob("*") if p.is_file())
    for path in files:
        if path.is_symlink():
            raise ValueError(f"Source files must not be symlinks: {path}")
    return files


def init_plan(project: Path, client: str) -> FilePlan:
    plan: FilePlan = {}
    for destination_root in CLIENTS[client]:
        for skill in SKILLS:
            source = ROOT / "skills" / skill
            for path in source_files(source):
                destination = project / destination_root / skill / path.relative_to(source)
                plan[destination] = path.read_bytes()
    for path in source_files(ROOT / "templates"):
        plan[project / ".vibe-kit/templates" / path.relative_to(ROOT / "templates")] = path.read_bytes()
    plan[project / ".vibe-kit/START_HERE.md"] = (ROOT / "prompts/START_HERE.md").read_bytes()
    plan[project / ".vibe-kit/tools.json"] = (ROOT / "presets/tools.json").read_bytes()
    plan[project / ".vibe-kit/mcp-services.json"] = (ROOT / "presets/mcp-services.json").read_bytes()
    return plan


def write_plan(project: Path, plan: FilePlan, *, apply: bool) -> dict[str, object]:
    statuses: dict[Path, str] = {}
    for destination, content in plan.items():
        check_destination(project, destination)
        if destination.exists():
            if not destination.is_file() or destination.read_bytes() != content:
                raise ValueError(f"Existing file differs; nothing will be overwritten: {destination}")
            statuses[destination] = "unchanged"
        else:
            statuses[destination] = "create"

    created: list[Path] = []
    if apply:
        try:
            for destination, content in plan.items():
                if statuses[destination] == "unchanged":
                    continue
                check_destination(project, destination)
                destination.parent.mkdir(parents=True, exist_ok=True)
                check_destination(project, destination)
                with destination.open("xb") as handle:
                    created.append(destination)
                    handle.write(content)
        except (OSError, ValueError):
            for destination in reversed(created):
                destination.unlink(missing_ok=True)
            raise

    return {
        "mode": "applied" if apply else "preview",
        "project": str(project),
        "files": [{"path": str(path.relative_to(project)), "action": action} for path, action in statuses.items()],
        "next": "Review the created project files." if apply else "Review the file list, then repeat with --apply to create it.",
    }


def doctor(client: str | None, strict: bool) -> int:
    catalog = json.loads((ROOT / "presets/tools.json").read_text())
    observed = []
    for item in catalog["tools"]:
        executables = item.get("executables", [])
        installed = next((name for name in executables if shutil.which(name)), None)
        observed.append({
            "id": item["id"], "category": item["category"],
            "binary": installed, "status": "found" if installed else ("not-found" if executables else "account/service"),
            "docs": item["docs"],
        })
    missing = [item["id"] for item in observed if item["id"] in ("git", "github-cli") and item["status"] != "found"]
    selected = [name for name in CLIENTS if name != "all"] if client == "all" else ([] if client is None else [client])
    missing += [name for name in selected if not next(item for item in observed if item["id"] == name)["binary"]]
    emit({"python": sys.version.split()[0], "minimum_python": "3.12", "client": client,
          "tools": observed, "missing_for_selected_workflow": missing,
          "meaning": "Binary discovery only. No credentials, authentication, MCP connectivity, package versions or cloud resources were inspected or changed."})
    return 1 if strict and missing else 0


def verify_demo() -> dict[str, object]:
    outcomes: dict[str, dict[str, object]] = {}
    with tempfile.TemporaryDirectory(prefix="vibestartkit-demo-check-") as temporary:
        for label in ("baseline", "reference"):
            destination = Path(temporary) / label
            shutil.copytree(ROOT / "examples/duplicate-jobs", destination)
            if label == "reference":
                shutil.copyfile(ROOT / "examples/reference-solution/jobs.py", destination / "jobs.py")
            result = subprocess.run(
                [sys.executable, "-I", "-m", "unittest", "discover", "-s", str(destination), "-v"],
                cwd=destination, capture_output=True, text=True, check=False, timeout=30,
            )
            evidence = result.stdout + result.stderr
            outcomes[label] = {"exit_code": result.returncode, "output": evidence}
    baseline = outcomes["baseline"]
    reference = outcomes["reference"]
    expected_failure = baseline["exit_code"] != 0 and "FAIL: test_duplicate_delivery_is_counted_once" in str(baseline["output"])
    passed = expected_failure and reference["exit_code"] == 0
    return {"verified": passed, "baseline_failed_for_expected_behavior": expected_failure,
            "reference_passed": reference["exit_code"] == 0, "runs": outcomes,
            "scope": "Offline synthetic exercise only; no model or provider calls."}


def issue_url(value: str) -> str:
    parsed = urlparse(value)
    parts = parsed.path.strip("/").split("/")
    if parsed.scheme != "https" or parsed.hostname != "github.com" or len(parts) != 4 or parts[2] != "issues" or not parts[3].isdigit() or int(parts[3]) < 1 or parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise argparse.ArgumentTypeError("Use an exact https://github.com/OWNER/REPO/issues/NUMBER URL.")
    return value


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="VibeStartKit: local setup, skills, prebuilt templates and an offline demo.")
    result.add_argument("--version", action="version", version=json.loads((ROOT / "kit.json").read_text())["version"])
    commands = result.add_subparsers(dest="command", required=True)
    check = commands.add_parser("doctor", help="Discover installed CLI binaries without reading credentials or contacting providers.")
    check.add_argument("--client", choices=CLIENTS)
    check.add_argument("--strict", action="store_true", help="Fail when git, gh or the selected coding client is absent.")
    install = commands.add_parser("init", help="Preview or copy the skills and prebuilt templates into one project.")
    install.add_argument("--project", type=Path, required=True)
    install.add_argument("--client", choices=CLIENTS, required=True)
    install.add_argument("--apply", action="store_true")
    demo = commands.add_parser("demo", help="Create the broken teaching example, or verify baseline/reference behavior.")
    demo.add_argument("--destination", type=Path)
    demo.add_argument("--apply", action="store_true")
    demo.add_argument("--verify", action="store_true")
    prompt = commands.add_parser("prompt", help="Print the guided LLM setup prompt; optionally scope it to a GitHub issue.")
    prompt.add_argument("--issue", type=issue_url)
    tools = commands.add_parser("tools", help="Show the prebuilt tool catalog and official setup documentation.")
    tools.add_argument("--category", choices=("core", "agents", "review", "models", "memory", "cloud"))
    return result


def main(argv: list[str] | None = None) -> int:
    arguments = parser().parse_args(argv)
    try:
        match arguments.command:
            case "doctor":
                return doctor(arguments.client, arguments.strict)
            case "init":
                project = project_path(arguments.project)
                report = write_plan(project, init_plan(project, arguments.client), apply=arguments.apply)
                if arguments.apply:
                    report["next"] = "Open .vibe-kit/START_HERE.md in your chosen coding client."
                emit(report)
            case "demo":
                if arguments.verify:
                    if arguments.destination or arguments.apply:
                        raise ValueError("Use --verify on its own; it creates and removes isolated temporary copies.")
                    report = verify_demo()
                    emit(report)
                    return 0 if report["verified"] else 1
                if not arguments.destination:
                    raise ValueError("Choose --destination for the exercise, or use --verify.")
                project = project_path(arguments.destination)
                source = ROOT / "examples/duplicate-jobs"
                plan = {project / p.relative_to(source): p.read_bytes() for p in source_files(source) if "__pycache__" not in p.parts}
                report = write_plan(project, plan, apply=arguments.apply)
                if arguments.apply:
                    report["next"] = "Read ISSUE.md in the exercise directory, then run python3 -m unittest -v. The baseline should fail on duplicate deliveries."
                emit(report)
            case "prompt":
                print((ROOT / "prompts/START_HERE.md").read_text())
                if arguments.issue:
                    print(f"\nMy exact issue is {arguments.issue}. Start with investigation and a plan; keep implementation pending until the scope is approved.")
            case "tools":
                catalog = json.loads((ROOT / "presets/tools.json").read_text())
                if arguments.category:
                    catalog["tools"] = [item for item in catalog["tools"] if item["category"] == arguments.category]
                emit(catalog)
        return 0
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"VibeStartKit: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
