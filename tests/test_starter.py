import argparse
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from vibestartkit import cli as starter


class StarterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="vibestartkit-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / "project"

    def test_preview_does_not_create_a_directory(self) -> None:
        report = starter.write_plan(self.project, starter.init_plan(self.project, "codex"), apply=False)
        self.assertEqual(report["mode"], "preview")
        self.assertFalse(self.project.exists())

    def test_installed_skills_keep_their_reference_files(self) -> None:
        starter.write_plan(self.project, starter.init_plan(self.project, "codex"), apply=True)
        for skill in starter.SKILLS:
            root = self.project / ".agents/skills" / skill
            self.assertTrue((root / "SKILL.md").is_file())
            self.assertTrue((root / "references/project-memory.md").is_file())
        self.assertTrue((self.project / ".vibe-kit/START_HERE.md").is_file())
        self.assertFalse((self.project / "AGENTS.md").exists())

    def test_all_clients_have_canonical_and_claude_installations(self) -> None:
        starter.write_plan(self.project, starter.init_plan(self.project, "all"), apply=True)
        for relative in (".agents/skills/issue-closure/SKILL.md", ".claude/skills/issue-closure/SKILL.md"):
            self.assertTrue((self.project / relative).is_file())
        self.assertEqual((self.project / ".agents/skills/issue-closure/SKILL.md").read_bytes(), (self.project / ".claude/skills/issue-closure/SKILL.md").read_bytes())

    def test_reference_catalog_does_not_activate_mcp_or_modify_client_configs(self) -> None:
        starter.write_plan(self.project, starter.init_plan(self.project, "all"), apply=True)
        self.assertTrue((self.project / ".vibe-kit/mcp-services.json").is_file())
        for relative in (".mcp.json", ".cursor/mcp.json", ".codex/config.toml", "opencode.json"):
            self.assertFalse((self.project / relative).exists())

    def test_a_conflicting_existing_file_prevents_the_entire_install(self) -> None:
        protected = self.project / ".vibe-kit/START_HERE.md"
        protected.parent.mkdir(parents=True)
        protected.write_text("my existing instructions")
        with self.assertRaises(ValueError):
            starter.write_plan(self.project, starter.init_plan(self.project, "codex"), apply=True)
        self.assertEqual(protected.read_text(), "my existing instructions")
        self.assertFalse((self.project / ".agents").exists())

    def test_destination_symlink_does_not_write_outside_the_project(self) -> None:
        outside = self.root / "outside"
        outside.mkdir()
        self.project.mkdir()
        try:
            (self.project / ".agents").symlink_to(outside, target_is_directory=True)
        except OSError:
            self.skipTest("Symlink creation is unavailable on this platform")
        with self.assertRaises(ValueError):
            starter.write_plan(self.project, starter.init_plan(self.project, "codex"), apply=True)
        self.assertEqual(list(outside.iterdir()), [])

    def test_second_install_is_idempotent_and_preserves_unrelated_files(self) -> None:
        plan = starter.init_plan(self.project, "codex")
        starter.write_plan(self.project, plan, apply=True)
        unrelated = self.project / "notes.txt"
        unrelated.write_text("keep this")
        report = starter.write_plan(self.project, plan, apply=True)
        self.assertTrue(all(item["action"] == "unchanged" for item in report["files"]))
        self.assertEqual(unrelated.read_text(), "keep this")

    def test_demo_exposes_the_bug_and_the_reference_passes(self) -> None:
        report = starter.verify_demo()
        self.assertTrue(report["baseline_failed_for_expected_behavior"])
        self.assertTrue(report["reference_passed"])
        self.assertTrue(report["verified"])

    def test_demo_creation_does_not_copy_the_answer(self) -> None:
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture):
            code = starter.main(["demo", "--destination", str(self.project), "--apply"])
        self.assertEqual(code, 0)
        self.assertEqual((self.project / "jobs.py").read_bytes(), (starter.ROOT / "examples/duplicate-jobs/jobs.py").read_bytes())
        self.assertFalse((self.project / "reference-solution").exists())

    def test_prompt_scopes_the_exact_issue_and_rejects_other_destinations(self) -> None:
        accepted = "https://github.com/example/project/issues/12"
        capture = io.StringIO()
        with contextlib.redirect_stdout(capture):
            self.assertEqual(starter.main(["prompt", "--issue", accepted]), 0)
        self.assertIn(accepted, capture.getvalue())
        for invalid in ("https://example.com/a/b/issues/12", "https://github.com/a/b/pull/12", "https://github.com/a/b/issues/0", "https://github.com/a/b/issues/1?token=secret"):
            with self.assertRaises(argparse.ArgumentTypeError):
                starter.issue_url(invalid)

    def test_cli_can_run_from_another_working_directory(self) -> None:
        result = subprocess.run([sys.executable, str(starter.ROOT / "starter.py"), "tools", "--category", "models"], cwd=self.root, capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([item["id"] for item in json.loads(result.stdout)["tools"]], ["openrouter"])

    def test_strict_doctor_reports_missing_tools_for_all_selected_clients(self) -> None:
        capture = io.StringIO()
        with patch.dict(os.environ, {"PATH": ""}), contextlib.redirect_stdout(capture):
            code = starter.doctor("all", strict=True)
        self.assertEqual(code, 1)
        missing = set(json.loads(capture.getvalue())["missing_for_selected_workflow"])
        self.assertTrue({"git", "github-cli", "codex", "claude-code", "cursor", "opencode"} <= missing)


if __name__ == "__main__":
    unittest.main()
