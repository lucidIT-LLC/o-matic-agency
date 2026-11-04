#!/usr/bin/env python3
"""Contract tests for the skills-pack public-readiness gate."""

import hashlib
import importlib.util
import json
import os
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "check-public-package.py"))
SPEC = importlib.util.spec_from_file_location("check_public_package", ROOT)
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class PublicGateTests(unittest.TestCase):
    def run_gate(self, files, denylist="", allowlist="", hashed=None, profile="skills-pack", extra=None):
        with tempfile.TemporaryDirectory() as tmp:
            pack = os.path.join(tmp, "studio", "skills", "demo")
            os.makedirs(pack)
            plugin = os.path.join(tmp, "studio", ".cursor-plugin")
            os.makedirs(plugin)
            with open(os.path.join(plugin, "plugin.json"), "w", encoding="utf-8") as handle:
                handle.write('{"name":"studio","version":"0.0.1"}\n')
            for rel, text in files.items():
                path = os.path.join(tmp, rel)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w", encoding="utf-8") as handle:
                    handle.write(text)
            deny = os.path.join(tmp, "denylist.tsv")
            allow = os.path.join(tmp, "allowlist.tsv")
            hashed_path = os.path.join(tmp, "hashed.json")
            with open(deny, "w", encoding="utf-8") as handle:
                handle.write(denylist)
            with open(allow, "w", encoding="utf-8") as handle:
                handle.write(allowlist)
            with open(hashed_path, "w", encoding="utf-8") as handle:
                json.dump({"terms": hashed or []}, handle)
            argv = ["--profile", profile, "--denylist", deny, "--allowlist", allow, "--hashed", hashed_path, tmp]
            if extra:
                argv = extra + argv
            return GATE.main(argv)

    def test_clean_tree_exits_0(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "Hello from the pack.\n"})
        self.assertEqual(code, 0)

    def test_retired_role_reports_category_not_term(self):
        term = "tim"
        with tempfile.TemporaryDirectory() as tmp:
            skill = os.path.join(tmp, "studio", "skills", "demo")
            os.makedirs(skill)
            plugin = os.path.join(tmp, "studio", ".cursor-plugin")
            os.makedirs(plugin)
            with open(os.path.join(plugin, "plugin.json"), "w", encoding="utf-8") as handle:
                handle.write("{}\n")
            with open(os.path.join(skill, "SKILL.md"), "w", encoding="utf-8") as handle:
                handle.write("Route work to tim today.\n")
            hashed = os.path.join(tmp, "hashed.json")
            with open(hashed, "w", encoding="utf-8") as handle:
                json.dump({"terms": [{"sha256": sha(term), "category": "retired-role"}]}, handle)
            import io
            from contextlib import redirect_stdout
            buf = io.StringIO()
            with redirect_stdout(buf):
                code = GATE.main(["--profile", "skills-pack", "--hashed", hashed, tmp])
            out = buf.getvalue()
        self.assertEqual(code, 1)
        self.assertIn("retired-role", out)
        self.assertNotIn(term, out.lower())

    def test_parent_and_dead_links(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "See [up](../secret.md) and [gone](missing.md).\n"})
        self.assertEqual(code, 1)

    def test_prose_parent_path_is_not_a_link(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "The payload names `../omatic/ROLE-CORE.md`.\n"})
        self.assertEqual(code, 0)

    def test_host_command(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "Do not ssh into the box.\n"})
        self.assertEqual(code, 1)

    def test_warn_exits_0(self):
        code = self.run_gate(
            {"studio/skills/demo/SKILL.md": "nginx stays off this pack.\n"},
            extra=["--warn"],
        )
        self.assertEqual(code, 0)

    def test_skills_pack_ignores_server_tool_names(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "Call factory_query only when the guide says so.\n"})
        self.assertEqual(code, 0)

    def test_default_profile_flags_server_tool(self):
        code = self.run_gate(
            {"studio/skills/demo/SKILL.md": "Call factory_query.\n"},
            profile="default",
        )
        self.assertEqual(code, 1)

    def test_allowlist_suppresses_brand(self):
        code = self.run_gate(
            {"studio/skills/demo/SKILL.md": "o-MATIC ships this pack.\n"},
            denylist="brand\to-MATIC\n",
            allowlist="o-MATIC\n",
        )
        self.assertEqual(code, 0)

    def test_changelog_keeps_record_ids(self):
        code = self.run_gate({"studio/CHANGELOG.md": "decision #416 stayed in the history.\n"})
        self.assertEqual(code, 0)

    def test_skill_record_id_fails(self):
        code = self.run_gate({"studio/skills/demo/SKILL.md": "See decision #416.\n"})
        self.assertEqual(code, 1)

    def test_missing_root_exits_2(self):
        with self.assertRaises(SystemExit) as raised:
            GATE.main(["--profile", "skills-pack", "/no/such/public-gate-root"])
        self.assertEqual(raised.exception.code, 2)

    def test_roster_exemption(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.makedirs(os.path.join(tmp, "studio", ".cursor-plugin"))
            with open(os.path.join(tmp, "studio", ".cursor-plugin", "plugin.json"), "w", encoding="utf-8") as handle:
                handle.write("{}\n")
            with open(os.path.join(tmp, "agent-pack.json"), "w", encoding="utf-8") as handle:
                json.dump({"agents": [{"id": "brandy", "display_name": "Brandy"}]}, handle)
            skill = os.path.join(tmp, "studio", "skills", "demo")
            os.makedirs(skill)
            with open(os.path.join(skill, "SKILL.md"), "w", encoding="utf-8") as handle:
                handle.write("Brandy owns the gate.\n")
            deny = os.path.join(tmp, "denylist.tsv")
            with open(deny, "w", encoding="utf-8") as handle:
                handle.write("roster\tBrandy\n")
            code = GATE.main(["--profile", "skills-pack", "--denylist", deny, tmp])
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
