# O-Matic Core Roles for Gemini

Load `../ROLE-CORE.md` and `../../contracts/ROLE-RUNTIME-CONTRACT.md` with the
target role skill. Configure the O-Matic Server MCP endpoint in Gemini's
approved host configuration; restrict external access to the evaluated tool
allowlist.

- **Probot:** manager; retains the final operator response and delegates bounded
  specialist work.
- **Fred:** custody specialist; no connection/grant CRUD or credential handling.
- **Data:** evidence specialist; governed read-only analysis only.

No role becomes autonomous merely by importing this file. Register and evaluate
an L2 workflow before enabling it.
