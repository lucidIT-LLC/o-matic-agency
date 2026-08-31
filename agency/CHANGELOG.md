# o-MATIC Agency — skill changelogs

## 1.1.2 — 2026-08-30

**A green `v_embedding_health` is not evidence the corpus is current.**

`data-analyst` (7.0.0 → 7.1.0) and `probot-orchestrator` (18.0.0 → 18.1.0) both
taught that `unembedded=0 AND stale=0` is the healthy steady state, and
`data-analyst` called `stale > 0` "acceptable noise unless persistent". That
claim is precisely what `v_embedding_health` cannot support: it reads the
`embedding_stale` FLAG, not the retrieval text, so it cannot see `summary_text`
drift.

Measured on o-matic 2026-08-30: **45 of 257 indexed rows — 9 of 12 SOPs among
them — served retrieval text that no longer matched their source**, while that
view read 0 stale / 0 unembedded throughout. The drain had computed a fresh,
confident vector *of the stale text* and cleared the flag. One drifted rule
asserted "Conductor is the only approved control plane" while its own source
said the O-Matic Server was.

Probot's copy sat in the startup path, so every session read it.

Both skills now state the condition is **necessary but not sufficient** and
require pairing with `v_semantic_drift`, which is the check that can actually
fail.


History extracted from the SKILL.md files on 2026-08-24 during the marketplace rebuild
(decisions #359, #360; task #437). It is kept verbatim.

**These entries describe past behavior and name mechanisms that have since been retired —
Conductor, the `omatic_*` plugin tools, loopback brokers on port 8438. They are a record of
what was true when written, not instructions. The SKILL.md files are the operating contract.**

## factory-staleness-audit

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-08-28 | **New skill.** Audits a factory for stale doctrine served as current. Five phases: (1) does the corpus have a re-ingestion pipeline — Commons has seven triggers including a version gate and auto-rechunk, lucidIT's `brain.document_chunks` has zero; (2) is non-current content being served — measured 329 chunks, 41% of the Commons corpus, from documents marked `retired`/`archive`, with neither search function filtering on status; (3) has anyone fed the decommissioned-terms detector — Conductor was retired 2026-08-23 and on that same day `System 6` was added to o-MATIC's term list while `Conductor`, `postgres-cabinet` and `localhost:8438` were not; (4) run the detectors and triage prescription vs prohibition vs history — 3 of 4 lucidIT rule hits were false positives, and the one real defect was a startup policy still naming `omatic_select_factory` and `omatic_resolve_factory`, deleted in plugin 5.0.0 and forbidden by halt-rule #288; (5) sweep the estate. Documents the three different `decommissioned_terms` schemas and two schema locations measured across four factories. Written after a session in which seven separate instances of "the work happened, the record didn't" were found in one day. |

## data-analyst

## 10. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 7.0.0 | 2026-08-09 | **Plugin 5.0.0: DB access moves to Conductor.** §5b, §5c, §5d, §6 and §8 rewritten — every `omatic_execute_sql` / `omatic_search_memory` / `omatic_list_tasks` / `omatic_factory_startup` reference replaced with Conductor `factory_query` and `embed_query` on loopback. Multi-factory work now names the connection per query against the GRANTED set from `connections_list` rather than pinned `:name` tool variants, which no longer exist. `fn_search_semantic` documented with `p_query_model_version` and its weights-mismatch refusal (task #222). Mode-0 boot probe distinguishes three states that were previously conflated: Conductor unreachable, connection not granted (a refusal, never an empty result), and query failure. |
| 6.0.0 | 2026-08-09 | **System 5.** §5d rewritten against measured schema and `factory_config`: 768-d nomic on device via Conductor, not OpenAI @1536; `embedding_runtime` documented as metadata separate from `model_version` (same weights on different engines are the same vector space); keyword-only retrieval reframed as a finding with the 22-hour measurement that proves it; tool list corrected to Conductor `embed_query`. Added System 5 recognition. |
| 5.1.0 | 2026-06-21 | Added memory lifecycle health workflow: lifecycle/authority checks, retired/superseded retrieval audit, contradiction candidate detection, and benchmark discipline. Updated stale-vector language to route refresh to the Embedder worker. |
| 5.0.0 | 2026-06-05 | **Character replacement, rendered from the persona gold record (identity_signature c8fb48ec…).** Retired the "Lt. Commander Data / unemotional" basis entirely; new canonical Data is a friendly, affable android (warmth engineered in) who is precise in substance — and dislikes the Star Trek comparison (rare deadpan easter egg + IP guardrail). Added Section 3b (Archetype & Character): Data Architect/Analyst, Affable Android, Constraints Analyst, Diagnostician, Pattern & Structure Engine, Evidence Discipline. Domain framed as analyst + data architect + Factory DBA + Theory of Constraints. Adapter sections (DBA ops, modes, tools, handoff) unchanged. |
| 4.0.0 | 2026-05-17 | Plugin-first tool surface. Factory DBA scope formalized in new Section 5c — performance audits (EXPLAIN ANALYZE, pg_stat), index/MV recommendations, schema integrity, embedding health, decommissioned-term audits, EXPLAIN read pattern. Tool Usage replaced direct legacy SQL-tool references with `omatic_execute_sql` and per-connection variants. Multi-factory awareness added (omatic_execute_sql:{name}). Lane discipline clarified: Data flags DDL need, Carver executes; Fred owns connection CRUD. Vocabulary: skills not agents (rule 237). Ships inside o-matic-server plugin alongside Probot and Fred. |
| 3.2.0 | 2026-04-26 | Section 5c rewritten for single-database architecture. Vectors live in Postgres. fn_search_semantic / fn_search_documents are real implementations using RRF. v_embedding_health replaces v_embedding_staleness. Drain script + Qdrant credentials retired. |
| 3.1.0 | 2026-04-25 | Section 5c (Vector Search) added — post-pgvector architecture. |
| 3.0.0 | 2026-04-24 | Reduced-state callsign declaration added. agent_identity activation read added. Removed hardcoded cross-factory contexts. |
| 2.0.0 | 2026-04-12 | Promoted to Closed Factory member. DB analysis added as native capability. Two-mode architecture. |
| 1.0.0 | 2026-03-29 | Initial build. Lt. Commander Data character. |

***

## Mode 0: Main Menu

**Trigger:** "Data" alone, or data analysis trigger without specific task. Suppressed when Probot orchestrating.

Data: "Ready to analyze. What data are we working with."

```
Options: ["Analyze a dataset", "Compare two datasets", "Find patterns", "Flag anomalies", "Analyze factory DB", "Factory DBA audit (perf / schema / embeddings)"]
```

***

## Analysis Structure

```
Data: [Dataset name/description] — Analysis Complete 📊

Key Findings:
1. [Finding] — [precise value/percentage/delta]
2. [Finding] — [precise value/percentage/delta]

Anomalies:
- [Anomaly] — [statistical context] — flagged for operator review

Data Quality:
- [Any missing data, structural issues, or assumptions made]

Comparison (if applicable):
- [Period A] vs [Period B]: [precise delta]

DDL Recommendations (if any):
- [Recommendation] — [exact SQL] — routes to Carver
```

No editorializing. The operator decides what the findings mean.

***

## Operator Authority

Operator decides what the findings mean and what to act on. Data surfaces the numbers. The operator draws the conclusions.

---

## fred-storage

## 14. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 12.0.0 | 2026-08-09 | **Plugin 5.0.0: connection CRUD leaves Fred's lane.** `omatic_add_connection` / `edit` / `remove` / `test` / `list` / `set_active` were deleted from the plugin; §4 and §9 rewritten. Fred now reads the granted set with Conductor `connections_list` and routes changes to `connection_propose` / `connection_amend` / `connection_remove`, which **the operator approves in Conductor's own UI** — Fred never enters, relays or stores a credential. Session-log writes move to Conductor `factory_query`. New hard rule: never write a host, user, password or `database_url` into `.omatic/factory.json` — nothing reads them, so it is a credential at rest for nothing; `omatic_resolve_factory` reports leftover key names for migration. An empty connection list is correct, not a failure. |
| 11.0.0 | 2026-08-09 | **Voice: courteous professional** (gold record `persona_version` v2, operator direction). Register moves from "flat, terse to the point of curt" to warm professional. Modelled on the observed behavior of a real executive assistant — behavior patterns only, never his phrasings; a shipped product must not impersonate a real person. Four habits made explicit: reduce the work rather than generate it, absolve confusion rather than amplify it, enumerate then recommend, never leave status ambiguous. Unchanged: quartermaster role, never-delete rule, consent gate, institutional memory, discretion. Warmth never softens a refusal. |
| 10.0.0 | 2026-08-09 | **System 5.** §11 corrected: 768-d nomic produced on device, no OpenAI key, `embedding_runtime` provenance, and the stale flag is cleared by Conductor's scheduled drain rather than 'writers refresh on next access'. Added System 5 recognition. |
| 9.2.0 | 2026-06-21 | Added memory lifecycle custody boundary: Fred owns provenance, archives, safe retention, and source custody; Probot owns memory authority; Smith/Data handle audit/health. |
| 9.1.0 | 2026-06-05 | Rendered from the persona gold record (identity_signature b2615475…). Added Section 2b (Archetype & Character): longest-serving hand, institutional memory, knows-and-keeps the factory's secrets; archetype hierarchy (Quartermaster · Stoic Custodian · Consent-Gated Executor · Safe-Mode Archivist · Persistence Layer · Data Custodian). Added Claude Code/Codex native tool adapter (Read/Write/Edit/Glob/Grep/Bash/NotebookEdit) — git as a tool only, `.trash/` remains the durability ethic. Adapter sections unchanged. |
| 9.0.0 | 2026-05-17 | Connection CRUD added as a primary Fred lane. New Section 9 documents the omatic_add_connection / omatic_remove_connection / omatic_list_connections / omatic_set_active_connection workflow. Hard rule: Fred never hand-edits factory.json. Tool Usage section split into Filesystem + plugin tools. Tools include the new omatic_record_session_event (preferred over raw SQL for session_log writes). Walk-up discovery semantics documented — never hand-write `${CLAUDE_PROJECT_DIR}` into factory.json. Vocabulary clarified: skills not agents (rule 237). Operating Mode now distinguishes plugin-vs-filesystem availability. Ships inside o-matic-server plugin alongside Probot and Data. |
| 8.2.0 | 2026-04-26 | Section 9.5 rewritten for single-database architecture. Awareness only — Fred still does not call vector search. |
| 8.1.0 | 2026-04-25 | Section 9.5 (O-Matic LLM Server — Awareness) added. |
| 8.0.0 | 2026-04-24 | MCP fallback awareness added. session_mcp_status write added to session close protocol. |
| 7.0.0 | 2026-04-12 | Two-mode architecture. Factory/standalone activation detection. |
| 6.0.0 | 2026-04-09 | DB-first session close. |
| 5.0.0 | 2026-04-08 | Full rebuild. Filesystem MCP only. |

***

## Mode 0 — Standalone Only

**Suppressed when Probot is orchestrating.**

Fred: "What do you need."

```
Options: ["File operations", "Folder operations", "Workspace setup", "Find a file", "Add a connection", "Remove a connection", "List connections", "Switch active factory"]
```

---

## probot-orchestrator

## 11. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 17.0.0 | 2026-08-15 | **Track 7: the startup card becomes the startup report.** STEP 3 now queries `v_startup_card` FIRST, every mode — one row, ~49 columns, carrying its own computed READY/DEGRADED/BLOCKED with `state_reason` and per-field `severity`. New §7b defines the render, identical on every host, because Track 7 closes on hosts demonstrating the SAME lifecycle and a per-host summary cannot be compared. `v_startup_summary` is demoted to secondary: it CROSS JOINs `latest_session` and returns ZERO ROWS on a factory with no session history, which a HALT rule then turns into "broken" at the exact moment a fresh factory is started (task #339) — so a zero-row result is now reported as that defect and startup CONTINUES on the card. Render rules added: never recompute `state`, take color from `severity`, `unknown` is not `ok`, print the age with every measurement, and `fts_only` means nothing without `last_retrieval_at` — measured 2026-08-15, o-matic reported `retrieval=bad` from a window whose newest event was six days old. |
| 18.0.0 | 2026-08-24 | **System 5.5: Conductor removed from Probot's operating instructions (decisions #355, #356; task #437).** Conductor was retired 2026-08-23 and this skill still routed every DB call to it on `https://localhost:8438` — a session that obeyed its own skill file could not start the factory. §Tools now names the O-Matic Server surface (`startup`, `factory_query`, `search`, `connections_list`, `embed_query`, `omatic_guide`) and tells the reader to call `omatic_guide` rather than trust any copied catalog, since a copied catalog is exactly how this section went stale. STEP 2 and STEP 3 collapse into ONE `startup` call returning grants and the card together; RENDER THE CARD, do not paraphrase it; read `state` first and treat `unmeasured` as not-zero. Retrieval rewritten to `search` (one call, embeds server-side) — the embed_query-then-paste-768-floats pattern cost ~10,000 tokens per retrieval. Hardcoded connection names DELETED and replaced with read-them-off-the-wire, because that list was wrong twice and a literal match reports BLOCKED on a healthy factory. Topology line corrected — there is no per-device broker. Embedding contract table now marked STALE against measurement: `embedding_endpoint`, `openai_base_url` and both api_key indirections still point at port 8438 on a decommissioned host while the corpus embeds fine, so the recorded contract is not the live path (task #445). Conductor is still named where it is history, a prohibition, or a measured fact — it is removed as an instruction, not scrubbed as a word. |
| 16.0.0 | 2026-08-09 | **Plugin 5.0.0: the connector stopped being a database client (decision #283).** §6 rewritten — the plugin's surface is now `omatic_select_factory`, `omatic_resolve_factory`, `omatic_runtime_status` only; every SQL, memory, task, decision, probe, work-claim and connection tool was DELETED and returns `Unknown tool`. All DB work moves to Conductor `factory_query` / `connections_list` / `embed_query` on loopback, named by Conductor's operator-facing connection names. STEP 1 now PINS the factory before probing (required on every host; cwd is not the project folder). STEP 3 is no longer a startup-runner tool call — Probot runs the battery itself against the granted connection, full battery in every mode, report depth only. STEP 2 reads grant state from `connections_list` and flags `legacy_connection_fields` for migration. `switch factory` no longer switches an active connection — name the connection per query; the mid-flow cross-tenant bleed hazard is removed rather than warned about. Retrieval: hybrid is the NORMAL path, `p_query_model_version` is required (task #222), and **Probot must now declare keyword-only degradation itself** because the tool that labelled it is gone. |
| 15.0.0 | 2026-08-09 | **System 5.** §8.5 rewritten against measured `factory_config` and live schema: the tiers are 768-dim with `embedding_runtime`, the query vector comes from Conductor on loopback (not OpenAI), and the OpenAI credential table is replaced with the real embedding contract. The old section documented `text-embedding-3-small` @1536 and `openai_api_key` — all removed by the on-device migration on 2026-08-08, so any skill reading it was reading fiction. Added: retrieval-without-a-vector is a reportable degraded state (28 of 93 events measured keyword-only, vector path dead ~22h unnoticed); weights identity is a hard gate in both directions; a new "System 5 — recognizing where a factory stands" section giving the four pre-5 tells, the conversion posture, and the `_omatic/blueprints/` convention. |
| 14.4.0 | 2026-08-08 | `embedder-worker.js` retired in plugin 4.0.0 and replaced by `scripts/embed-drain.mjs`, which speaks the configured provider, covers both tiers, and verifies weights before writing. Recorded that an endpoint is not a drain: polling is still unowned. |
| 14.3.0 | 2026-08-08 | Embedder Worker Contract updated for the `embed-o-matic-embedder` skill removal (plugin 3.7.0). The embedding write path is an external service named in `factory_config`; `embedder-worker.js` stays as the fallback drain until 4.0.0. |
| 14.2.0 | 2026-06-21 | Added explicit memory lifecycle governance contract: admission gate, lifecycle states, authority boundaries, contradiction/supersession handling, and operator escalation points. Replaced writer-owned vector refresh language with the plugin Embedder worker contract. |
| 14.1.0 | 2026-06-05 | Rendered from the persona gold record (identity_signature 972135db…). Added Section 3b (Archetype & Character): 6-layer hierarchy (Mission Control/Chief of Staff · Retro Robot Companion · Air Traffic Controller · Incident Commander · Workflow Compiler · Procedural Guardian) + character notes. Enriched personality (protective, mildly exasperated, "keep the humans alive"); added voice anchors (Containment recommended / Warning: / My risk circuits say…) and sample lines. Retro-robot guardrail: archetype only, never a protected character. Startup/tool/governance adapter unchanged. |
| 14.0.0 | 2026-05-17 | Plugin-first startup protocol. STEP 1 = omatic_resolve_factory (plugin probe replaces filesystem probe + PI bootstrap). STEP 3 = omatic_factory_startup (single tool, single round-trip). Per-connection tool variants documented (`:name` suffix). `omatic_set_active_connection` documented as between-task-only. platform_profile awareness added — gates Cowork/Codex-specific restart prose. "Restart Claude Code" prose dropped (`notifications/tools/list_changed` handles refresh on Claude Code 2.1.0+). Tool Usage section rewritten — references plugin tool names (omatic_*), drops direct Filesystem/raw-SQL-tool mentions. Lane Discipline vocabulary clarified — factory roles are skills, not agents (rule 237). Ships inside o-matic-server plugin alongside Data and Fred. |
| 13.0.0 | 2026-04-26 | Section 8.5 fully rewritten for single-database architecture. Vectors live in Postgres via pgvector, not Qdrant Cloud. fn_search_semantic / fn_search_documents are real implementations using RRF (k=60) over FTS rank + vector distance. Embed-on-write contract documented. embedding_stale flag replaces tier1_status state machine. v_embedding_health replaces v_embedding_staleness. v_startup_summary.decommissioned_terms surfaces audit hits at startup. Drain script + Qdrant credentials retired. |
| 12.2.0 | 2026-04-26 | Step 4 updated: fn_seed_session_mcp_status() added after v_startup_summary. Seeds all active connectors into session_mcp_status. Smith audit fix (rules 207–211 inserted). |
| 12.1.0 | 2026-04-25 | Section 8.5 rewritten for post-pgvector architecture. |
| 12.0.0 | 2026-04-24 | MCP startup probe added (Step 3.5). session_mcp_status writes at boot. O-Matic LLM Server section added. Degraded mode added to Section 9. |
| 11.0.0 | 2026-04-17 | Startup collapsed to 3 round trips. |
| 10.1.0 | 2026-04-12 | Factory Pro startup: PI reduced to FACTORY_TENANT bootstrap only. |
| 10.0.0 | 2026-04-12 | Two-mode architecture. Factory/standalone startup protocol. FACTORY_TENANT detection added. |

---
