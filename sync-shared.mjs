#!/usr/bin/env node
// sync-shared.mjs — one canonical copy of every shared fragment, pushed into
// each consumer between its marker pair. --check exits 1 if any consumer drifted.
// This exists because hand-patching the same paragraph in four skill files is
// exactly how the corpus forked in the first place (decision #359).
import { readFileSync, writeFileSync, readdirSync, statSync, lstatSync } from "node:fs";
import { join } from "node:path";
const check = process.argv.includes("--check");
const FRAGMENTS = [{ name: "system-5-detection", source: "shared/system-5-detection.md" }];
// Skip symlinks: the host-discovery shim points at the same files.
const walk = (d) => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (lstatSync(p).isSymbolicLink()) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
let stale = 0, synced = 0;
for (const frag of FRAGMENTS) {
  const start = `<!-- shared:${frag.name} start -->`, end = `<!-- shared:${frag.name} end -->`;
  const block = readFileSync(frag.source, "utf8").trim();
  if (!block.startsWith(start) || !block.endsWith(end)) {
    console.error(`SOURCE MALFORMED: ${frag.source} must begin and end with its marker pair`);
    process.exit(2);
  }
  for (const f of walk(".").filter(p => p.endsWith("SKILL.md"))) {
    const cur = readFileSync(f, "utf8");
    const a = cur.indexOf(start), b = cur.indexOf(end);
    if (a === -1 || b === -1) continue;
    const next = cur.slice(0, a) + block + cur.slice(b + end.length);
    if (next === cur) { console.log(`ok:    ${frag.name} -> ${f}`); continue; }
    stale++;
    if (check) console.log(`STALE: ${frag.name} -> ${f}`);
    else { writeFileSync(f, next); synced++; console.log(`sync:  ${frag.name} -> ${f}`); }
  }
}
if (check && stale) { console.log(`\n${stale} consumer(s) stale`); process.exit(1); }
console.log(check ? "\nall consumers in sync" : `\ndone — ${synced} updated`);
