# Microsoft 365 Copilot — operator deploy build (live tool discovery)

`agency/adapters/m365/` holds the public, pinned, read-only packages with placeholder URLs. This directory turns them into uploadable agents for one factory, without putting that factory's URL or IDs in the repository.

## What it builds

One zip per role (Probot, Fred, Data). The Microsoft 365 app manifest allows exactly one declarative agent per app (`copilotAgents.declarativeAgents` has `maxItems: 1`), so three agents ship as three apps.

Each zip holds:

| File | Content |
|---|---|
| `manifest.json` | Teams app manifest 1.30, stable app ID from the env file, MCP host in `validDomains` |
| `declarativeAgent.json` | Declarative agent 1.9: gold-record persona plus `host-rules/<role>.txt`, starters, `agent_skills`, one action |
| `ai-plugin.json` | Plugin 2.4 `RemoteMCPServer`, `OAuthPluginVault`, `functions: []`, `run_for_functions: ["*"]`, no `mcp_tool_description` (dynamic tool discovery) |
| `skills/<skill>/` | The canonical skill, limited to Microsoft's supported skill file types (no `.svg`, no other-host metadata) |
| `color.png`, `outline.png` | 192×192 and 32×32 icons from the public package |

The builder checks every file against the vendored Microsoft schemas and the documented limits: instructions ≤ 8,000 characters, `SKILL.md` under 20,000, ≤ 12 starters, 1–10 actions, ≤ 8 skills, ≤ 350 skill files, package ≤ 10 MB, unique GUID app IDs, HTTPS MCP URL.

## Build

```
cp agency/adapters/m365-deploy/deploy.env.sample /somewhere/outside/the/repo/deploy.env
# fill in OMATIC_MCP_URL, OMATIC_ENTRA_SSO_AUTH_ID, TEAMS_APP_ID_PROBOT/FRED/DATA
node scripts/build-m365-deploy.mjs . --env /somewhere/outside/the/repo/deploy.env
```

Zips land in `dist/m365-deploy/` (gitignored) with `packages.json` (SHA-256, app IDs). `--placeholders` builds with the sample values as a dry run.

Keep the app IDs from the first upload. Reusing them lets a later upload update the same agents.

## Auth prerequisites

- The SSO registration (Teams Developer Portal → Tools → Microsoft Entra SSO client ID registration) has Base URL equal to `OMATIC_MCP_URL`.
- "Restrict usage by app" is **Any Teams app** when one registration serves the connector and these agents. A registration bound to one app ID fails for the others with "App ID used in the request does not match".

## Upload

Microsoft 365 admin center → **Agents** → **All agents** → **Upload custom agent** (some tenants label it **Add agent**). One zip at a time. Personal test: Teams → **Apps** → **Manage your apps** → **Upload an app** → **Upload a custom app**.

These are declarative agents, not plugins. **Agents → Tools → Registry** is the plugin, skill and MCP connector path.
