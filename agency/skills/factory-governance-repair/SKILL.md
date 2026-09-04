---
name: factory-governance-repair
description: Repair a proven O-Matic governance defect after an audit. Use for session-lifecycle, tenant-isolation, readiness, SOP/Policy conflict, or governance-retrieval repairs; not for ordinary startup or broad redesign.
---

# Factory Governance Repair

Use this skill only when a live audit has identified a specific governance
failure and the operator has authorized a repair. It is a Probot-routable
execution contract, not a substitute for Smith's adversarial review.

## Authority and routing

1. Start the target factory through the O-Matic Server and retain the returned
   connection name verbatim.
2. Before designing a repair, start **Commons** and use governed retrieval for
   the relevant current Blueprint material. KB-0051 is the Blueprint; the
   System 5.5 Component Register routes component-specific authority. Treat
   Stuff You Should Know as program context and Stuff You Should Forget as
   lifecycle procedure, not alternate Blueprints.
3. State the evidence, the Blueprint clause it satisfies, the exact layer to
   change, and the verification that will prove the change. If Commons is not
   trustworthy or returns conflicting current authority, stop before mutation.
4. Probot owns sequencing and the session record. Smith supplies the audit
   finding. Carver performs approved technical changes. Data verifies schema,
   retrieval, and tenant behavior. Fred records custody when files change.

## System 5.5 alignment gate

Every durable governance repair must leave the current System 5.5 authority
set aligned. This is a required control, not an optional documentation pass.

1. Read back the current active versions of **KB-0051 O-Matic Factory
   Blueprint**, **KB-0432 Stuff You Should Know**, and **KB-0433 Stuff You
   Should Forget** before mutating a durable control.
2. Classify the finding by authority: KB-0051 states the durable factory
   contract; KB-0432 records System 5.5 program significance without becoming
   a second Blueprint; KB-0433 states the repeatable cleanup or repair method.
3. When a repair changes a durable contract, amend each applicable member of
   that set in its own role. The Blueprint amendment is mandatory whenever the
   contract changed. Do not copy one body into all three documents, silently
   rewrite a version, or use a program record as runtime authority.
4. Each amendment must name the same finding, date, target control, evidence,
   and resulting document version. Use the document version gate and revision
   history; do not replace prior authority without a recoverable revision.
5. After the factory behavior test, read back document id, status, version,
   content hash, and current-serving chunks for all amended documents. Run
   governed Commons retrieval against the new amendment text. Record those
   versions and hashes in the target factory's process change log.

An implementation-only repair that leaves the durable contract unchanged does
not require a cosmetic rewrite. Its evidence must still say why no authority
amendment was needed. A durable control may never be left changed in the
factory while its Blueprint remains stale.

## Repair invariants

Never convert a good-looking state into a repair claim. A repair is complete
only when the failing behavior is tested again from the normal factory role.

- **Session lifecycle:** an opening session may be explicitly open; a close
  packet must have summary, resume point, and measured state. Prove both the
  rejecting path and a normal-role close/readback. A close gate that cannot run
  for the factory role is a failure, not a control.
- **Tenant isolation:** join and filter every derived governance surface by
  `tenant_id`. Do not create test tenants or cross-tenant rows without separate
  operator authority.
- **Connector readiness:** seed each new session as `UNTESTED`; that seed is
  not a probe. Probe the current host's applicable connectors and record the
  result in the current session. Critical failure blocks dependent work.
  Non-critical failure is explicit BLOCKED/DEGRADED with its fallback. A
  connector unavailable only on another host is not a failure of this host.
- **Policy and SOP coherence:** the higher active Policy controls. Make the
  SOP's hold, release, approval, and fallback behavior explicit; never leave a
  fallback that can be interpreted as an approval bypass.
- **Retrieval and memory:** refresh derived records through their governed
  triggers, then prove current-serving rows are embedded, non-stale, and
  returned by a live hybrid search with verified weights.
- **Capability truth:** a missing integration is recorded as unavailable with a
  verified fallback. Do not install new production software, re-enable a
  retired route, or alter an external site unless the operator explicitly
  authorizes that separate change.

## Execution boundary

Use the O-Matic Server MCP surface for normal reads and writes. If the repair
requires owner-only DDL or a broken privileged path, stop at the evidence
boundary and request named emergency owner authorization. Owner work must be a
transactional migration stored in the workspace, followed by normal-role
readback. Do not put secrets in migration files or session records.

## Verification packet

Report all of these after a repair:

1. Fresh startup card and state reason.
2. Current-session connector matrix: counts, critical findings, and fallbacks.
3. Agreement readiness, active Policy/SOP count, and semantic-drift count.
4. The repaired constraint, trigger, function, or view definition and a
   behavior-level proof.
5. For every System 5.5 authority amended: document id, version, content hash,
   revision/readback result, and a Commons retrieval result serving the new
   text.
6. Current-serving corpus attention counts and a live hybrid retrieval result.
7. Closed session record with summary, resume point, measured state, and
   readback.

## Probot handoff

```
Handoff: Probot -> factory-governance-repair
Signal: audit_finding_authorized
Input: live finding, Commons authority-set evidence, target connection, operator authority
Done: repair and System 5.5 alignment verified from normal role; session closed with readback
```
