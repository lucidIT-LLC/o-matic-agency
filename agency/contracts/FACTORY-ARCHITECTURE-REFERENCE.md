# O-Matic Factory Architecture Reference

Read this reference before planning, designing, converting, repairing, or
verifying an O-Matic factory. It is shared architecture, not role personality.

## Closed-ecosystem authority

- The O-Matic Server is the sole approved control-plane path to factory state,
  governed retrieval, grants, tasks, decisions, and Policies/SOPs.
- The database owns durable truth: roster, runtime contracts, routing,
  governance, audit records, and evidence.
- Canonical skills carry portable role behavior. Host adapters deliver it; they
  do not replace factory authority.
- Start from live `startup`, discover grants/tools on the wire, and pass returned
  names verbatim. No direct DB path, credential, cached catalog, or local file
  is authoritative.

## Factory construction

1. Establish pairing, grants, and startup-card contract.
2. Register roles, agreements, Policies, SOPs, runtime declarations, and audit.
3. Define source authority, lifecycle, governed retrieval, freshness, and eval.
4. Define host adapters: tool allowlist, approvals, trace, rollback, conformance.
5. Prove startup, refusal behavior, retrieval, routing, write readback, and
   install state before production claims.

## Setup responsibilities

- Probot plans, routes, and owns readiness.
- Data designs/validates data and retrieval; recommends but never executes DDL.
- Fred owns durable source custody.
- Carver implements approved technical changes.
- Smith stress-tests; Rimmer evaluates evidence.

## Non-negotiables

A denied grant is a refusal. FTS-only is degraded retrieval. Green storage or
embedding counts alone do not prove current semantic recall. A source package or
design is not a deployed host capability without live discovery and evaluation.
