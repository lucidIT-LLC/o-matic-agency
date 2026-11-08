#!/usr/bin/env node
// build-m365-deploy.mjs — operator deploy build of the Microsoft 365 Copilot
// agents (Probot, Fred, Data) with live MCP tool discovery.
//
// Input is the generated public package in agency/adapters/m365/<role>/appPackage/
// (pinned, read-only, placeholders). This script does not edit it. It writes one
// uploadable zip per role, because the Microsoft 365 app manifest allows exactly
// one declarative agent per app (copilotAgents.declarativeAgents maxItems 1).
//
// Deploy changes, per role:
//   ai-plugin.json   functions [] and run_for_functions ["*"], no mcp_tool_description
//                    (dynamic tool discovery); real MCP URL and SSO registration id
//   instructions     the pinned host-rules block is replaced by
//                    agency/adapters/m365-deploy/host-rules/<role>.txt
//   manifest.json    stable app id from the env file, MCP host in validDomains
//   skills/          the canonical skill, limited to Microsoft's supported file types
//
// Deploy values come from a file outside the repository (see
// agency/adapters/m365-deploy/deploy.env.sample). Agency source keeps placeholders.
//
// Usage: node scripts/build-m365-deploy.mjs <marketplace-root> --env <file> [--out <dir>]
//        node scripts/build-m365-deploy.mjs <marketplace-root> --placeholders   (CI: sample values)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync, mkdtempSync, copyFileSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { makeAjv } from "./vendor/ajv-bundle.mjs";
import { colorVerdict, outlineVerdict, SCHEMA_VERSION, APP_MANIFEST_VERSION, PLUGIN_SCHEMA_VERSION } from "./m365-common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const root = resolve(args.find((a, i) => !a.startsWith("--") && !["--env", "--out"].includes(args[i - 1])) || ".");
const placeholders = args.includes("--placeholders");
const deployDir = join(root, "agency/adapters/m365-deploy");
const envPath = placeholders ? join(deployDir, "deploy.env.sample") : flag("--env");
if (!envPath) {
  console.error("usage: build-m365-deploy.mjs <root> --env <file> [--out <dir>] | --placeholders");
  process.exit(2);
}
const outDir = resolve(flag("--out") || join(root, "dist/m365-deploy"));

// Microsoft limits (declarative agent 1.9, skills in declarative agents, app package).
const LIMIT = {
  instructions: 8000, starters: 12, actions: 10, skills: 8, skillChars: 20000,
  skillFiles: 350, skillDepth: 3, packageBytes: 10 * 1024 * 1024,
  appShort: 30, appFull: 100, descShort: 80, agentName: 100, agentDesc: 1000,
};
const SKILL_EXT = new Set([
  ".json", ".xml", ".yaml", ".yml", ".ini", ".config", ".utf8", ".docx", ".doc", ".docm", ".pdf",
  ".txt", ".rtf", ".md", ".ppt", ".pptx", ".ppsm", ".xlsx", ".xls", ".xlsm", ".csv", ".tsv",
  ".html", ".htm", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".log",
  ".py", ".js", ".mjs", ".cjs", ".ts", ".mts", ".sh", ".bash",
]);
// Host metadata for other agent hosts, not skill content.
const SKILL_SKIP_DIRS = new Set(["agents", "assets"]);
const HOST_RULES_MARKER = "Microsoft 365 Copilot host rules";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const problems = [];
const fail = (m) => problems.push(m);

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const ajv = makeAjv();
const compile = (name) => {
  const schema = JSON.parse(readFileSync(join(here, "m365-schemas", name), "utf8"));
  delete schema.$schema;
  return ajv.compile(schema);
};
const validators = {
  manifest: compile("teams-app-1.30.json"),
  agent: compile("declarative-agent-1.9.json"),
  plugin: compile("plugin-2.4.json"),
};
function validate(kind, role, doc) {
  const v = validators[kind];
  if (!v(doc)) for (const e of (v.errors || []).slice(0, 6)) fail(`${role} ${kind}: ${e.instancePath || "/"} ${e.message}`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function copySkill(src, dest, role) {
  if (!existsSync(join(src, "SKILL.md"))) {
    fail(`${role}: ${src} has no SKILL.md`);
    return 0;
  }
  let count = 0;
  for (const abs of walk(src)) {
    const rel = relative(src, abs);
    const parts = rel.split("/");
    if (parts.length > 1 && SKILL_SKIP_DIRS.has(parts[0])) continue;
    if (!SKILL_EXT.has(extname(abs).toLowerCase())) continue;
    if (parts.length > LIMIT.skillDepth) fail(`${role}: skill file ${rel} is deeper than ${LIMIT.skillDepth}`);
    mkdirSync(dirname(join(dest, rel)), { recursive: true });
    copyFileSync(abs, join(dest, rel));
    count++;
  }
  const skill = readFileSync(join(src, "SKILL.md"), "utf8");
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm || !/^name:\s*\S/m.test(fm[1]) || !/^description:\s*\S/m.test(fm[1])) {
    fail(`${role}: SKILL.md front matter needs name and description`);
  }
  const body = fm ? skill.slice(fm[0].length) : skill;
  if (body.length >= LIMIT.skillChars) fail(`${role}: SKILL.md body is ${body.length} characters (must be under ${LIMIT.skillChars})`);
  return count;
}

const packVersion = JSON.parse(readFileSync(join(root, "agency/.claude-plugin/plugin.json"), "utf8")).version;
const env = readEnv(envPath);
const mcpUrl = env.OMATIC_MCP_URL || "";
const authId = env.OMATIC_ENTRA_SSO_AUTH_ID || "";
let mcpHost = "";
try {
  const u = new URL(mcpUrl);
  if (u.protocol !== "https:") fail(`OMATIC_MCP_URL must be https (got ${u.protocol})`);
  mcpHost = u.host;
} catch {
  fail(`OMATIC_MCP_URL is not a URL: ${mcpUrl || "(empty)"}`);
}
if (!authId) fail("OMATIC_ENTRA_SSO_AUTH_ID is empty");
if (!placeholders && (mcpUrl.includes("replace-at-deploy.invalid") || authId.startsWith("TODO"))) {
  fail("deploy env still holds sample placeholders; pass --placeholders for a CI dry run");
}

const starterOverrides = existsSync(join(deployDir, "starters.json"))
  ? JSON.parse(readFileSync(join(deployDir, "starters.json"), "utf8"))
  : {};
const roles = readdirSync(join(deployDir, "host-rules"))
  .filter((f) => f.endsWith(".txt"))
  .map((f) => f.replace(/\.txt$/, ""))
  .sort();

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const appIds = new Set();
const rows = [];

for (const role of roles) {
  const src = join(root, "agency/adapters/m365", role, "appPackage");
  if (!existsSync(join(src, "manifest.json"))) {
    fail(`${role}: no generated package at ${relative(root, src)}`);
    continue;
  }
  const read = (name) => JSON.parse(readFileSync(join(src, name), "utf8"));
  const manifest = read("manifest.json");
  const agent = read("declarativeAgent.json");
  const pinnedPlugin = read("ai-plugin.json");

  const appId = env[`TEAMS_APP_ID_${role.toUpperCase()}`] || "";
  if (!GUID.test(appId)) fail(`${role}: TEAMS_APP_ID_${role.toUpperCase()} is not a GUID`);
  if (appIds.has(appId.toLowerCase())) fail(`${role}: app id ${appId} is reused by another role`);
  appIds.add(appId.toLowerCase());

  const pinnedText = readFileSync(join(src, "instructions.txt"), "utf8").replace(/\n$/, "");
  const cut = pinnedText.indexOf(HOST_RULES_MARKER);
  if (cut < 0) fail(`${role}: instructions.txt has no "${HOST_RULES_MARKER}" block to replace`);
  const hostRules = readFileSync(join(deployDir, "host-rules", `${role}.txt`), "utf8").replace(/\n$/, "");
  if (!hostRules.startsWith(HOST_RULES_MARKER)) fail(`${role}: host-rules/${role}.txt must start with "${HOST_RULES_MARKER}"`);
  const instructions = `${pinnedText.slice(0, cut < 0 ? pinnedText.length : cut)}${hostRules}`;
  if (instructions.length > LIMIT.instructions) {
    fail(`${role}: instructions are ${instructions.length} characters (max ${LIMIT.instructions})`);
  }

  manifest.id = appId;
  manifest.version = packVersion;
  manifest.validDomains = mcpHost ? [mcpHost] : [];

  agent.instructions = instructions;
  if (Array.isArray(starterOverrides[role])) {
    agent.conversation_starters = starterOverrides[role].map(([title, text]) => ({ title, text }));
  }

  const runtime = pinnedPlugin.runtimes?.[0] || {};
  const plugin = {
    $schema: pinnedPlugin.$schema,
    schema_version: pinnedPlugin.schema_version,
    name_for_human: pinnedPlugin.name_for_human,
    description_for_human: `o-MATIC Server tools for ${agent.name}, discovered live.`,
    namespace: pinnedPlugin.namespace,
    functions: [],
    runtimes: [{
      type: "RemoteMCPServer",
      auth: { type: "OAuthPluginVault", reference_id: authId },
      run_for_functions: ["*"],
      spec: { url: mcpUrl },
    }],
    privacy_policy_url: pinnedPlugin.privacy_policy_url,
    legal_info_url: pinnedPlugin.legal_info_url,
  };
  if (runtime.type !== "RemoteMCPServer") fail(`${role}: source plugin runtime is ${runtime.type}, want RemoteMCPServer`);

  validate("manifest", role, manifest);
  validate("agent", role, agent);
  validate("plugin", role, plugin);
  if (manifest.manifestVersion !== APP_MANIFEST_VERSION) fail(`${role}: manifestVersion ${manifest.manifestVersion}`);
  if (agent.version !== SCHEMA_VERSION) fail(`${role}: declarative agent ${agent.version}`);
  if (plugin.schema_version !== PLUGIN_SCHEMA_VERSION) fail(`${role}: plugin ${plugin.schema_version}`);
  if ((manifest.copilotAgents?.declarativeAgents || []).length !== 1) fail(`${role}: an app holds exactly one declarative agent`);
  if ((manifest.name?.short || "").length > LIMIT.appShort) fail(`${role}: short name over ${LIMIT.appShort}`);
  if ((manifest.name?.full || "").length > LIMIT.appFull) fail(`${role}: full name over ${LIMIT.appFull}`);
  if ((manifest.description?.short || "").length > LIMIT.descShort) fail(`${role}: short description over ${LIMIT.descShort}`);
  if ((agent.name || "").length > LIMIT.agentName) fail(`${role}: agent name over ${LIMIT.agentName}`);
  if ((agent.description || "").length > LIMIT.agentDesc) fail(`${role}: agent description over ${LIMIT.agentDesc}`);
  if ((agent.conversation_starters || []).length > LIMIT.starters) fail(`${role}: more than ${LIMIT.starters} starters`);
  if (!(agent.actions || []).length || agent.actions.length > LIMIT.actions) fail(`${role}: actions must hold 1 to ${LIMIT.actions}`);
  if ((agent.agent_skills || []).length > LIMIT.skills) fail(`${role}: more than ${LIMIT.skills} skills`);

  const stage = mkdtempSync(join(tmpdir(), `m365-deploy-${role}-`));
  writeFileSync(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(stage, "declarativeAgent.json"), JSON.stringify(agent, null, 2) + "\n");
  const actionFile = agent.actions?.[0]?.file || "ai-plugin.json";
  writeFileSync(join(stage, actionFile), JSON.stringify(plugin, null, 2) + "\n");
  for (const icon of ["color.png", "outline.png"]) {
    if (!existsSync(join(src, icon))) {
      fail(`${role}: ${icon} is missing`);
      continue;
    }
    copyFileSync(join(src, icon), join(stage, icon));
  }
  const color = colorVerdict(readFileSync(join(src, "color.png")));
  if (!color.ok) fail(`${role}: ${color.reason}`);
  const outline = outlineVerdict(readFileSync(join(src, "outline.png")));
  if (!outline.ok) fail(`${role}: ${outline.reason}`);

  let skillFiles = 0;
  for (const skill of agent.agent_skills || []) {
    const folder = String(skill.folder || "").replace(/^\.\//, "");
    if (!folder || folder.includes("..")) {
      fail(`${role}: bad skill folder ${skill.folder}`);
      continue;
    }
    const name = folder.split("/").pop();
    const skillSrc = join(root, "agency/skills", name);
    if (!existsSync(skillSrc)) {
      fail(`${role}: skill ${name} is not in agency/skills`);
      continue;
    }
    skillFiles += copySkill(skillSrc, join(stage, folder), role);
  }
  if (skillFiles > LIMIT.skillFiles) fail(`${role}: ${skillFiles} skill files (max ${LIMIT.skillFiles})`);

  const files = walk(stage).map((p) => relative(stage, p)).sort();
  if (files.some((f) => f.toLowerCase().endsWith(".svg"))) fail(`${role}: package contains an .svg file`);
  if (files.includes("mcp-tools.json")) fail(`${role}: dynamic package must not ship mcp-tools.json`);

  const zipName = `copilot-core-agents-${role}-${packVersion}.zip`;
  const zipPath = join(outDir, zipName);
  const zipped = spawnSync("zip", ["-X", "-q", zipPath, ...files], { cwd: stage });
  if (zipped.status !== 0) fail(`${role}: zip failed: ${zipped.stderr?.toString() || zipped.error}`);
  rmSync(stage, { recursive: true, force: true });
  if (!existsSync(zipPath)) continue;
  const bytes = readFileSync(zipPath);
  if (bytes.length > LIMIT.packageBytes) fail(`${role}: package is ${bytes.length} bytes (max ${LIMIT.packageBytes})`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  rows.push({ role, zip: zipName, appId, sha256, bytes: bytes.length, instructions: instructions.length, files: files.length });
}

for (const row of rows) {
  console.log(`zip:  ${relative(root, join(outDir, row.zip))}`);
  console.log(`      app id ${row.appId}  instructions ${row.instructions}/${LIMIT.instructions}  files ${row.files}  ${row.bytes} bytes`);
  console.log(`      sha256 ${row.sha256}`);
}
writeFileSync(join(outDir, "packages.json"), JSON.stringify({ version: packVersion, mcpHost, discovery: "dynamic", packages: rows }, null, 2) + "\n");
if (problems.length) {
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log(`\nRESULT: FAIL — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`\nRESULT: PASS — ${rows.length} package(s) in ${relative(root, outDir) || outDir}`);
