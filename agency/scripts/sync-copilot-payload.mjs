#!/usr/bin/env node
// sync-copilot-payload.mjs — keep adapters/copilot/.github/omatic/ identical to
// the canonical contracts. --check exits 1 if any vendored copy drifted.
//
// WHY THIS EXISTS. INSTALL.md tells the operator to copy
// `adapters/copilot/.github/` into a DIFFERENT repository's `.github/`. Once
// copied, no relative path back into this pack resolves — under any correction.
// The three agent files shipped `../../../../ROLE-CORE.md` for exactly that
// reason and it never resolved anywhere, in the pack or out of it (task #586).
//
// The fix is to make `.github/` self-contained: the contracts it loads travel
// with it, under `.github/omatic/`, referenced as `../omatic/<file>` — a path
// that resolves identically inside this pack and inside the target repository.
// Vendored copies drift, so they are generated, not hand-written, and this
// script is the control. Same pattern and same reason as sync-shared.mjs.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pack = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(pack, "adapters/copilot/.github/omatic");
const check = process.argv.includes("--check");

// [source, vendored name, rewrites applied to the vendored copy]
const FILES = [
  ["adapters/ROLE-CORE.md", "ROLE-CORE.md",
    [["`../contracts/CORE-KERNEL-CONTRACT.md`", "`./CORE-KERNEL-CONTRACT.md`"]]],
  ["contracts/ROLE-RUNTIME-CONTRACT.md", "ROLE-RUNTIME-CONTRACT.md",
    [["[CORE-KERNEL-CONTRACT.md](CORE-KERNEL-CONTRACT.md)", "[CORE-KERNEL-CONTRACT.md](./CORE-KERNEL-CONTRACT.md)"]]],
  ["contracts/CORE-KERNEL-CONTRACT.md", "CORE-KERNEL-CONTRACT.md", []],
];

const BANNER = (src) =>
  `<!-- GENERATED COPY — do not edit. Source: agency/${src}\n` +
  `     Regenerate with: node agency/scripts/sync-copilot-payload.mjs\n` +
  `     This copy exists so adapters/copilot/.github/ stays self-contained when\n` +
  `     it is copied into another repository. -->\n\n`;

mkdirSync(dest, { recursive: true });
let stale = 0, wrote = 0;
for (const [src, name, rewrites] of FILES) {
  let body = readFileSync(join(pack, src), "utf8");
  for (const [from, to] of rewrites) {
    if (!body.includes(from)) {
      console.error(`SOURCE CHANGED: ${src} no longer contains ${from}`);
      process.exit(2);
    }
    body = body.split(from).join(to);
  }
  const next = BANNER(src) + body;
  const target = join(dest, name);
  const cur = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (cur === next) { console.log(`ok:    ${name}`); continue; }
  stale++;
  if (check) console.log(`STALE: ${name}`);
  else { writeFileSync(target, next); wrote++; console.log(`sync:  ${name}`); }
}
if (check && stale) { console.log(`\n${stale} vendored copy(ies) stale — run without --check`); process.exit(1); }
console.log(check ? "\ncopilot payload in sync" : `\ndone — ${wrote} updated`);
