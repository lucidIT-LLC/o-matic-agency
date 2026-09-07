#!/usr/bin/env node
// run-conformance.mjs — grade the o-MATIC core-role conformance suite.
//
// Two modes.
//   (default)  grade every fixture in the suite. Each case ships a pass_fixture
//              that MUST grade `pass` and a fail_variant that MUST grade `fail`.
//              This proves the grader discriminates. A suite that has never
//              returned `fail` has not been shown to work — and a grader that
//              only ever returns `fail` is the same defect wearing the other
//              mask, which is why both directions are checked.
//   --list     print the stimuli, observables, and baselines for a live run
//              against a real host.
//   --armor    regression guard for task #612. Re-grade every fixture dressed
//              in markdown and assert no verdict moves. See the block below.
//
// Task #586 item 5 / audit_id 8 EVAL-CRITIQUE: version 1 of the suite was
// twelve prose assertions with no stimulus, observable, pass criterion, or
// negative test. Decision #226's unfalsifiable-success defect, reproduced
// inside the instrument built to detect it.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
let yaml;
try { yaml = createRequire(import.meta.url)("js-yaml"); }
catch { console.error("js-yaml missing. Run: npm install --prefix agency/evals"); process.exit(2); }

const suite = yaml.load(readFileSync(join(here, "core-role-conformance.yaml"), "utf8"));
const listOnly = process.argv.includes("--list");
const armorMode = process.argv.includes("--armor");

if (listOnly) {
  console.log(`${suite.contract} — ${suite.cases.length} cases\n`);
  for (const c of suite.cases) {
    console.log(`## ${c.id}  [${c.role}]`);
    console.log(`observable: ${c.observable}${c.baseline ? `   baseline: ${c.baseline}` : ""}`);
    const st = c.stimulus ?? Object.entries(c.per_role_stimulus ?? {}).map(([r, s]) => `(${r}) ${s}`).join("");
    console.log(`stimulus:\n${String(st).trim().split("\n").map((l) => "    " + l).join("\n")}\n`);
  }
  process.exit(0);
}

// ---------------------------------------------------------------- grader ---
// A fixture is { transcript, deliverable?, tool_calls?, db_row_changed?,
// files_after? }. The grader returns pass|fail plus the reasons it failed.
function grade(c, fx) {
  const g = c.grader ?? {};
  // Line wrapping is a terminal artifact, not behavior. Collapse whitespace
  // before matching so a pattern cannot pass or fail on where a line broke.
  //
  // Markdown formatting is the same class, and task #612 / audit_id 18 proved
  // it: probot wrote "a fresh `startup`" with a code-span, and the backtick
  // broke the contiguous literal in /(fresh|live) startup/. The identical
  // transcript with backticks stripped graded pass. A role that writes
  // `startup` in code, **operator** in bold, or either one bare is behaving
  // identically — the marker is presentation, not conduct — so strip ` and *
  // here rather than patching one regex and leaving the class open.
  //
  // Underscore is stripped ONLY where markdown uses it for emphasis, i.e. not
  // between two alphanumerics. An intraword underscore is part of an
  // identifier, and these graders legitimately match on identifiers:
  // verified_live, available_unmeasured, seq_scan, red_condition, factory_id,
  // current_database, notify_slack, read_write. Stripping those would break
  // the instrument in the name of repairing it.
  //
  // Whitespace is NOT re-collapsed after stripping: case
  // startup-uses-wire-connection-name asserts the literal "o-MATIC  - Corp",
  // hyphen and TWO spaces, and collapsing runs would delete that evidence.
  const flat = (s) =>
    String(s ?? "")
      .replace(/[ \t]*\r?\n[ \t]*/g, " ")
      .replace(/[`*]/g, "")
      .replace(/(?<![0-9A-Za-z])_+|_+(?![0-9A-Za-z])/g, "")
      .trim();
  const t = flat(fx.transcript);
  const reasons = [];
  // Translate leading inline flags — (?i), (?s), (?is) — into JS RegExp flags.
  // JS has no inline flag syntax, and a pattern written with one silently
  // throws rather than mismatching, which is its own small mercy.
  const rx = (p) => {
    const m = /^\((\?[ismux]+)\)/.exec(p);
    if (!m) return new RegExp(p);
    return new RegExp(p.slice(m[0].length), m[1].slice(1).replace(/[ux]/g, ""));
  };

  for (const p of g.transcript_must_match ?? [])
    if (!rx(p).test(t)) reasons.push(`transcript missing /${p}/`);
  for (const p of g.transcript_must_not_match ?? [])
    if (rx(p).test(t)) reasons.push(`transcript matches forbidden /${p}/`);

  if (g.deliverable_must_match) {
    const d = flat(fx.deliverable);
    for (const p of g.deliverable_must_match)
      if (!rx(p).test(d)) reasons.push(`deliverable missing /${p}/`);
  }
  for (const term of g.taxonomy_terms_required ?? [])
    if (!t.includes(term)) reasons.push(`taxonomy term absent: ${term}`);

  if (fx.tool_calls) {
    if (g.first_tool_call_must_be_one_of &&
        !g.first_tool_call_must_be_one_of.includes(fx.tool_calls[0]))
      reasons.push(`first tool call ${fx.tool_calls[0] ?? "(none)"} not in ${g.first_tool_call_must_be_one_of.join("|")}`);
    if (g.required_tool_call && !fx.tool_calls.includes(g.required_tool_call))
      reasons.push(`required tool call absent: ${g.required_tool_call}`);
    if (g.max_tool_calls && fx.tool_calls.length > g.max_tool_calls)
      reasons.push(`${fx.tool_calls.length} tool calls exceeds max ${g.max_tool_calls}`);
    if (g.forbidden_repeat_tool) {
      const n = fx.tool_calls.filter((x) => x === g.forbidden_repeat_tool).length;
      if (n > 1) reasons.push(`${g.forbidden_repeat_tool} retried ${n} times`);
    }
    for (const p of g.forbidden_tool_call_prefixes ?? [])
      if (fx.tool_calls.some((x) => x.includes(p))) reasons.push(`forbidden tool call: ${p}`);
  }

  if (g.db_row_must_be_unchanged !== undefined && fx.db_row_changed === true)
    reasons.push(`persistent change observed on ${g.db_row_must_be_unchanged === true ? "the guarded row" : g.db_row_must_be_unchanged}`);

  if (g.path_must_exist_after && fx.files_after &&
      !fx.files_after.includes("retained"))
    reasons.push("prior bytes not readable at a named retained path after the operation");

  return { verdict: reasons.length ? "fail" : "pass", reasons };
}

// ----------------------------------------------------------- armor mode ---
// The regression guard for task #612 / audit_id 18. It dresses every fixture
// in markdown — one marker per whitespace-separated token, rotating through
// code span, italic, bold and underscore emphasis — and re-grades it.
//
// Formatting is presentation, not conduct, so NO VERDICT MAY MOVE: every
// pass_fixture must still pass and every fail_variant must still fail. Both
// directions are asserted, because a normalizer that let a fail_variant leak
// to pass would be buying immunity with discrimination, which is the trade
// this suite exists to refuse.
//
// Measured 2026-09-06 on the pre-1.4.7 flat(): NINE of sixteen conformant
// pass_fixtures failed under armor. That is the class of defect #603 was
// graded on — probot wrote "a fresh `startup`" and the backtick broke the
// literal. Run this after any change to flat() or to a grader pattern.
if (armorMode) {
  const marks = ["`", "*", "**", "_"];
  let n = 0;
  const armor = (s) =>
    s == null ? s : String(s).split(/(\s+)/).map((tok) => {
      if (!/\S/.test(tok)) return tok;
      const m = marks[n++ % marks.length];
      return m + tok + m;
    }).join("");

  let moved = 0;
  console.log(`${suite.contract} — ${suite.cases.length} cases re-graded under markdown armor\n`);
  for (const c of suite.cases) {
    const rows = [];
    for (const [label, fx, want] of [
      ["pass_fixture", c.pass_fixture, "pass"],
      ["fail_variant", c.fail_variant, "fail"],
    ]) {
      if (!fx) { rows.push([label, "MISSING", "-"]); moved++; continue; }
      const expect = fx.expect ?? want;
      const r = grade(c, { ...fx, transcript: armor(fx.transcript), deliverable: armor(fx.deliverable) });
      const ok = r.verdict === expect;
      if (!ok) moved++;
      rows.push([label, r.verdict, ok ? "held" : `MOVED — wanted ${expect}`]);
    }
    const bad = rows.some((r) => r[2] !== "held");
    console.log(`${bad ? "✘" : "✔"} ${c.id}  [${c.role}]`);
    for (const [label, verdict, note] of rows)
      console.log(`    ${label.padEnd(13)} -> ${String(verdict).padEnd(7)} ${note}`);
  }
  console.log(
    moved
      ? `\n✘ ${moved} verdict(s) moved under markdown armor — the grader is reading formatting as behavior.`
      : `\n✔ ${suite.cases.length} cases. No verdict moved under markdown armor: every pass_fixture still passes and every fail_variant still fails.`
  );
  process.exit(moved ? 1 : 0);
}

// ------------------------------------------------------------------- run ---
let broken = 0;
console.log(`${suite.contract} — grading ${suite.cases.length} cases, both directions\n`);
for (const c of suite.cases) {
  const rows = [];
  for (const [label, fx, want] of [
    ["pass_fixture", c.pass_fixture, "pass"],
    ["fail_variant", c.fail_variant, "fail"],
  ]) {
    if (!fx) { rows.push([label, "MISSING", "-", ["case ships no " + label]]); broken++; continue; }
    const r = grade(c, fx);
    const ok = r.verdict === (fx.expect ?? want);
    if (!ok) broken++;
    rows.push([label, r.verdict, ok ? "OK" : "SUITE DEFECT", r.reasons]);
  }
  const worst = rows.some((r) => r[2] === "SUITE DEFECT" || r[1] === "MISSING");
  console.log(`${worst ? "✘" : "✔"} ${c.id}  [${c.role}]`);
  for (const [label, verdict, ok, reasons] of rows) {
    console.log(`    ${label.padEnd(13)} -> ${String(verdict).padEnd(7)} ${ok}`);
    if (verdict === "fail") for (const r of reasons) console.log(`        · ${r}`);
  }
}

console.log(
  broken
    ? `\n✘ ${broken} suite defect(s): a fixture did not grade the way the case says it must.`
    : `\n✔ ${suite.cases.length} cases. Every pass_fixture graded pass and every fail_variant graded fail — the suite is demonstrably capable of returning fail.`
);
process.exit(broken ? 1 : 0);
