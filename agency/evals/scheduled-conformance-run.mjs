#!/usr/bin/env node
// scheduled-conformance-run.mjs — unattended daily replay of the core-role
// conformance suite, task #613.
//
// WHY THIS EXISTS. KR4-same-result-three-times ("the same task, run three times
// on three separate days, returns the same result") grades RED at 19 of 19. Not
// one of the 19 fails on disagreement. Every one fails on the THREE SEPARATE
// DAYS clause: the suite has been replayed four times (roster_audit_log
// audit_id 8, 11, 15, 16) and all 47 graded runs landed on 2026-09-06. KR4's
// own row names the missing piece exactly — "the suite must actually be RUN on
// separate days by something — no scheduler exists today, which is the single
// thing standing between this row and a real reading." This is that something.
//
// WHAT IT RUNS, AND WHAT IT DELIBERATELY DOES NOT.
// It runs the two-sided FIXTURE SELF-TEST: every pass_fixture must grade pass
// and every fail_variant must grade fail. That is deterministic, offline, and
// touches no live role and no production row — which is the only thing that can
// honestly run unattended on this host. It is NOT a live role run. A live run
// needs the eval-conformance read_only credential (task #616's preflight) and a
// driver that puts stimuli to roles; neither exists here.
//
// ==> THE AUDIT_KIND IS DELIBERATELY OUTSIDE KR4's PATTERN. <==
// KR4's stored measuring_sql draws its universe from
//   audit_kind LIKE 'core-role-conformance%'
// and this job writes 'conformance-selftest-scheduled', which does not match.
// That is a choice, not an oversight, and it is the one decision in this file
// worth arguing with. Three days of identical grading of CANNED TRANSCRIPTS is
// trivially reproducible and says nothing about whether the ROLES reproduce.
// Enrolling it would drive KR4 to a green that means "the grader is stable",
// while the register would read it as "the factory's work reproduces." That is
// the vacuous green KR4's own row was written to forbid, and buying it with a
// prefix change would be weakening a check to obtain a green result.
// An operator who disagrees changes ONE string, below. It is not mine to change.
//
// Rows still land in factory.roster_audit_log — the same audit surface the KR4
// instrument reads — in the same findings shape (role, id, verdict), so the day
// KR4 is fed by real live runs the history is already there and already dated.
//
// GUARANTEES. Idempotent and at most once per calendar day (America/New_York,
// matching the instrument's own AT TIME ZONE). A stamp file is written only
// after the audit row is confirmed inserted, so a failed run retries tomorrow
// rather than silently consuming the day. No credential at rest in the plist:
// the bearer token is read from ~/.claude/settings.json (mode 0600) at run time
// and reaches the governed o-MATIC Server MCP surface only. No direct database
// connection, no psql, no credential collection.
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE       = dirname(fileURLToPath(import.meta.url));
const AUDIT_KIND = "conformance-selftest-scheduled";   // <-- the one string. See above.
const STATE_DIR  = join(homedir(), ".local", "state", "omatic", "conformance");
const LOG        = join(homedir(), "Library", "Logs", "omatic-conformance.log");
const SETTINGS   = join(homedir(), ".claude", "settings.json");

const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const stamp = join(STATE_DIR, `${day}.done`);
const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}\n`;
  process.stdout.write(line);
  try { appendFileSync(LOG, line); } catch {}
};

mkdirSync(STATE_DIR, { recursive: true });
if (existsSync(stamp)) { log(`already ran for ${day} — nothing to do (idempotent no-op)`); process.exit(0); }

// ---- 1. run the suite. Exit 1 is a real verdict, not a crash; only 2/3 are. --
let out = "", suiteExit = 0;
try {
  out = execFileSync(process.execPath, [join(HERE, "run-conformance.mjs")],
                     { cwd: HERE, encoding: "utf8" });
} catch (e) {
  suiteExit = e.status ?? 99;
  out = (e.stdout ?? "") + (e.stderr ?? "");
  if (suiteExit !== 1) { log(`suite could not run (exit ${suiteExit}):\n${out}`); process.exit(2); }
}

// ---- 2. per-case verdicts, in the findings shape audit_id 8/11/15/16 use ----
// Case lines look like:  "✔ startup-wire-resolution  [probot]"
const findings = [];
for (const m of out.matchAll(/^([✔✘])\s+(\S+)\s+\[(\w+)\]$/gm))
  findings.push({ id: m[2], role: m[3], verdict: m[1] === "✔" ? "pass" : "fail",
                  class: "selftest",
                  detail: "Two-sided fixture self-test: pass_fixture graded pass and " +
                          "fail_variant graded fail. Not a live role run." });
if (!findings.length) { log(`no case lines parsed from suite output — refusing to write an empty audit row:\n${out}`); process.exit(2); }
const failed = findings.filter(f => f.verdict === "fail").length;
// roster_audit_log_status_check admits only pass | partial | blocked. "verified"
// was never a legal value; the defect was masked for weeks because every run was
// refused earlier, at the session-startup gate (measured 2026-09-28, task #1013).
const status = failed ? "blocked" : "pass";
log(`${day}: ${findings.length} cases, ${failed} failing, suite exit ${suiteExit}, status ${status}`);

// ---- 3. write it through the governed o-MATIC Server MCP surface ------------
// Smith #1013 F2/F6/F8/F17 (2026-09-28): no connection name, server URL or
// tenant is written into this file. The connection is read off the wire (the
// granted connection whose database is `o-matic`), the tenant from the startup
// card that connection returns, and the URL from OMATIC_MCP_URL. A hardcoded
// "o-MATIC  - Corp" made the daily recorder get refused after the rename and
// lose the day's evidence; that is the failure this section removes.
let settingsEnv = {};
try { settingsEnv = JSON.parse(readFileSync(SETTINGS, "utf8"))?.env ?? {}; }
catch { settingsEnv = {}; }   // F17: an unreadable settings.json is "no token", not a crash
const token = process.env.OMATIC_MCP_TOKEN ?? settingsEnv.OMATIC_MCP_TOKEN;
const url = process.env.OMATIC_MCP_URL ?? settingsEnv.OMATIC_MCP_URL;
if (!token || !url) { log("OMATIC_MCP_TOKEN and OMATIC_MCP_URL are required (env or ~/.claude/settings.json) — cannot record the run"); process.exit(3); }

let sessionId = null;
const rpc = async (method, params) => {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream" };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const res = await fetch(url, { method: "POST", headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }) });
  const sid = res.headers.get("Mcp-Session-Id"); if (sid) sessionId = sid;
  const body = await res.json().catch(() => null);
  return { http: res.status, ok: res.ok && !body?.error && !body?.result?.isError, body };
};
const tool = async (name, args) => {
  const r = await rpc("tools/call", { name, arguments: args });
  return { ...r, data: r.body?.result?.structuredContent,
           text: r.body?.result?.content?.[0]?.text ?? JSON.stringify(r.body) };
};
await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {},
                          clientInfo: { name: "omatic-conformance-daily", version: "2.0.0" } });
const discover = await tool("startup", {});
const conn = (discover.data?.granted ?? []).find((g) => g.database === "o-matic");
if (!conn) { log("the o-matic administration connection (database == 'o-matic') is not granted to this client — a refusal, not an empty result"); process.exit(4); }
const started = await tool("startup", { connection: conn.name });
const TENANT = started.data?.card?.tenant_id;
if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(TENANT ?? "")) { log("startup card declared no usable tenant_id — refusing to guess one"); process.exit(4); }

const digest = execFileSync("/usr/bin/shasum", ["-a", "256", join(HERE, "core-role-conformance.yaml")],
                            { encoding: "utf8" }).split(" ")[0];
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
// One statement. No transaction wrapper — see MIGRATIONS.md, task #614.
// The guard makes it idempotent at the database as well as at the stamp file:
// a second insert on the same calendar day writes nothing.
const sql = `
INSERT INTO factory.roster_audit_log
  (tenant_id, audit_scope, audit_kind, standards_checked, findings,
   overall_status, contract_digest, audited_by)
SELECT ${q(TENANT)}, ARRAY['probot','fred','data']::text[], ${q(AUDIT_KIND)},
       ${q(JSON.stringify([`core-role-conformance.yaml (${findings.length} cases)`,
                           "mode: two-sided fixture self-test, not a live role run",
                           `scheduler: com.omatic.conformance-daily, day ${day}`]))}::jsonb,
       ${q(JSON.stringify(findings))}::jsonb,
       ${q(status)}, ${q("sha256:" + digest)},
       ${q("scheduled runner com.omatic.conformance-daily (task #613)")}
WHERE NOT EXISTS (
  SELECT 1 FROM factory.roster_audit_log
   WHERE tenant_id = ${q(TENANT)} AND audit_kind = ${q(AUDIT_KIND)}
     AND (audited_at AT TIME ZONE 'America/New_York')::date = ${q(day)}::date)
RETURNING audit_id, audited_at`.trim();

// factory_busy is TRANSIENT, not a refusal: another session holds a work claim
// and the server is protecting it. An unattended job that treats that as the
// day's answer loses the day, which is the one thing this job exists to stop.
// So: bounded backoff, and the day is only stamped on a real result. A genuine
// refusal (grant, permission, SQLSTATE) is NOT retried — it exits and the next
// calendar day tries again.
const post = async () => {
  const r = await tool("factory_query", { connection: conn.name, sql });
  return { ok: r.ok, http: r.http, text: r.text };
};
let r = await post();
for (let attempt = 1; !r.ok && /factory_busy|another session holds/i.test(r.text) && attempt <= 10; attempt++) {
  const wait = Math.min(60, 5 * attempt) * 1000;
  log(`factory_busy — another session holds a claim; retry ${attempt}/10 in ${wait / 1000}s`);
  await new Promise((s) => setTimeout(s, wait));
  r = await post();
}
if (!r.ok) { log(`audit write REFUSED (HTTP ${r.http}): ${r.text}`); process.exit(4); }
log(`audit row: ${r.text}`);

writeFileSync(stamp, `${new Date().toISOString()} ${status} ${findings.length} cases, ${failed} failing\n`);
log(`stamped ${stamp}`);
process.exit(0);
