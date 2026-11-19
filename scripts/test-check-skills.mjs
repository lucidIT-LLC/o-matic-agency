#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'agency-skill-shape-'));
const script = resolve('scripts/check-skills.mjs');
const write = (p, s) => { const f = join(dir, p); mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s); };
const run = () => spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
const front = '---\nname: demo\ndescription: Demo\n---\n';
const headings = '## Host notes\n### Cursor\n### Claude\n### Grok Bot\n### Microsoft 365 Copilot\n';
try {
  write('agency/.cursor-plugin/plugin.json', '{}');
  write('skill-budget.json', JSON.stringify({ chars: {}, lanes: [] }));
  write('agency/skills/demo/SKILL.md', front + 'Lean persona.\n');
  assert.notEqual(run().status, 0, 'persona without a root counterpart must not skip host notes');
  write('skills/demo/SKILL.md', front + headings);
  assert.equal(run().status, 0, 'lean persona with valid root host skill should pass');
  write('skills/demo/SKILL.md', front + 'Missing host contract.\n');
  assert.notEqual(run().status, 0, 'root counterpart must still contain all host headings');
  write('skills/demo/SKILL.md', front + headings.replace('### Claude\n', ''));
  assert.notEqual(run().status, 0, 'individual missing host headings remain errors');
  console.log('PASS: persona and root host skill checks');
} finally { rmSync(dir, { recursive: true, force: true }); }
