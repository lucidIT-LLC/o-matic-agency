#!/usr/bin/env node
// verify-adapter-paths.test.mjs — fixtures for verify-adapter-paths.mjs (task #983).
// Canonical source: o-matic-studio/studio/scripts/. Synced copies elsewhere.
//
// Runs the real script against a throwaway HOME with a fabricated
// installed_plugins.json and plugin cache, so it runs in CI where no
// ~/.claude exists. Every case asserts an exit code or a file state, and the
// suite asserts BOTH directions: a check that has only ever passed is not a
// check (task #742 done-when 3).
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = process.env.VERIFY_ADAPTER_PATHS || join(dirname(fileURLToPath(import.meta.url)), "verify-adapter-paths.mjs");
let fails = 0;
const expect = (ok, label) => { console.log(`${ok ? "PASS" : "**FAIL**"} | ${label}`); if (!ok) fails++; };

const TEMPLATE = "---\nname: carver\ndescription: test\nskills:\n  - carver-build\n---\n\nLoad the preloaded skill.\n";

function world() {
  const home = mkdtempSync(join(tmpdir(), "vap-"));
  const root = join(home, ".claude", "plugins", "cache", "o-matic-studio", "studio", "9.9.9");
  mkdirSync(join(root, "adapters", "claude", "agents"), { recursive: true });
  mkdirSync(join(root, "skills", "carver-build"), { recursive: true });
  writeFileSync(join(root, "skills", "carver-build", "SKILL.md"), "---\nname: carver-build\ndescription: x\n---\n");
  writeFileSync(join(root, "adapters", "claude", "agents", "carver.md"), TEMPLATE);
  writeFileSync(join(home, ".claude", "plugins", "installed_plugins.json"), JSON.stringify({
    version: 2, plugins: { "studio@o-matic-studio": [{ installPath: root, version: "9.9.9", gitCommitSha: "x" }] },
  }));
  mkdirSync(join(home, ".claude", "agents"), { recursive: true });
  return { home, root, agent: join(home, ".claude", "agents", "carver.md") };
}
const run = (w, ...a) => spawnSync(process.execPath, [SCRIPT, "--home", w.home, ...a], {
  encoding: "utf8", env: { ...process.env, CLAUDE_PLUGIN_ROOT: w.root },
});

{ const w = world(); writeFileSync(w.agent, TEMPLATE);
  expect(run(w).status === 0, "identical deployed copy passes"); }

{ const w = world(); writeFileSync(w.agent, TEMPLATE.replace("Load the", "Load `/x/.claude/plugins/cache/o-matic-studio/studio/9.9.9/adapters/ROLE-CORE.md` and the"));
  const r = run(w);
  expect(r.status === 1 && /version-pinned cache path/.test(r.stdout), "a pin FAILS even when it matches the installed version"); }

{ const w = world(); writeFileSync(w.agent, TEMPLATE + "\nhand edit\n");
  expect(run(w).status === 1, "a deployed copy that drifted from the template FAILS"); }

{ const w = world();
  expect(run(w).status === 1, "a shipped adapter that is not deployed FAILS"); }

{ const w = world(); writeFileSync(w.agent, TEMPLATE.replace("carver-build", "no-such-skill"));
  const r = run(w);
  expect(r.status === 1 && /no-such-skill/.test(r.stdout), "an unresolvable frontmatter skill FAILS"); }

{ const w = world(); writeFileSync(join(w.root, ".orphaned_at"), "1");
  writeFileSync(w.agent, TEMPLATE);
  expect(run(w).status === 1, "installed record pointing at an .orphaned_at directory FAILS"); }

{ const w = world();
  const r = run(w, "--hook");
  expect(r.status === 0 && readFileSync(w.agent, "utf8") === TEMPLATE && /installed/.test(r.stdout),
    "--hook installs a missing adapter (second-Mac case)"); }

{ const w = world(); run(w, "--hook");
  const next = TEMPLATE.replace("test", "test v2");
  writeFileSync(join(w.root, "adapters", "claude", "agents", "carver.md"), next);
  const r = run(w, "--hook");
  expect(readFileSync(w.agent, "utf8") === next && /updated/.test(r.stdout),
    "--hook updates an untouched adapter after a pack update"); }

{ const w = world(); run(w, "--hook");
  writeFileSync(w.agent, TEMPLATE + "\nhand edit\n");
  writeFileSync(join(w.root, "adapters", "claude", "agents", "carver.md"), TEMPLATE.replace("test", "test v2"));
  const r = run(w, "--hook");
  expect(r.status === 0 && readFileSync(w.agent, "utf8").includes("hand edit") && /FAIL/.test(r.stdout),
    "--hook REPORTS and does not overwrite a hand-edited adapter"); }

{ const w = world(); run(w, "--hook");
  const r = run(w, "--hook");
  expect(r.status === 0 && r.stdout.trim() === "", "--hook is silent when everything is current"); }

{ const w = world(); writeFileSync(w.agent, "legacy pinned copy\n");
  const r = run(w, "--deploy");
  const backups = join(w.home, ".claude", "state", "adapter-backups");
  const kept = existsSync(backups) && readdirSync(backups).length === 1;
  expect(r.status === 0 && readFileSync(w.agent, "utf8") === TEMPLATE && kept,
    "--deploy adopts a legacy copy and keeps the old one outside ~/.claude/agents"); }

console.log(`\nRESULT: ${fails ? `${fails} FAILED` : "ALL PASS"}`);
process.exit(fails ? 1 : 0);
