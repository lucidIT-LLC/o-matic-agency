# agency — the o-MATIC Factory operating layer

Skills only. No MCP server, no tools, no credentials, nothing that executes.

- **`probot-orchestrator`** — Probot. Plans and routes; runs startup, audits and
  session close. Routes builds to Carver, files to Fred, data to Data, brand to
  Brandy, visuals to Monet. Does not do the work itself.
- **`fred-storage`** — Fred. File and folder custody, the session log, and the
  granted-connection roster. Never holds, enters or relays a credential.
- **`data-analyst`** — Data. Schema integrity, retrieval and embedding health,
  EXPLAIN ANALYZE, factory DBA work.
- **`factory-governance-repair`** — Blueprint-backed remediation for a proven
  governance finding. Probot routes it only after an audit finding and operator
  authorization.

Database access is the O-Matic Server's own MCP surface, configured by the host.
See the marketplace `README.md` for how the two fit together.
