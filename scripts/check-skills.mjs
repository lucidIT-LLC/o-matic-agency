#!/usr/bin/env node
// Skill shape gate: size, lines, description, variant stubs, host notes, links.
// Report-only with --warn (exit 0). Enforcing exits 1 when any check fails.
//
// Budget file: the spec names scripts/skill-budget.json. This repo's token
// baselines live in skill-budget.json at the repo root (build-host-adapters.mjs).
// That file is read when it exists.
import fs from 'node:fs';
import path from 'node:path';

const WARN = process.argv.includes('--warn');
const root = process.cwd();
const budgetPath = fs.existsSync('skill-budget.json') ? 'skill-budget.json' : 'scripts/skill-budget.json';
const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
const LIMIT = { bodyChars: 20000, target: 16000, lines: 500, desc: 600, stubBody: 1500 };
const pack = fs.readdirSync(root).find(d => fs.existsSync(path.join(d, '.cursor-plugin/plugin.json')));
const dirs = [path.join(pack, 'skills'), 'skills'].filter(d => fs.existsSync(d));
const errs = [];
const isVariant = n => /^(cursor|grok|m365)-/.test(n);

// The spec's one-line description match misses YAML folded scalars (`>-`),
// which would hide a stub that still carries triggers. Read the whole value.
function descriptionOf(frontmatter) {
  const lines = frontmatter.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^description:\s*(.*)$/);
    if (!m) continue;
    const rest = m[1].trim();
    if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-' || rest === '') {
      const acc = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\S/.test(lines[j])) break;
        acc.push(lines[j].trim());
      }
      return acc.join(rest.startsWith('|') ? '\n' : ' ').trim();
    }
    if ((rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'"))) {
      return rest.slice(1, -1);
    }
    return rest;
  }
  return '';
}

for (const d of dirs) for (const name of fs.readdirSync(d)) {
  const f = path.join(d, name, 'SKILL.md');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) { errs.push(`${f}: no frontmatter`); continue; }
  const body = src.slice(m[0].length);
  const lines = src.split('\n').length;
  const desc = descriptionOf(m[1]);
  if (lines > LIMIT.lines) errs.push(`${f}: ${lines} lines > ${LIMIT.lines}`);
  if (body.length > LIMIT.bodyChars) errs.push(`${f}: body ${body.length} chars > ${LIMIT.bodyChars} (M365 hard limit)`);
  if (desc.length > LIMIT.desc) errs.push(`${f}: description ${desc.length} > ${LIMIT.desc}`);
  if (isVariant(name)) {
    if (/trigger/i.test(desc)) errs.push(`${f}: deprecated stub description carries triggers`);
    if (body.length > LIMIT.stubBody) errs.push(`${f}: stub body ${body.length} > ${LIMIT.stubBody}`);
  } else {
    const cap = budget.chars?.[name] ?? LIMIT.target;
    if (body.length > cap) errs.push(`${f}: body ${body.length} > budget ${cap}`);
    if (!budget.lanes?.includes(name)) {
      for (const h of ['## Host notes', '### Cursor', '### Claude', '### Grok Bot', '### Microsoft 365 Copilot']) {
        if (!body.includes(h)) errs.push(`${f}: missing "${h}"`);
      }
    }
    if (/^#+\s*(changelog|history)\b/im.test(body)) errs.push(`${f}: history section in body`);
  }
  for (const [, href] of body.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(href)) continue;
    if (href.includes('../')) errs.push(`${f}: "../" link ${href}`);
    else if (!fs.existsSync(path.join(path.dirname(f), href))) errs.push(`${f}: dead link ${href}`);
  }
}
for (const e of errs) console.log((WARN ? 'warn ' : 'FAIL ') + e);
if (WARN && errs.length) console.log(`warn: ${errs.length} skill-shape finding(s) (report-only)`);
else if (!errs.length) console.log('PASS: skill shape');
process.exit(errs.length && !WARN ? 1 : 0);
