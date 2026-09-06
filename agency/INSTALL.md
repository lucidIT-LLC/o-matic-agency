# Install o-MATIC Agency

Agency is one portable roster package. It always ships the canonical skills,
personality, governance contract, evaluations, and host adapters together.

## Codex

Install the repository's `agency/` plugin directory. Its `.codex-plugin` manifest
loads the full `skills/` roster. Configure the o-MATIC Server MCP pairing in
Codex, then say: `Probot, start the factory.`

## Claude and Claude Code

Install the repository's `agency/` directory as a Claude plugin. Its
`.claude-plugin` manifest loads the same `skills/` roster. Use the Claude agent
wrappers in `adapters/claude/agents/` when the host supports named subagents.

## Copilot

Copy `adapters/copilot/.github/` into the target repository's `.github/`. That
directory is a **self-contained payload**: `.github/omatic/` carries the role
core and both contracts, and the three agent files load them as
`../omatic/<file>`, which resolves inside this pack and inside the target
repository alike. Nothing else has to be copied and Agency does not have to be
checked out in that workspace.

`.github/omatic/` holds generated copies. Never edit them; edit the canonical
files under `adapters/` and `contracts/`, then run
`node scripts/sync-copilot-payload.mjs`. `--check` fails if a copy has drifted.
Copy the `skills/` roster in as well only if you want the full role skills in
that repository; the agent files do not depend on it.

## Gemini

Copy `adapters/gemini/GEMINI.md`, `contracts/`, and `skills/` into the target
Gemini workspace or custom-agent source. Configure the o-MATIC Server MCP
connection in the selected Gemini host.

## ChatGPT

Create an o-MATIC Agency GPT or project instruction set from
`adapters/chatgpt/GPT-INSTRUCTIONS.md`; add `contracts/` and `skills/` as its
knowledge/source files; then connect the o-MATIC Server MCP application. The
repository contains no credential and no API key.

## Before production

For each host:

1. `claude plugin validate .` — a skill whose YAML frontmatter fails to parse is
   loaded with **empty metadata and no error**, so it never surfaces. Reading the
   file does not catch this; validation does.
2. `node scripts/check-paths.mjs` — resolves every relative reference in the pack
   and re-resolves the Copilot payload from a scratch repository.
3. `node scripts/sync-copilot-payload.mjs --check` — vendored contract copies are
   current.
4. Run **both** `evals/core-role-conformance.yaml` and
   `evals/core-kernel-continuity.yaml`. Every case carries a `fail_variant`; run
   it too. A suite that has never returned `fail` has not been shown to work.
5. Record the result in `factory.roster_audit_log` and update the matching
   adapter status in `factory.agent_runtime_contracts` only after live tool
   discovery and readback. Database writes route to Data (decision #415).
