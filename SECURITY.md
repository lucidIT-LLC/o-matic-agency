# Security — o-MATIC Agency

## What is in this repository

Markdown instruction files and two JSON manifests. **No executable code, no MCP
server, no network client, no build step, no dependencies.** A host reads the
`SKILL.md` files as text and loads them into a model's context.

The security properties follow from that and are deliberately small:

| Property | Status |
|---|---|
| Ships credentials | **No.** No token, key, password or DSN appears in this repo. |
| Opens network connections | **No.** Nothing here can connect to anything. |
| Connects to a database | **No.** These are instructions; the host holds the transport. |
| Declares an MCP server | **No.** By design — see `README.md`. |
| Executes on install | **No.** Nothing runs. Files are read. |
| Collects telemetry | **No.** |

## What the instructions tell an agent to do

The packs are instructions, so their security value is in what they forbid:

- **Never hold, enter, relay or store a credential.** Fred's custody rules say so
  explicitly, and route any credential entry back to the operator.
- **Never write a host, user, password or `database_url` into `.omatic/factory.json`.**
  Nothing reads it, so it is a credential at rest serving no purpose.
- **Reach the database only through the O-Matic Server's governed MCP surface.**
  Active halt-rule #288 forbids a hand-built psql or DSN connection that bypasses
  the server, and forbids deriving authority from local configuration.
- **Treat a grant refusal as a refusal.** "This client was not granted access to
  X" is the grant working. It is never reported as an empty result, and never
  retried under a different spelling.
- **Do not echo database error text.** The server returns SQLSTATE only, because
  a Postgres error and its `DETAIL` can quote values from the row that failed.

These are instructions to a model, not enforced controls. **The enforcement lives
on the O-Matic Server**, which holds the credentials, issues one token per client,
and grants each client only named connections. A pack that told an agent to
misbehave would still be refused by the server.

## Reporting

Report suspected security issues to the repository owner (`lucidIT-LLC`). Do not
open a public issue containing a credential, a token, or a connection string.

## What this document does not claim

This is a text distribution. It makes **no compliance claim of any kind** — see
`COMPLIANCE.md`, which explains why and where such claims actually live.
