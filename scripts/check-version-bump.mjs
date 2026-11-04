#!/usr/bin/env node
// Fails a PR whose content changed without a version bump.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const WARN = process.argv.includes('--warn');
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : 'origin/main';
if (!base || base.startsWith('--')) {
  console.error('FAIL check-version-bump: --base requires a ref');
  process.exit(2);
}
const git = c => execSync(`git ${c}`, { encoding: 'utf8' });
const show = (ref, f) => { try { return git(`show ${ref}:${f}`); } catch { return null; } };
const ver = s => (s?.match(/<!--\s*version:\s*([0-9][^\s|]*)/) || [])[1];
const semverGt = (a, b) => {
  const p = v => v.split(/[.-]/).slice(0, 3).map(Number);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
const changed = git(`diff --name-only ${base}...HEAD`).split('\n').filter(Boolean);
const errs = [];
const pack = fs.readdirSync('.').find(d => fs.existsSync(`${d}/.cursor-plugin/plugin.json`));
// 1. every changed skill folder bumps its SKILL.md version comment
const skillDirs = new Set(changed.map(f => (f.match(/^(?:[^/]+\/)?skills\/[^/]+/) || [])[0]).filter(Boolean));
for (const d of skillDirs) {
  const f = `${d}/SKILL.md`;
  const a = ver(show(base, f));
  const b = ver(show('HEAD', f));
  if (a && b && !semverGt(b, a)) errs.push(`${f}: content changed but version ${b} is not above ${a}`);
}
// 2. any shipped change bumps the pack version, and CHANGELOG names it
const shipped = changed.filter(f => f.startsWith(`${pack}/`) || f.startsWith('skills/') || f === 'gemini-extension.json');
if (shipped.length) {
  const mf = `${pack}/.cursor-plugin/plugin.json`;
  const headManifest = show('HEAD', mf);
  if (!headManifest) errs.push(`${mf}: missing on HEAD`);
  else {
    const a = JSON.parse(show(base, mf) || '{}').version;
    const b = JSON.parse(headManifest).version;
    if (a && !semverGt(b, a)) errs.push(`${mf}: shipped files changed but pack version ${b} is not above ${a}`);
    const changelog = `${pack}/CHANGELOG.md`;
    if (!fs.existsSync(changelog)) errs.push(`${changelog}: missing`);
    else if (!new RegExp(`^##.*\\b${String(b).replace(/\./g, '\\.')}\\b`, 'm').test(fs.readFileSync(changelog, 'utf8')))
      errs.push(`${changelog}: no entry for ${b}`);
  }
}
for (const e of errs) console.log((WARN ? 'warn ' : 'FAIL ') + e);
if (!errs.length) console.log(`PASS: version bump against ${base}`);
process.exit(errs.length && !WARN ? 1 : 0);
