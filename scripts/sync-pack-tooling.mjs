#!/usr/bin/env node
// sync-pack-tooling.mjs — one canonical copy of the pack tooling, pushed into
// the sibling pack repositories. --check exits 1 if any copy drifted or is missing.
//
// Smith #1013 F12: verify-pack.mjs existed as four copies in three variants,
// spirit-gate-check.mjs as four copies, check-paths.mjs and
// sync-copilot-payload.mjs as three variants each, and verify-adapter-paths.mjs
// in two packs but not the third. Hand-kept copies drift; that is how the corpus
// forked in the first place (decision #359). o-matic-studio holds the source;
// o-matic-firm and o-matic-agency get byte-identical generated copies;
// o-matic-supply gets only the files in SUPPLY_ALLOWED (see TARGETS). Each
// script that needs to know which pack it is in reads that from its own
// location, so no copy is edited per pack.
//
// This runs on a maintainer's machine with the sibling repos checked out beside
// this one (a CI runner has only one repo). Run it, commit each repo.
//
// Usage: node scripts/sync-pack-tooling.mjs [--check] [--repos <dir>]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const ri = args.indexOf("--repos");
const reposDir = ri >= 0 ? resolve(args[ri + 1]) : resolve(here, "..");

// [path in o-matic-studio, path in target] — "<plugin>" is the target's plugin dir.
const FILES = [
  ["scripts/verify-pack.mjs", "scripts/verify-pack.mjs"],
  ["scripts/verify-identity-attestation.mjs", "scripts/verify-identity-attestation.mjs"],
  ["scripts/spirit-gate-check.mjs", "scripts/spirit-gate-check.mjs"],
  ["scripts/build-host-adapters.mjs", "scripts/build-host-adapters.mjs"],
  ["scripts/test-build-host-adapters.mjs", "scripts/test-build-host-adapters.mjs"],
  ["scripts/check-no-private-servers.mjs", "scripts/check-no-private-servers.mjs"],
  ["scripts/persona-attest-export.sql", "scripts/persona-attest-export.sql"],
  ["scripts/retired-kb.json", "scripts/retired-kb.json"],
  ["build-ollama-modelfile.mjs", "build-ollama-modelfile.mjs"],
  [".github/workflows/verify-pack.yml", ".github/workflows/verify-pack.yml"],
  ["studio/scripts/check-paths.mjs", "<plugin>/scripts/check-paths.mjs"],
  ["studio/scripts/sync-copilot-payload.mjs", "<plugin>/scripts/sync-copilot-payload.mjs"],
  ["scripts/build-m365-packages.mjs", "scripts/build-m365-packages.mjs"],
  ["scripts/verify-m365.mjs", "scripts/verify-m365.mjs"],
  ["scripts/m365-schemas/declarative-agent-1.9.json", "scripts/m365-schemas/declarative-agent-1.9.json"],
  ["scripts/m365-schemas/plugin-2.4.json", "scripts/m365-schemas/plugin-2.4.json"],
  ["scripts/m365-schemas/teams-1.30.json", "scripts/m365-schemas/teams-1.30.json"],
  ["scripts/check-skills.mjs", "scripts/check-skills.mjs"],
  ["scripts/check-version-bump.mjs", "scripts/check-version-bump.mjs"],
  // The public-gate lists under .github/public-gate/ are per repo and are not synced.
  ["scripts/public-gate/**", "scripts/public-gate/**"],
];
// A target without `files` gets every entry above. A target WITH `files` gets
// only those destinations (task #1052, Smith-style pre-mortem 2026-10-09):
// o-matic-supply is tools, not people. It has no agent-pack.json, so it takes no
// builder, and it has its own verify-pack.mjs (MCP manifests, placeholder
// allowlist, dist freshness: ~200 lines differ, legitimately) and its own CI
// workflow. Its spirit-gate-check.mjs is an older, different script (hardcoded
// tenant, connection found by database name) and stays forked until someone
// reconciles it against a live server. Only the scanner is byte-identical.
const SUPPLY_ALLOWED = ["scripts/check-no-private-servers.mjs"];
const NEVER_SYNC_TO_SUPPLY = [
  "scripts/verify-pack.mjs", ".github/workflows/verify-pack.yml", "scripts/spirit-gate-check.mjs",
  "scripts/build-host-adapters.mjs", "scripts/test-build-host-adapters.mjs", "scripts/verify-identity-attestation.mjs",
];
for (const f of SUPPLY_ALLOWED) {
  if (NEVER_SYNC_TO_SUPPLY.includes(f)) throw new Error(`${f} must never be synced into o-matic-supply`);
  if (!FILES.some(([, dst]) => dst === f)) throw new Error(`${f} is not a synced file`);
}
const TARGETS = [
  { repo: "o-matic-firm", plugin: "firm" },
  { repo: "o-matic-agency", plugin: "agency" },
  { repo: "o-matic-supply", plugin: null, files: SUPPLY_ALLOWED },
];

const walkFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walkFiles(p) : [p];
});
// "scripts/public-gate/**" copies the tree. A listed destination that is not
// expanded stays a single file. Supply's allowlist matches the unexpanded dest.
const expand = (src, dst) => {
  if (!src.endsWith("/**")) return [[src, dst]];
  const srcDir = src.slice(0, -3);
  const dstDir = dst.endsWith("/**") ? dst.slice(0, -3) : dst;
  if (!existsSync(join(here, srcDir))) throw new Error(`missing sync tree ${src}`);
  return walkFiles(join(here, srcDir)).map((abs) => {
    const rel = relative(join(here, srcDir), abs);
    return [join(srcDir, rel), join(dstDir, rel)];
  });
};
const FILE_LIST = FILES.flatMap(([src, dst]) => expand(src, dst));

let stale = 0, wrote = 0;
for (const t of TARGETS) {
  const troot = join(reposDir, t.repo);
  if (!existsSync(troot)) { console.log(`MISSING REPO: ${troot}`); stale++; continue; }
  for (const [src, dst] of FILE_LIST.filter(([, d]) => !t.files || t.files.includes(d))) {
    const body = readFileSync(join(here, src), "utf8");
    const out = join(troot, dst.replace("<plugin>", t.plugin));
    const cur = existsSync(out) ? readFileSync(out, "utf8") : null;
    const rel = `${t.repo}/${dst.replace("<plugin>", t.plugin)}`;
    if (cur === body) { console.log(`ok:    ${rel}`); continue; }
    stale++;
    if (check) console.log(`${cur === null ? "MISSING" : "STALE"}: ${rel}`);
    else { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, body); wrote++; console.log(`sync:  ${rel}`); }
  }
}
if (check && stale) { console.log(`\n${stale} copy(ies) stale or missing — run without --check`); process.exit(1); }
console.log(check ? "\nall pack tooling in sync" : `\ndone — ${wrote} written`);
