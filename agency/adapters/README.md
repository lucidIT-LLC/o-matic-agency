# O-Matic Cross-Platform Agent Adapters

This directory makes the same three O-Matic roles portable without turning them
into five forks. The canonical behavior is
[`../contracts/ROLE-RUNTIME-CONTRACT.md`](../contracts/ROLE-RUNTIME-CONTRACT.md).

## Install one host adapter

| Host | Use this artifact | L1 | L2 |
| --- | --- | --- | --- |
| Codex | `../.codex-plugin` and `../skills/` | Plugin skills | Host agent harness after evaluation |
| Claude | `claude/agents/` plus `../skills/` | Skills/subagents | SDK or bounded subagent after evaluation |
| Copilot | `copilot/.github/agents/` | Custom agents | Host automation after evaluation |
| Gemini | `gemini/` | Custom-agent instructions/skills | Managed/custom workflow after evaluation |
| OpenAI | `openai/agents/` | Agent instructions | Manager/specialist workflow after evaluation |

Copy or import the host directory together with `contracts/`, `skills/`, and
`evals/`. Configure the O-Matic Server MCP connection in the target host; never
copy credentials or connection names into this repository.

Every adapter is intentionally **not deployed** until that host has discovered
its real tool surface and passed `../evals/core-role-conformance.yaml`.
