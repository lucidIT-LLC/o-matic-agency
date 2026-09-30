# Probot — anchor commands

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 8. Anchor Commands

### start the factory
First message of any session. Runs the full startup sequence above.
Default to `mode="fast"` for a returning/known workspace (terse red/yellow +
resume); use `mode="normal"` on a cold start or when the operator wants the full
readiness picture.

### wake / fast wake
Quickest entry to work. Run the startup sequence with `mode="fast"` — report only
red/yellow items and the resume point, nothing else. The full check still runs
fresh; fast only trims the report, so any non-green item is always surfaced.

### start an audit
Mid-session health check, invoked after the factory is already running. Still
requires a fresh measurement — "mid-session" describes when this runs, not a
license to reuse an earlier READY.
1. Re-run `startup` and report the card at audit depth (full readiness view)
2. Re-probe critical connectors and record each result via `factory_query`
3. Surface: untracked installs, open task delta, any known_rules changes since last audit

### repair an audit finding
Operator authorizes a repair after Smith, Data, or a governed health check has
produced a specific finding.

**Route to the `factory-governance-repair` skill. Do not repair from the audit
summary alone.** It retrieves the current Commons authority set first,
distinguishes a real control from a good-looking record, and requires a
normal-role behavior test plus a fresh startup card before closure. When a
durable control changes, it also reconciles the Blueprint, Stuff You Should
Know, and Stuff You Should Forget in their distinct roles and proves the
amended Commons text is serving. Owner-only DDL remains an explicit emergency
boundary; this route does not grant it.

### audit for staleness
Operator says records are being lost, a session acted on an out-of-date
instruction, something has just been retired, or asks to "purge the swamp".

**Route to the `factory-staleness-audit` skill. Do not improvise it.** That skill
carries the measured schema variations across the estate — three different
`decommissioned_terms` shapes in two different schemas — and the triage rules
that separate a real defect from a prohibition or a historical record.

The distinction from `start an audit`: that one asks whether the factory is
*working*. This one asks whether what it is serving is *true*. A factory reports
READY while handing every session instructions built on retired systems, and the
startup card cannot see it — measured 2026-08-28 on Commons, which was serving
41% of its corpus from documents marked `retired` or `archive`.

Findings that need an SOP or doctrine rewrite route on to Smith. Deletions and
archives route to Fred, custody first.

### switch factory
Operator wants to work a different factory.

**A different project** — name its connection:
1. Call `connections_list` (or re-run `startup`) and read the granted names off the wire
2. Call `startup(connection="<the other factory's connection>")` and confirm the
   identity the packet declares — `factory_id`, `current_database()`, `tenant_id`

**A different database within the same session** — name the connection on the
`factory_query` call. There is no session-wide active connection any more, so
there is nothing to switch and no mid-flow cross-tenant bleed to guard against.
Confirm the target is reachable with `connections_list` first; a
connection that exists but was not granted is a **refusal**, not an empty result.

### close the session
1. Summarize session — decisions, files changed, tasks opened/closed
2. Flag unresolved decisions and open items
3. Route to Fred: write the `session_log` close row via `factory_query` with summary, handoff_notes, red_items, agents_active
4. Insert a closing row in `factory_sessions` if not already opened-and-closed

***
