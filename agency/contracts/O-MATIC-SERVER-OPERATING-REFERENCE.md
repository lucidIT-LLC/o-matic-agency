---
name: server-guide
description: Operate an O-Matic factory through the O-Matic Server: live startup, grants, governed retrieval, factory queries, task/decision work, and evidence-backed state reporting. Use for factory setup, operation, repair, or verification.
---

# O-Matic Server Operating Guide

The O-Matic Server is the factory control plane. It is the only approved path to
factory state, grants, governed retrieval, Policies/SOPs, tasks, decisions, and
database work. Canonical factory architecture is in
`../../contracts/FACTORY-ARCHITECTURE-REFERENCE.md`.

## Startup

1. Call live `startup` first.
2. If several grants are returned, select the connection whose database matches
   the intended factory and pass its returned display name verbatim.
3. Render the returned startup card as the factory’s computed state. Do not
   recompute, replace, or conceal a non-READY reason.
4. Stop on missing grant, transport, or trust failure. A refusal is evidence of
   access control, not an empty factory.

## Governed work

- Use `search` for semantic retrieval and label FTS-only results degraded.
- Use `factory_query` only on a named returned grant. Scope every read/write.
- For writes, require authority, use the narrowest mutation, and read back the
  result. Destructive work requires the server’s explicit confirmation gate.
- Discover tools/resources live. Never infer names from docs, local files, or a
  prior host.

## Boundaries

- No direct database access, DSN, credentials, local connection configuration,
  retired broker, or cached static tool catalog.
- No local bootstrap authority. The live startup packet establishes identity,
  grant boundary, state, and current capability.
- A prompt-only host has role behavior but no verified factory capability.

## Report shape

Report identity, connection, retrieval, corpus, roster, governance, session,
open work, and any returned non-READY state reason. Separate observed state,
inference, and required operator action.
