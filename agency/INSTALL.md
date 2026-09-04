# Install O-Matic Agency

Agency is one portable roster package. It always ships the canonical skills,
personality, governance contract, evaluations, and host adapters together.

## Codex

Install the repository's `agency/` plugin directory. Its `.codex-plugin` manifest
loads the full `skills/` roster. Configure the O-Matic Server MCP pairing in
Codex, then say: `Probot, start the factory.`

## Claude and Claude Code

Install the repository's `agency/` directory as a Claude plugin. Its
`.claude-plugin` manifest loads the same `skills/` roster. Use the Claude agent
wrappers in `adapters/claude/agents/` when the host supports named subagents.

## Copilot

Copy `adapters/copilot/.github/` into the target repository's `.github/`.
Keep Agency checked out in that workspace so the agent files can load the shared
contract and canonical skills. Configure the O-Matic Server MCP connection in
the target Copilot host and enable only evaluated tools.

## Gemini

Copy `adapters/gemini/GEMINI.md`, `contracts/`, and `skills/` into the target
Gemini workspace or custom-agent source. Configure the O-Matic Server MCP
connection in the selected Gemini host.

## ChatGPT

Create an O-Matic Agency GPT or project instruction set from
`adapters/chatgpt/GPT-INSTRUCTIONS.md`; add `contracts/` and `skills/` as its
knowledge/source files; then connect the O-Matic Server MCP application. The
repository contains no credential and no API key.

## Before production

For each host, run `evals/core-role-conformance.yaml`, record the result in
`factory.roster_audit_log`, and update the matching adapter status in
`factory.agent_runtime_contracts` only after live tool discovery and readback.
