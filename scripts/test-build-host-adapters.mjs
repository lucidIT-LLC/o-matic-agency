#!/usr/bin/env node
// test-build-host-adapters.mjs — the adapter builder's own test (task #1024,
// decision #700 rule 2: a change ships with the test that proves it).
//
// CANONICAL SOURCE: o-matic-studio/scripts/test-build-host-adapters.mjs.
// Copied into o-matic-firm and o-matic-agency by scripts/sync-pack-tooling.mjs.
//
// Builds a throwaway one-role pack and runs the real builder against it:
//   1. a skill with a linked reference file builds clean, and the Gemini copy
//      and the ChatGPT setup both carry the reference file;
//   2. each of Anthropic's skill rules fails when broken (body over 500 lines,
//      an unlinked reference, a link to a missing file, a nested reference,
//      a long reference with no "## Contents");
//   3. --check fails on drift and passes when current.
//   4. generated adapters define Grok Bot, and this pack no longer teaches
//      that the host is undefined.
// Run: node scripts/test-build-host-adapters.mjs
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BUILDER = join(dirname(fileURLToPath(import.meta.url)), "build-host-adapters.mjs");
let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label}${ok || !detail ? "" : `\n        ${detail}`}`);
  if (!ok) failed++;
};

function pack({ body = "Role guide.\n\nSee [reference/detail.md](reference/detail.md).\n", refs = { "reference/detail.md": "# Detail\n\nMore.\n" } } = {}) {
  const root = mkdtempSync(join(tmpdir(), "hostadapters-"));
  const w = (rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  w(".claude-plugin/marketplace.json", JSON.stringify({ plugins: [{ source: "./demo" }] }));
  w("demo/.claude-plugin/plugin.json", JSON.stringify({ name: "demo", displayName: "Demo" }));
  w("agent-pack.json", JSON.stringify({ agents: [{
    id: "tess", display_name: "Tess", role: "Tester", one_liner: "Tests things.",
    canonical_skill: "demo/skills/tess-testing/SKILL.md", triggers: ["test this"],
    archetypes: [], identity: { tone_of_record: "Plain.", primary_domain: "testing", drift_anchor: "Tests, never guesses." },
  }] }));
  w("demo/skills/tess-testing/SKILL.md", `---\nname: tess-testing\ndescription: Tests things. Use when asked to test.\n---\n${body}`);
  for (const [rel, text] of Object.entries(refs)) w(`demo/skills/tess-testing/${rel}`, text);
  return root;
}
const run = (root, ...args) => spawnSync(process.execPath, [BUILDER, root, ...args], { encoding: "utf8" });

// 1. Clean build carries reference files to every host that takes files.
{
  const root = pack();
  const r = run(root);
  check("a skill with a linked reference builds clean", r.status === 0, r.stdout + r.stderr);
  check("Gemini copy carries the reference file", existsSync(join(root, "skills/tess-testing/reference/detail.md")));
  const setup = existsSync(join(root, "demo/adapters/chatgpt/tess/SETUP.md")) ? readFileSync(join(root, "demo/adapters/chatgpt/tess/SETUP.md"), "utf8") : "";
  check("ChatGPT setup lists the reference file as knowledge", setup.includes("reference/detail.md"), setup.slice(0, 400));
  check("--check passes when current", run(root, "--check").status === 0);
  writeFileSync(join(root, "skills/tess-testing/SKILL.md"), "stale\n");
  check("--check fails on drift", run(root, "--check").status === 1);
  rmSync(root, { recursive: true, force: true });
}

// 2. Each vendor rule fails when broken.
const cases = [
  ["body over 500 lines", { body: "x\n".repeat(501) + "See [reference/detail.md](reference/detail.md).\n" }, /body \d+ lines > 500/],
  ["a reference not linked from SKILL.md", { body: "No links.\n" }, /is not linked from SKILL.md/],
  ["a link to a missing file", { body: "See [reference/gone.md](reference/gone.md) and [reference/detail.md](reference/detail.md).\n" }, /does not exist/],
  ["a nested reference", { refs: { "reference/detail.md": "# D\n\nSee [more.md](more.md).\n", "reference/more.md": "# M\n" },
    body: "See [reference/detail.md](reference/detail.md) and [reference/more.md](reference/more.md).\n" }, /one level deep/],
  ["a long reference with no Contents", { refs: { "reference/detail.md": "# D\n" + "line\n".repeat(120) } }, /has no "## Contents"/],
];
for (const [label, opts, want] of cases) {
  const root = pack(opts);
  const r = run(root);
  check(`rule fails: ${label}`, r.status === 1 && want.test(r.stdout), r.stdout.slice(0, 300));
  rmSync(root, { recursive: true, force: true });
}

// An openai.yaml icon that does not exist fails the build.
{
  const root = pack();
  const y = join(root, "demo/skills/tess-testing/agents/openai.yaml");
  mkdirSync(dirname(y), { recursive: true });
  writeFileSync(y, 'interface:\n  icon_small: "./assets/tess.svg"\n');
  const r = run(root);
  check("rule fails: an openai.yaml icon that does not exist", r.status === 1 && /icon \.\/assets\/tess\.svg does not exist/.test(r.stdout), r.stdout.slice(0, 300));
  mkdirSync(join(root, "demo/skills/tess-testing/assets"), { recursive: true });
  writeFileSync(join(root, "demo/skills/tess-testing/assets/tess.svg"), "<svg/>");
  check("the same skill passes once the icon exists", run(root).status === 0);
  rmSync(root, { recursive: true, force: true });
}

// 3. Grok Bot is a defined host in generated adapters, including on a one-role pack.
{
  const root = pack();
  const r = run(root);
  check("Grok Bot adapters build clean", r.status === 0, r.stdout + r.stderr);
  const grok = existsSync(join(root, "demo/adapters/grok/tess.md")) ? readFileSync(join(root, "demo/adapters/grok/tess.md"), "utf8") : "";
  check("grok.com paste defines Grok Bot and stays within 4000 characters",
    /Grok Bot is a defined host/.test(grok) && !/GrokBot is undefined/.test(grok) && grok.length <= 4000,
    `len=${grok.length} tail=${grok.slice(-240)}`);
  const bot = existsSync(join(root, "demo/adapters/grok-bot/tess.md")) ? readFileSync(join(root, "demo/adapters/grok-bot/tess.md"), "utf8") : "";
  const about = (bot.match(/^> (.+)$/m) || [])[1] || "";
  check("Grok Bot paste description names the skill, approval, and drafts",
    /grok-tess/.test(bot) && /operator's own explicit approval/.test(bot) && /drafts for the operator/.test(bot),
    bot.slice(0, 300));
  check("Grok Bot About line is at most 140 characters", about.length > 0 && [...about].length <= 140, `${[...about].length}: ${about}`);
  const matrix = existsSync(join(root, "demo/adapters/README.md")) ? readFileSync(join(root, "demo/adapters/README.md"), "utf8") : "";
  check("host matrix ships Grok Bot instead of an undefined row",
    /\| Grok Bot \|/.test(matrix) && !/GrokBot \| — \| not shipped/.test(matrix),
    matrix.split("\n").filter((l) => /Grok/.test(l)).join("\n"));
  rmSync(root, { recursive: true, force: true });
}

// 4. The real pack must not still teach that Grok Bot is undefined.
{
  const repo = join(dirname(BUILDER), "..");
  const banned = "GrokBot is undefined";
  const walk = (d) => readdirSync(d).flatMap((f) => {
    if (f === ".git" || f === "node_modules") return [];
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const hits = walk(repo).filter((p) => {
    if (p.endsWith("CHANGELOG.md") || p.endsWith("test-build-host-adapters.mjs")) return false;
    if (!/\.(md|mjs|json|yml|yaml)$/.test(p)) return false;
    return readFileSync(p, "utf8").includes(banned);
  });
  check("shipped files no longer say Grok Bot is undefined", hits.length === 0, hits.join("\n"));
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
