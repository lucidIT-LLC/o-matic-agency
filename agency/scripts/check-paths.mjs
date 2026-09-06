#!/usr/bin/env node
// check-paths.mjs — resolve every backticked relative file reference in the pack
// and exit 1 if any does not exist. Also simulates the Copilot install by
// copying adapters/copilot/.github/ to a scratch repository and re-resolving,
// because that adapter's references have to hold OUTSIDE this pack.
//
// Task #586 item 2: nine of twelve adapter agent files shipped a ROLE-CORE.md
// path that resolved nowhere, through three releases, because nothing checked.
import { readFileSync, readdirSync, statSync, lstatSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const pack = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Runtime/workspace paths and prose directory names, not pack file references.
const IGNORE = new Set([
  ".trash/", "archive/", "_omatic/", "factory/", "/Library/CloudStorage/",
  "agency/", ".github/", "agents/", "skills/", "contracts/", "evals/",
  ".claude-plugin", ".codex-plugin",
]);
const REF = /`((?:\.{1,2}\/)[A-Za-z0-9_.\/-]*(?:\.md|\.ya?ml|\.sql|\.mjs|\/))`/g;

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  if (f === ".git" || lstatSync(p).isSymbolicLink()) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});

function scan(root, label, skip = () => false) {
  let bad = 0, ok = 0;
  for (const f of walk(root)) {
    if (!/\.(md|ya?ml)$/.test(f) || f.endsWith("CHANGELOG.md") || skip(f)) continue;
    const text = readFileSync(f, "utf8").split("\n");
    text.forEach((line, i) => {
      for (const m of line.matchAll(REF)) {
        const ref = m[1];
        if (IGNORE.has(ref)) continue;
        const target = resolve(dirname(f), ref);
        let exists = true;
        try { statSync(target); } catch { exists = false; }
        if (exists) ok++;
        else { bad++; console.log(`BROKEN [${label}] ${relative(root, f)}:${i + 1}  \`${ref}\``); }
      }
    });
  }
  console.log(`[${label}] ${ok} resolve, ${bad} broken`);
  return bad;
}

// Dated audit records are historical evidence; they are not loaded at runtime.
let failures = scan(pack, "pack", (f) => f.includes(`${"/"}audits${"/"}`));

// The Copilot payload must resolve after being copied into another repository.
const scratch = mkdtempSync(join(tmpdir(), "omatic-copilot-"));
try {
  cpSync(join(pack, "adapters/copilot/.github"), join(scratch, ".github"), { recursive: true });
  failures += scan(scratch, "copilot-installed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures) { console.log(`\n${failures} broken reference(s)`); process.exit(1); }
console.log("\nall references resolve");
