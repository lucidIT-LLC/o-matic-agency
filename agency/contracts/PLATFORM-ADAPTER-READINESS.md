# Platform Adapter Readiness

Status words are evidence words. `design verified` means current official
documentation was checked and the target artifact has been chosen. It does not
mean a live agent exists. `adapter verified` additionally requires a host-side
tool discovery, the core-role conformance suite, and a retained trace.

| Platform | Target artifact | Core-role design | Current status | Required deployment evidence |
| --- | --- | --- | --- | --- |
| OpenAI | Agents SDK Agent + O-Matic Server MCP | Probot is the manager. Fred and Data are bounded specialist Agents-as-tools; direct handoff only when the specialist must own the conversation. | design verified | MCP tool filter, approval policy, manager/specialist trace, conformance results |
| Codex | Codex plugin skills for L1; separate agent harness for L2 | The same canonical contract is loaded through a Codex adapter. Do not call a skill an autonomous deployment. | design verified | installed package digest, live tool discovery, L1 trace; L2 harness and evaluation trace |
| Claude | Skill adapter for L1; explicit subagent or SDK harness for L2 | Skill files remain a host adapter, while MCP is the common O-Matic Server path. | design verified | project MCP approval, tool discovery, L1 trace; autonomous trigger and permission policy for L2 |
| Copilot | Custom `.agent.md` plus focused skills | Create one custom agent per core role; select only host-verified tools because tool names differ by Copilot surface. | design verified | actual Copilot-surface tool inventory, MCP connection, skill discovery, conformance trace |
| Gemini | Managed/custom agent with skills and O-Matic Server MCP | Use a custom Agent configuration with skills. Keep credentials least-privileged and network access allowlisted. | design verified | agent config, restricted egress, MCP/tool discovery, human-oversight check, conformance trace |

## Documentation decisions

- **OpenAI:** Agents SDK documents a manager pattern for one agent to own
  guardrails and final output, with specialists exposed as tools; direct
  handoffs are for a specialist taking over the conversation. Streamable HTTP
  MCP supports explicit tool filtering and stable server-prefixed names.
- **Codex:** Plugins package skills and MCP surfaces. A Codex skill is an L1
  runtime adapter; an L2 claim needs an independently deployed agent harness,
  bounded authority, and evaluated trace.
- **Claude:** MCP is the host-neutral external-systems interface. Project MCP
  configuration requires user approval; autonomous execution must never inherit
  an unbounded permission mode merely because a role is eligible for L2.
- **Copilot:** Microsoft documents custom agents as `.agent.md` files and
  reusable skills separately. It warns that tool names vary by Copilot host, so
  adapters must discover and test their actual tool list.
- **Gemini:** Gemini supports managed custom agents extended with instructions,
  skills, data, and MCP. Its current guidance requires trusted tools,
  least-privilege credentials, restricted network access, and human oversight;
  managed agents are preview and therefore remain non-production until the
  adapter evaluation passes.

## Release gate

An adapter is `production verified` only when all of the following are attached
to its database runtime-contract row:

1. canonical contract version and SHA-256 digest;
2. exact host artifact and host version;
3. least-privilege tool allowlist and approval policy;
4. successful live tool discovery against O-Matic Server;
5. passing `core-role-conformance.yaml` cases;
6. trace/evaluation location, timestamp, owner, and rollback procedure.

No platform gets an exception. A strong model is not a deployment process.
