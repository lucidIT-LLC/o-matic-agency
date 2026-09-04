# OpenAI Agent Import

Create three Agents from the files in `agents/`. Probot is the manager Agent;
Fred and Data are specialist Agents exposed to Probot as bounded tools. Attach
the O-Matic Server through the host's approved MCP configuration and restrict
tools to the live, evaluated allowlist. No OpenAI API key is stored or required
by this repository.

Use manager-style delegation, not default handoffs: Probot keeps the final
operator response and shared guardrails. See `../../contracts/PLATFORM-ADAPTER-READINESS.md` before marking the adapter deployed.
