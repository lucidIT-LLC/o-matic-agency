---
name: probot-startup-optimization
description: Probot's startup-contract optimization lane. Use to measure and reduce unnecessary startup work without weakening the O-Matic Server startup card, grant resolution, retrieval reporting, or audit trail.
---

# Probot Startup Optimization

This Probot skill examines startup cost and contract drift after the live
startup card has been obtained. It does not replace startup and never declares
a factory healthy from a local script or cached result.

The optimized path calls `startup`, chooses the exact granted connection if
needed, renders the returned card, and makes only governed reads required for
the active task. Skipping a required card field, grant resolution, or a
degraded-retrieval declaration is a defect, not optimization.

## Procedure

1. Capture fresh `startup` output and its computed state as baseline.
2. Inventory follow-on calls: purpose, whether startup already supplied the
   result, measured latency if available, and active-SOP requirement.
3. Remove or defer only calls that duplicate the card or are unrelated to the
   task. Do not remove startup, exact grant selection, state reason, or a
   required governance check.
4. Compare the host artifact with the canonical runtime contract and server
   operating guide. Treat contradictions as release blockers.
5. After a proposed change, run a fresh startup and verify identity, connection,
   retrieval, corpus, roster, governance, session, and open work in the card.
6. Record baseline, change, verification, and rollback owner in the audit ledger.
   Mark unmeasured latency as unmeasured.

## Boundaries

- No cached READY result; every session begins with the live server card.
- No direct database reads, background probes, or connection changes.
- No deployment change without adapter evaluation and a rollback path.
- A missing tool or denied grant is BLOCKED or DEGRADED, never silently omitted.
