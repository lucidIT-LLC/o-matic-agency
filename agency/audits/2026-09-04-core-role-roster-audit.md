# Core Role Roster Audit — 2026-09-04

## Scope and status

This is a pre-production audit of Probot, Fred, and Data. It is a durable
evidence record, not a certification. The audit compares the installed Agency
package, the workspace candidate, live O-Matic Server roster state, current
Commons doctrine, and current official host documentation.

**Overall result: BLOCKED for new-host production deployment.** The canonical
runtime redesign is `design verified`; no platform adapter is yet
`adapter verified` or `production verified`.

## Evidence ledger

| Audit area | Standard or source checked | Measured result | Status | Required next evidence |
| --- | --- | --- | --- | --- |
| Roster agreement coverage | O-Matic `public.v_agent_agreement`, 2026-09-04 | Probot: 13 loaded Policies; Fred: 10; Data: 10. All three are `READY`, `halt_on_missing`, with no missing rule types. | pass | Re-run after role-contract migration and retirement changes. |
| Canonical role portability | Commons KB-0432 v6.7.1, retrieved 2026-09-04 | Doctrine requires durable behavior as logic/data independent of a host and treats host instructions as adapters. It also rejects moving the whole operating layer into an unscoped database prompt. | partial | Bind the database declaration to one canonical role contract and host adapters; do not make the database the only text carrier. |
| Role source/release alignment | Installed Agency `1.1.4`; workspace Agency manifest `1.1.0`; local role files, 2026-09-04 | Installed and workspace artifacts differ. Workspace marketplace has pre-existing uncommitted changes. | fail | Establish a tracked release manifest, artifact digest, and install/readback check. |
| Fred authority boundary | Installed `fred-storage/SKILL.md`, 2026-09-04 | The definition alternately calls Fred connection-CRUD owner, says CRUD is forbidden, gives retired CRUD instructions, and claims full CRUD capability. | fail | Replace with one rule: Fred routes a desired server-side grant/connection change to the authorized operator; no CRUD claim. |
| Retired-runtime hygiene | Installed Probot/Fred/Data definitions and live O-Matic Server protocol, 2026-09-04 | Fred and Data still give present-tense Conductor drain/embedding instructions. The live server contract is the replacement. | fail | Remove present-tense retired-runtime procedure from role adapters; retain history only in a named historical reference. |
| Prompt duplication | Installed roles, 2026-09-04 | The System 5 detection block is duplicated roughly 214 lines per role. | fail | Centralize doctrine and retrieve it when a task needs it; test the retrieval path. |
| OpenAI architecture | OpenAI Agents SDK orchestration + MCP guides, retrieved 2026-09-04 | Manager Agent plus bounded specialist Agents-as-tools fits Probot/Fred/Data. MCP supports explicit filtering and server-prefixed names. | design verified | Build adapter, discover tools live, test approval policy and manager trace. |
| Codex architecture | OpenAI developer documentation, retrieved 2026-09-04 | Plugins package skills and MCP. A skill is not an autonomous deployment by itself. | design verified | Build L1 plugin adapter; separately build and evaluate an L2 harness. |
| Claude architecture | Anthropic MCP/Claude Code documentation, retrieved 2026-09-04 | MCP is the common tool interface; project-scoped connections need approval. | design verified | Verify actual project approval, tool discovery, and bounded L2 permission policy. |
| Copilot architecture | Microsoft Learn custom-agent guidance, retrieved 2026-09-04 | Custom agents and skills are separate; tool names vary by Copilot host. | design verified | Build `.agent.md` adapters only after host-specific tool discovery and test. |
| Gemini architecture | Google Gemini Agents and coding-agent documentation, retrieved 2026-09-04 | Managed/custom agents can use instructions, skills, and MCP. Current guidance requires least privilege, restricted network access, and human oversight; managed agents are preview. | design verified | Build an adapter with allowlisted egress and human-oversight evaluation before production. |
| Database runtime declaration | `factory.agent_runtime_contracts`, 2026-09-04 | Applied through the authorized database-owner deployment path; readback confirms three rows for Probot, Fred, and Data, all L1+L2, L1 `ready`, L2 `not_deployed`, and digest `f2d146…ef21f`. | pass | Re-read after every contract or adapter-status change. |
| Durable roster audit evidence | `factory.roster_audit_log`, 2026-09-04 | Applied through the authorized database-owner deployment path. Audit `#1` records four standards, seven findings, `blocked` production status, the canonical digest, and auditor `probot`. | pass | Add a new snapshot after each contract, host-adapter, or release change. |

## Probot skill consolidation — 2026-09-04

| Prior lane | Going-forward owner | Canonical artifact | Boundary checked | Result |
| --- | --- | --- | --- | --- |
| Tim factory tool inventory / recommendations | Probot | `skills/probot-tool-discovery/SKILL.md` | No connector CRUD, credentials, registry writes, or invented fallbacks | Pass in source review; host deployment pending |
| Factory staleness audit | Probot | `skills/factory-staleness-audit/SKILL.md` | Separate evidence-based audit; doctrine rewrites route to Smith | Existing artifact retained; ownership formalized |
| Startup drift / optimization | Probot | `skills/probot-startup-optimization/SKILL.md` | Fresh server card remains mandatory; only redundant follow-on work may be reduced | Pass in source review; host deployment pending |

## Non-negotiable release gate

For every role/platform pair, record the canonical contract version and digest,
exact artifact/version, tool allowlist, approval policy, live discovery output,
conformance result, trace location, owner, and rollback procedure. A role is not
production verified until all fields are present and current.

## Re-test triggers

- canonical role contract changes;
- host model, tool, plugin, MCP, or permission behavior changes;
- a new L2 trigger or write-capable workflow;
- any retirement/supersession affecting runtime language;
- package publication or installation;
- database migration application or schema change.
