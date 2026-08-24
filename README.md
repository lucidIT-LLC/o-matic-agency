# o-MATIC Agency

**Where an O-Matic factory is staffed.**

An O-Matic **Factory** is an Artificial Organization — a set of agents that share
persistent memory, governed rules, task state and decision history. This
marketplace supplies the people who run one.

| Skill | Role |
|---|---|
| `agency:probot-orchestrator` | Probot — plans, routes, runs startup and session close |
| `agency:fred-storage` | Fred — files, folder custody, connections, the session log |
| `agency:data-analyst` | Data — schema integrity, retrieval health, factory DBA work |
| `agency:server-guide` | The O-Matic Server operating guide |

This is the **constitutive** layer. Without it a factory does not start.

You don't go to a hardware store for a marketing manager. The other doors:

- **o-MATIC Firm** — expertise you retain: Smith, Tim, Rimmer, Jake
- **o-MATIC Studio** — people who design and build: Brandy, Carver, Monet, Jo, Pixel
- **o-MATIC Supply** — tools, not people: the WordPress and Elementor connectors

## Install

```
/plugin marketplace add lucidIT-LLC/o-matic-agency
/plugin install agency@o-matic-agency
```

Codex reads the same repo via `.agents/plugins/marketplace.json`.

## This pack ships no MCP server, on purpose

That is the single most important fact about it.

A plugin that declares an `mcpServers` block is **omitted** by hosted-marketplace
hosts. This was measured on two hosts and is exactly reproducible: the host
installed every skill-only plugin and skipped precisely the ones declaring an MCP
server. The constitutive roster used to be trapped inside such a plugin, so on
Cowork, Claude Code desktop, and any sandboxed host, **the factory's orchestrator
simply was not there.**

Shipping skills alone fixes that. The absence of `omatic_*` tools is **not** a
degraded state, **not** advisory mode, and **not** a halt condition.

## How it works with an O-Matic Server

The pack is instructions. The **O-Matic Server** is the control plane — PostgreSQL
with pgvector, the embedder, and an MCP surface, all colocated on the database
host. Clients reach it over a private overlay; there is no desktop broker and
nothing that must be running on a laptop first.

```
  your host (Claude Code · Codex · Cowork · Claude Desktop)
      │   skills from this pack are read as text
      │
      │   MCP over the private overlay, per-client token
      ▼
  O-Matic Server ── PostgreSQL + pgvector ── embedder
      │
      └── grants: this client reaches only its named connections
```

**The host owns the transport; this pack never does.** Claude Code and Codex
connect natively over HTTP with a per-client token and no plugin installed.
Stdio-only hosts use the bridge that ships with the O-Matic Server — it is client
tooling versioned against the server's MCP protocol, which is why it is not
distributed here.

The server's surface is `startup`, `factory_query`, `search`, `connections_list`,
`embed_query`, `omatic_guide`. **Call `omatic_guide` rather than trusting any tool
list copied into a document** — including this one. A copied catalog is how the
previous packs went stale.

### Starting a factory

One call:

```
startup(connection="<the connection for this factory>")
```

It returns the connections this client was granted **and** the factory's startup
card together — identity, corpus and retrieval state, roster readiness, governance
counts, open work, and a computed `READY` / `DEGRADED` / `BLOCKED` with a reason.
Read `state` first. Render the card; do not paraphrase it.

Factory identity comes from that packet — `factory_id`, corroborated by
`current_database()` and `tenant_id`. **Not** from `.omatic/factory.json`, not
from walking folders, and not from searching local files. Active halt-rule #288
forbids all three, and a project root is routing context only.

A grant refusal is a refusal. *"This client was not granted access to X"* means
the grant is working — report it as such, never as an empty result.

## Contents

```
.claude-plugin/marketplace.json    Claude Code catalog
.agents/plugins/marketplace.json   Codex catalog
agency/                            the pack
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  skills/*/SKILL.md
  CHANGELOG.md                     history, extracted from the skill files
shared/system-5-detection.md       canonical fragment, synced into consumers
sync-shared.mjs                    --check exits 1 if a consumer drifted
```

## Verifying a change

```bash
claude plugin validate .        # schema, sources, duplicate names
node sync-shared.mjs --check    # shared fragments have not forked
node ../verify-pack.mjs .       # no retired mechanism survives as an instruction
```

The third one is the important one. It fails the build if a skill routes to a
retired broker, calls a tool this pack does not ship, or names a dead port — the
three ways this corpus has actually gone wrong before.

## Security and compliance

See `SECURITY.md` and `COMPLIANCE.md`. Short version: this repository is text. It
holds no credentials, opens no connections, and makes no compliance claim. The
trust boundary is the O-Matic Server.

## License

MIT. See `LICENSE`.
