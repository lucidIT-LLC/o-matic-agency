---
name: probot-tool-discovery
description: Probot's governed tool-discovery lane. Use before relying on an unfamiliar factory capability, when a required capability appears absent, or when documenting the live O-Matic Server surface. It replaces Tim's factory tool-inventory lane; it does not manage connector credentials, registry CRUD, or host configuration.
---

# Probot Tool Discovery

This is a Probot skill, not a separate role. It establishes what a host or
factory can actually do now from live evidence before work is routed to a tool.
It replaces Tim's *factory tool-inventory and recommendation* lane only.

The O-Matic Server remains the factory control plane. This skill never creates,
edits, deletes, enables, disables, or reconfigures a connection.

## When to invoke

- A task needs an unconfirmed capability.
- A documented tool is absent or a tool call failed.
- Probot is preparing a platform-adapter readiness review.
- The operator asks what the factory can use or whether a tool path is safe.

Do not invoke merely to repeat normal startup. `startup` is already the
authoritative startup discovery call.

## Procedure

1. Start the target factory using the live `startup` protocol if it has not
   been started in this session. Read connection names from returned grants.
2. For O-Matic Server behavior, read `omatic_guide` and inspect live server
   tools; do not infer capability from old skills, plugin caches, or database
   names.
3. For host-specific behavior, inspect the host's current declared tool surface.
   Record host, artifact/version if available, and whether the tool is callable,
   denied, or absent. Never substitute a similar tool.
4. If a governed database measurement is necessary, use `factory_query` on the
   named granted connection. Do not open a DSN or reconstruct a registry from
   local configuration.
5. Classify each requested capability exactly as **verified_live**,
   **available_unmeasured**, **retained_unpublished**, or **unavailable**.
   Only `verified_live` tools may be routed for the requested work.

## Required report

```
TOOL DISCOVERY — <factory/host> — <date>
Requested capability: <plain-language outcome>
Evidence: <live surface / startup card / governed query>
Publication state: <one of the four canonical states>
Verified use or gap: <exact tool/evidence or missing proof>
Owner / next action: <Probot, operator, or named role>
Audit record: <ledger path or database record>
```

## Boundaries

- No connection CRUD, credential handling, registry writes, or host install.
- No portability claim until the target adapter passes its release gate and eval.
- No direct database access or hidden background probes.
- No auto-remediation. Discovery evidence is not authorization.
