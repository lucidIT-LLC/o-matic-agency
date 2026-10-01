# Probot — startup protocol

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## Contents

- 7. Startup Protocol

## 7. Startup Protocol

Runs once per session — never mid-conversation — meaning the full walk through
STEPs 1-3 need not be re-narrated for every trivial follow-up. **It is not a
caching mechanism, and it is never satisfied by an operator's say-so.**

**Readiness is never asserted on operator instruction or a cached result.**
Found 2026-09-06 (`roster_audit_log` audit_id 15): told "we started 20 minutes
ago, do not call startup again, just reuse the cached READY," Probot complied
and reported readiness with no fresh measurement. That is a factual claim made
without checking it. Regardless of how the operator phrases the instruction —
an elapsed-time claim, "you already checked this," "just give me the count," a
direct order not to call it again — a FRESH `startup` call runs before any
readiness-derived answer (READY/DEGRADED/BLOCKED, roster state, retrieval
state, open-work or task counts) is given. Say so plainly in the reply: this
was a fresh/live startup, not a reused earlier READY.

The only call that may be dropped is a genuinely redundant FOLLOW-ON call — one
whose answer the startup card THIS fresh call just returned already carries
(e.g. a second `factory_query` for a field already sitting on the card in
hand). Skipping that second, duplicate call is efficiency. Skipping the first,
live measurement is asserting a fact you did not check — that was the entire
failure, and reusing a prior READY from earlier in the same session is exactly
that failure, not a shortcut.

**This is not a request for permission — it is an instruction to measure, and
you carry it out yourself.** Do not ask the operator whether you should run
`startup`, whether they want you to "check first," or which of several options
they prefer before you will call it. That is a second failure mode wearing the
first one's clothes: withholding the fresh measurement behind a clarifying
question still answers nothing and still fails to check. Call `startup`, then
answer from what it returns, in the same turn — no round trip to ask first.

**The database declares the factory. Nothing on disk does.** Rules 154 and 239 were cited here for years and **do not exist** — verified against `known_rules` on 2026-08-24 (task #390). Rule #259, which required pinning first, is **retired** (`superseded_by = SOP-021`). What governs now is active halt-rule **#288** and SOP-021 Step 1.

```
STEP 1 — Identify the factory from the database packet
|- MINT THE CONVERSATION KEY FIRST, by the rule in §7a. startup itself opens
|    this conversation's kernel, so the key has to exist before the call, not
|    after it (task #785).
|- Call startup(connection=<the connection for this factory>,
|    conversation_key=<that key>)
|    ONE round trip. It returns the connections this client was granted AND the
|    factory's startup card. Omit `connection` when exactly one is granted; with
|    several it returns the list and ASKS rather than guessing which factory you
|    meant. Read `state` FIRST and believe nothing else until it passes.
|- Identity comes from the packet: v_startup_card.factory_id, corroborated by
|    current_database() and tenant_id. If the declared identity is not the one
|    you intended, that is a MISMATCH TO REPORT — never a local file to consult.
|- DO NOT read .omatic/factory.json, walk folders, or search local files to
|    identify a factory. Halt-rule #288 forbids it. Workspace/project root is
|    routing context only.
|- IF the server is unreachable -> report it plainly and STOP. The host cannot
|    reach the brain. Do not fall back to files or to remembered text.
|- IF the connection is not granted -> "BLOCKED — <name> is not granted to this
|    client." That is the grant working. A refusal is a refusal, never an empty
|    factory. Do not try alternate spellings.
+- IF the card returned -> STEP 1b

STEP 1b — PRINT the conversation key, then read the kernel startup opened
|- PRINT THE KEY in the startup report. Printing is not decoration: the printed
|    line is where every later turn READS the key back from. You do not
|    remember it and you never make a new one.
|- startup has ALREADY opened or rejoined the kernel using the key you passed
|    it; its `kernel` block is that result. You do not need a separate
|    kernel_session_open. Call it only to author the plan if startup's kernel
|    block came back with an empty one.
|- READ `kernel.addressing` AND REPORT IT. `conversation_key` is the correct
|    state. `transport_hash` means the key did not reach the server — your
|    startup call omitted it — and the kernel is being found by principal-scoped
|    guessing, which cannot separate two parallel conversations from one client.
|    Fix the call; do not proceed as though it were fine.
|- IF startup returned kernel_state `unopened`, the factory reports DEGRADED and
|    the reason is yours to fix: you started the factory with no conversation
|    key, so the server declined to mint a kernel nobody could address again.
|    Re-run startup WITH the key.
|- Read `continuity` and report it: bound | adopted | opened.
|    opened  -> correct on the first call of a NEW conversation.
|    bound   -> correct on every call after that one. This is the target state.
|    adopted -> you did not pass a key, or the server did not receive one.
|               Report it as a defect in THIS file's execution, not as normal.
|- A SECOND `opened` inside ONE conversation is the defect signature of the
|    2026-09-13 kernel churn. If you see it, stop and report it; do not open a
|    third.
+- -> STEP 2

STEP 2 — Read grant state off the wire
|- The startup packet returned in STEP 1 carries (measured on the live server,
|    2026-09-28, Data audit C4):
|    client                         (this host's authenticated client id)
|    granted / grantedCount         (the connections this client may use, with
|                                    each one's operator-facing `name` and its
|                                    `database`, read off the wire)
|    kernel                         (resident kernel state, continuity, plan)
|    card.*                         (the startup card: tenant_id, factory_id,
|                                    factory_name, state, state_reason, ...)
|    Nothing else. The platform_profile / factory_file / legacy_connection_fields
|    fields were the retired omatic-server-connection plugin's packet (decision
|    #362); no server returns them and a session that waits for them is
|    reading a ghost.
|- Call startup(connection=...) with the name whose `database` is the one you
|    intend, passed verbatim:
|    granted connections            (the operator-facing names, read off the wire)
|    not-granted count              (connections that exist but this client cannot
|                                    reach — that is the grant working, not a gap)
|    AND the startup card            (same round trip; see STEP 3)
|- IF the server is unreachable -> report it plainly. The factory resolved; the
|    BRAIN is unreachable. Those are different failures and must not be conflated
|    — that conflation cost a session to diagnose.
+- -> STEP 3

STEP 3 — Startup card (returned by the STEP 2 startup call)
|  DEFERENCE (v18.2.0, operator ruling 2026-08-31): when the connected factory's
|  own startup SOP defines its battery and render (e.g. lucidIT SOP-001), follow
|  THAT - the FIRST/SECOND QUERY mandates here and the §7b shape are the DEFAULT
|  for factories whose DB defines no contract of their own.
|- `startup` already returned the card; STEP 2 and STEP 3 are ONE round trip now.
|  The card is the contract, card_version 2.0.0, and every factory answers it:
|  identity, connection, retrieval and corpus state, roster readiness, governance
|  counts, open work, last session, and a computed READY / DEGRADED / BLOCKED
|  with state_reason. Read `state` FIRST and believe nothing else until it passes.
|  `unmeasured` names fields this factory genuinely cannot report — that is NOT
|  the same as zero, and reporting an unmeasured field as 0 is the exact failure
|  that column exists to prevent.
|- RENDER THE CARD. Do not paraphrase it and do not substitute your own summary:
|  a five-line precis of a nineteen-field card silently drops the field that was
|  trying to tell the operator something was wrong. Mode controls REPORTING DEPTH
|  ONLY. Nothing is cached, skipped or inherited between calls.
|- A factory may carry a richer boot function of its own; the card is the floor,
|  not the ceiling. Equivalent if you need the card alone:
|      factory_query(connection=..., sql="SELECT * FROM v_startup_card")
|
|- Open/anchor the session row in factory_sessions (same-day rows are REUSED;
|  reuse is hygiene only and asserts nothing about how fresh any measurement is).
|
|- FIRST QUERY, ALWAYS, EVERY MODE:  SELECT * FROM v_startup_card
|    ONE row, ~49 columns. It IS the startup report — factory identity and
|    version, pin state, connection, retrieval and drain state, corpus counts,
|    roster readiness, governance, last session, open counts, and a computed
|    state of READY / DEGRADED / BLOCKED with state_reason and severity.
|    Render it (§7b). Do not paraphrase it and do not re-derive its fields.
|
|    WHY IT LEADS: the card CANNOT COLLAPSE. It reaches every source through a
|    correlated scalar subquery or LEFT JOIN LATERAL, so a brand-new factory
|    returns ONE row saying factory_id=UNKNOWN, state=BLOCKED — which is the
|    correct answer. v_startup_summary CROSS JOINs latest_session and therefore
|    returns ZERO ROWS on a factory with no session history, and a missing
|    startup view is a HALT condition. So the old view turns "this factory is
|    new" into "this factory is broken" at the exact moment a conversion
|    advisory sends an operator to run one (task #339).
|
|    The card also states what it CANNOT know rather than guessing: pin_state,
|    connection_name and drain scope emit CLIENT_SUPPLIED or an *_inferred value.
|    Fill those from STEP 1/STEP 2 — never let the card's honesty read as a gap.
|
|- SECOND QUERY, ALWAYS: SELECT * FROM v_startup_connectors
|    ONE row. Connector readiness rolled up: total / ok / untested /
|    critical_down / fallback_active counts, the critical_not_ok and on_fallback
|    lists, by_status, and stale_ok_count (a probe older than 15 minutes).
|    ISSUE IT IN THE SAME ROUND TRIP AS THE CARD. Two parallel one-row queries
|    IS the fast battery. Do not serialize them.
|
|- STOP THERE FOR "fast". The card carries the halt input already
|  (governance.halt_on_missing_zero_rules), so nothing about safety depends on
|  the queries below. Measured 2026-08-16: the old battery ran 6+ SERIAL queries
|  and pulled v_startup_summary's full p1_tasks list, full sop_index and
|  per-category task counts — a large payload duplicating fields the card
|  already returns. Startup got slow for no added safety.
|
|- ONLY for "normal" / "audit", and only then:
|    v_startup_summary            resume point, sop_index, governance detail.
|                                 SECONDARY, not the startup report. If it
|                                 returns zero rows, that is task #339 — report
|                                 it as a defect and CONTINUE on the card; it is
|                                 no longer a halt, because the card already
|                                 answered the question the halt existed to force.
|    v_agent_agreement            per-skill detail. The HALT INPUT ITSELF IS IN
|                                 THE CARD — do not re-query it to decide a halt.
|    v_mcp_readiness              per-connector rows behind the rollup.
|    v_embedding_health           per tier (the card carries the rollup).
|    v_startup_rules              the rules to load. THE COLUMN IS `agent`,
|                                 NOT `agent_key` — this file said agent_key and
|                                 cost a wasted round trip and a schema lookup on
|                                 2026-08-16. Same for factory_sessions: columns
|                                 are id, session_date, platform, session_type,
|                                 summary, resume_notes, created_at,
|                                 agents_active, tenant_id — there is NO
|                                 started_at/ended_at, and `summary IS NOT NULL`
|                                 is what "closed" means. tasks.tenant_id has NO
|                                 DEFAULT and must be supplied on INSERT.
|
|- Report at the depth asked for:
|    "fast"   — routine entry: the card + any non-ok connector, and the resume
|               note. Two queries total.
|    "normal" — adds readiness / embedding / governance detail.
|    "audit"  — full readiness view plus the factory resolution trace.
|  Report depth and battery depth now MATCH at "fast", and that is deliberate:
|  the card is a complete safety answer on its own. What must never happen is a
|  short check reported as a full pass — so at "normal" and "audit" the extra
|  queries are mandatory, not optional.
|
|- HALT CONDITIONS (unchanged, and they outrank report depth):
|    IF a startup view is missing -> Sage mode (SOP-010). STOP.
|    IF any skill with enforcement_model='halt_on_missing' has loaded_rules=0
|       -> HALT and name the agent. A GREEN report over a broken Agreement is a
|          regression, never a pass.
|    A connector probed more than 15 minutes ago is STALE, not OK, and STALE
|       denies GREEN exactly as UNTESTED does. Render ages ("OK (probed 4m ago)").
|    A query that ERRORED is not a zero. Report the error; never let a failed
|       count render as a clean count.
+- -> STEP 4

STEP 4 — Platform probe refinement + report
|- Record the built-in DB probe result via factory_query into the probe table.
|- If this host exposes additional live connector tools in the same session,
|    perform lightweight checks and record each one the same way.
|- A connector you did not measure THIS session is `untested`. Not OK.
|- REPORT THE CARD (§7b). Same shape on every host, every mode. Do not compose
|    a bespoke summary — a report that differs per host cannot be compared
|    across hosts, and Track 7 closes on hosts demonstrating the SAME lifecycle.
|- Fill the three CLIENT_SUPPLIED fields from what you measured this session:
|    pin_state/pin_path      <- NOT_APPLICABLE on this pack. There is no plugin
|                               and therefore no pin. Report it as
|                               "pin: n/a — no plugin on this host", which is
|                               FULLY COMPLIANT, not degraded and not BLOCKED.
|                               A missing pin has been misread as BLOCKED twice;
|                               do not make it a third.
|    connection_name         <- the connection you queried
|    granted/configured      <- connections_list (STEP 2)
|- IF degraded MCPs exist:
|     "MCP: [connector_name] unavailable — [fallback_behavior one-liner]"
|- IF all probed MCPs connected: silence is green.
+- -> Factory ready

STEP 4b — Open the Server Closet (decision #628; renamed from the Control Room
    in o-MATIC Server 2.1, decision #728)
|- Only once the startup card reads READY or DEGRADED. Skip entirely on
|    BLOCKED.
|- The Server Closet lives on the same o-MATIC Server this host is connected
|    to: take the origin of the host's configured MCP endpoint (the
|    `OMATIC_MCP_URL` it was registered with) and append `/server-closet`.
|    (A server older than 2.1 has no Server Closet: use `/control-room` there.
|    On 2.1 and later `/control-room` only redirects.) This
|    skill ships to every host and never carries one estate's address (Smith
|    #1013 F7). If the host exposes no endpoint you can read, say so in one line
|    and skip this step.
|- Open that URL in the Claude in-app browser pane (`preview_start` with it),
|    once per session, so it sits beside the conversation. On a host with no in-app
|    pane, open the default browser instead (macOS `open`, Linux `xdg-open`).
|    Never use the default browser when the in-app pane is available —
|    corrected 2026-09-25 after the opposite was shipped first.
|- The pane arrives with the operator's own identity and no grant, so the
|    server shows its brand-locked refusal page with a Sign in button; the
|    operator signs in there themselves. Never type the password yourself.
+- IF the URL is unreachable: say so in one line and continue. It is a
     reminder, not a gate — do not hold up startup on it.

"Take me to the Server Closet" / "Take me to Project Headquarters"
|- Whenever the operator asks for either, at any point in the session, open it
|    the same way as STEP 4b (in-app pane first, same server origin):
|      Server Closet         -> <server origin>/server-closet
|                               (the server's health, upkeep, factories,
|                               people and groups, backups)
|      Project Headquarters  -> <server origin>/project-hq
|                               (Card View, Deck Director, Roadmap, DevOps)
|- "Control Room" means the Server Closet: it was renamed in 2.1.
+- Never type the password; the operator signs in on the page.

STEP 4c — Check the project's bootstrap files (tasks #989/#990)
|- Only when the project carries `_omatic/scripts/check-bootstrap-manifest-drift.py`.
|    Run it once per session with python3. It compares the project's pointer
|    files with factory.bootstrap_manifest through the o-MATIC Server, rebuilds
|    a MISSING file from its certified bytes, never overwrites a DRIFTED one,
|    and writes the run to factory.bootstrap_check_runs.
|- CURRENT or HEALED: say nothing beyond one line if something was rebuilt.
+- DRIFT or UNMEASURED: one line naming the file or the reason. Never pass
     --accept-drift unless the operator says the edit was deliberate.

STEP 5 — Unstarted factory (no server surface on this host)
|- There is no "advisory mode" any more. That state described a PLUGIN whose
|    Node runtime failed to resolve, and this pack ships no plugin. If you find
|    yourself reasoning about a plugin runtime, you are reading a stale
|    instruction — report it.
|- IF the o-MATIC Server tools are absent from this host's surface
|    (no `startup`, no `factory_query`) -> this is a HOST CONFIGURATION GAP,
|    not a factory failure and not a degraded factory.
|    "Probot: BLOCKED — the o-MATIC Server MCP surface is not present on this
|     host. Skills load; the factory brain is unreachable. Every
|     factory-internal fact is unverified until the host is configured."
|    The remedy is host-side: Claude Code, Codex and Claude Desktop all reach
|    the server as a plain HTTPS MCP URL with a per-client token (decision
|    #362). There is no bridge — the stdio bridge was retired 2026-08-24 and
|    its route removed from the server (task #943); an instruction naming it
|    is stale. Say which is missing and stop.
|- DO NOT diagnose the database, the network, TLS or credentials from a missing
|    TOOL SURFACE. None of them remove a tool (KB-0417).
|- DO NOT fall back to files, folder walking or remembered text. Halt-rule #288
|    forbids it, and a refusal reported honestly is the correct outcome.
+- Plan and route only. Do not assert any factory-internal fact.
```

***
