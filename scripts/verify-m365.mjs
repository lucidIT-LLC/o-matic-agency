#!/usr/bin/env node
// verify-m365.mjs — Microsoft 365 Copilot packages.
//
// Validates every app manifest, declarative agent, and plugin against the
// vendored Microsoft JSON schemas (declarative agent 1.9, plugin 2.4, Teams
// app manifest 1.30). Placeholders are filled only in memory. Icon checks
// warn when art is missing (icon-pending) and fail when a shipped icon is the
// wrong size or the outline is not white-on-transparent.
//
// Usage: node scripts/verify-m365.mjs <marketplace-root> [--dist]
// --dist also validates the zips in dist/m365/.
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeAjv } from "./vendor/ajv-bundle.mjs";
import {
  M365_BUILTIN, MAX_TOOLS, isDeniedTool, PRIVACY_URL,
  MCP_URL_PLACEHOLDER, APP_ID_PLACEHOLDER, AUTH_ID_PLACEHOLDER,
  colorVerdict, outlineVerdict, SCHEMA_VERSION, APP_MANIFEST_VERSION,
} from "./m365-common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const distMode = args.includes("--dist");
const root = args.find((a) => !a.startsWith("--"));
if (!root) {
  console.error("usage: verify-m365.mjs <marketplace-root> [--dist]");
  process.exit(2);
}

const ajv = makeAjv();

let fails = 0;
let warns = 0;
const FAIL = (m) => { console.log(`  FAIL  ${m}`); fails++; };
const WARN = (m) => { console.log(`  warn  ${m}`); warns++; };
const OK = (m) => { console.log(`  ok    ${m}`); };
const pending = [];

function loadSchema(name) {
  const schema = JSON.parse(readFileSync(join(here, "m365-schemas", name), "utf8"));
  delete schema.$schema;
  return ajv.compile(schema);
}
const validators = {
  manifest: loadSchema("teams-app-1.30.json"),
  agent: loadSchema("declarative-agent-1.9.json"),
  plugin: loadSchema("plugin-2.4.json"),
};

function subst(value, env) {
  if (typeof value === "string") {
    let s = value;
    for (const [k, v] of Object.entries(env)) s = s.split(`\${{${k}}}`).join(v);
    return s;
  }
  if (Array.isArray(value)) return value.map((x) => subst(x, env));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, subst(v, env)]));
  }
  return value;
}

function schemaErrors(validate, data) {
  if (validate(data)) return [];
  return (validate.errors || []).slice(0, 6).map((e) => `${e.instancePath || "/"} ${e.message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function envFor(roleDir, role) {
  const sample = join(roleDir, "env", ".env.sample");
  const env = {
    OMATIC_MCP_URL: "https://TODO.example.invalid/mcp",
    OMATIC_ENTRA_SSO_AUTH_ID: "TODO-entra-sso-auth-id",
    TEAMS_APP_ID: `00000000-0000-4000-8000-${String(role.length).padStart(12, "0")}`,
    PACK_VERSION: "0.0.0",
  };
  if (!existsSync(sample)) return env;
  for (const line of readFileSync(sample, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !m[2].includes(" ")) env[m[1]] = m[2];
  }
  return env;
}

function checkIcons(dir, role) {
  const colorPath = join(dir, "color.png");
  const outlinePath = join(dir, "outline.png");
  let colorOk = false;
  let outlineOk = false;
  if (!existsSync(colorPath)) {
    WARN(`${role}: color.png missing — icon-pending`);
  } else {
    const verdict = colorVerdict(readFileSync(colorPath));
    if (!verdict.ok) FAIL(`${role}: ${verdict.reason}`);
    else { colorOk = true; OK(`${role}: color.png is 192x192`); }
  }
  if (!existsSync(outlinePath)) {
    WARN(`${role}: outline.png missing — icon-pending (white-on-transparent 32x32 still to come)`);
  } else {
    const verdict = outlineVerdict(readFileSync(outlinePath));
    if (!verdict.ok) FAIL(`${role}: ${verdict.reason}`);
    else { outlineOk = true; OK(`${role}: outline.png is 32x32 ${verdict.kind} on transparent`); }
  }
  if (!colorOk || !outlineOk) pending.push(role);
}

function checkPackage(dir, role, { zipped = false } = {}) {
  const manifestPath = join(dir, "manifest.json");
  const agentPath = join(dir, "declarativeAgent.json");
  const instructionsPath = join(dir, "instructions.txt");
  if (!existsSync(manifestPath) || !existsSync(agentPath) || !existsSync(instructionsPath)) {
    FAIL(`${role}: app package is missing manifest.json, declarativeAgent.json, or instructions.txt`);
    return;
  }
  const manifestRaw = readFileSync(manifestPath, "utf8");
  const agentRaw = readFileSync(agentPath, "utf8");
  const pluginPath = join(dir, "ai-plugin.json");
  const pluginRaw = existsSync(pluginPath) ? readFileSync(pluginPath, "utf8") : "";
  const instructions = readFileSync(instructionsPath, "utf8");

  if (!zipped) {
    if (!manifestRaw.includes(APP_ID_PLACEHOLDER)) FAIL(`${role}: app id is not the ${APP_ID_PLACEHOLDER} placeholder`);
    else OK(`${role}: app id stays a placeholder`);
    if (pluginRaw && !pluginRaw.includes(MCP_URL_PLACEHOLDER)) FAIL(`${role}: MCP url is not ${MCP_URL_PLACEHOLDER}`);
    else if (pluginRaw) OK(`${role}: MCP url stays a placeholder`);
    if (pluginRaw && !pluginRaw.includes(AUTH_ID_PLACEHOLDER)) FAIL(`${role}: SSO auth id is not a placeholder`);
    if (/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/.test(manifestRaw + pluginRaw)) {
      FAIL(`${role}: a GUID is baked into the source manifest`);
    }
    const blob = manifestRaw + agentRaw + pluginRaw + instructions;
    if (/https?:\/\/[A-Za-z0-9.-]+\.ts\.net/.test(blob) || /factory\.o-matic\.ai/.test(blob)) {
      FAIL(`${role}: package names a private or production host`);
    }
  }

  const env = envFor(join(dir, ".."), role);
  if (!String(env.OMATIC_PRIVACY_URL || PRIVACY_URL).includes("TODO") && !zipped) {
    FAIL(`${role}: privacy URL is not marked TODO`);
  }
  let manifest = subst(JSON.parse(manifestRaw), env);
  let agent = subst(JSON.parse(agentRaw), env);
  if (typeof agent.instructions === "string" && agent.instructions.startsWith("$[file(")) {
    agent = { ...agent, instructions: instructions.replace(/\n$/, "") };
  }
  // The packaged zip inlines instructions. Either form must satisfy the schema.
  if (zipped && typeof agent.instructions === "string" && agent.instructions.startsWith("$[file(")) {
    agent = { ...agent, instructions: instructions.replace(/\n$/, "") };
  }

  for (const err of schemaErrors(validators.manifest, manifest)) FAIL(`${role} manifest: ${err}`);
  if (validators.manifest(manifest)) OK(`${role}: app manifest matches Teams ${APP_MANIFEST_VERSION}`);
  for (const err of schemaErrors(validators.agent, agent)) FAIL(`${role} declarative agent: ${err}`);
  if (validators.agent(agent)) OK(`${role}: declarative agent matches ${SCHEMA_VERSION}`);

  if (manifest.manifestVersion !== APP_MANIFEST_VERSION) FAIL(`${role}: manifestVersion is ${manifest.manifestVersion}`);
  if (agent.version !== SCHEMA_VERSION) FAIL(`${role}: declarative agent version is ${agent.version}`);
  if ((manifest.copilotAgents?.declarativeAgents || []).length !== 1) {
    FAIL(`${role}: an app holds exactly one declarative agent`);
  }
  const short = manifest.name?.short || "";
  const full = manifest.name?.full || "";
  if (short.length > 30) FAIL(`${role}: short name is ${short.length} characters (max 30)`);
  if (full.length > 100) FAIL(`${role}: full name is ${full.length} characters (max 100)`);
  if ((manifest.description?.short || "").length > 80) FAIL(`${role}: short description is over 80 characters`);
  if ((manifest.description?.full || "").length > 4000) FAIL(`${role}: full description is over 4,000 characters`);
  if ((agent.name || "").length > 100) FAIL(`${role}: agent name is over 100 characters`);
  if ((agent.description || "").length > 1000) FAIL(`${role}: agent description is over 1,000 characters`);
  if (instructions.length > 8000) FAIL(`${role}: instructions are ${instructions.length} characters (max 8,000)`);
  else OK(`${role}: instructions ${instructions.length} / 8,000`);

  const privacy = manifest.developer?.privacyUrl || "";
  const terms = manifest.developer?.termsOfUseUrl || "";
  if (!privacy.includes("TODO")) FAIL(`${role}: privacy URL is not clearly marked TODO`);
  else OK(`${role}: privacy URL is marked TODO`);
  if (!terms.includes("TODO")) FAIL(`${role}: terms URL is not clearly marked TODO`);
  else OK(`${role}: terms URL is marked TODO`);
  if (!manifest.developer?.name || !manifest.developer?.websiteUrl) FAIL(`${role}: developer name or website is missing`);
  else OK(`${role}: developer info is present (${manifest.developer.name})`);

  if (agent.name !== short) FAIL(`${role}: agent name "${agent.name}" does not match app short name "${short}"`);
  else OK(`${role}: agent name matches the app short name`);

  const starters = agent.conversation_starters || [];
  if (starters.length < 3 || starters.length > 6) FAIL(`${role}: ${starters.length} conversation starters (want 3 to 6)`);
  const texts = new Set();
  const titles = new Set();
  for (const s of starters) {
    if (!s.title) FAIL(`${role}: a conversation starter has no title`);
    if (texts.has(s.text)) FAIL(`${role}: duplicated starter text: ${s.text}`);
    if (s.title && titles.has(s.title)) FAIL(`${role}: duplicated starter title: ${s.title}`);
    texts.add(s.text);
    if (s.title) titles.add(s.title);
  }
  if (starters.length >= 3 && texts.size === starters.length && titles.size === starters.length) {
    OK(`${role}: ${starters.length} unique titled starters`);
  }

  const expected = M365_BUILTIN[role];
  if (expected) {
    if ((agent.description || "") !== (manifest.description?.full || "")) {
      FAIL(`${role}: agent description does not match the app full description`);
    }
  }

  const wantsPlugin = expected ? expected.tools.length > 0 : existsSync(pluginPath);
  if (wantsPlugin && !existsSync(pluginPath)) FAIL(`${role}: tool-using agent has no ai-plugin.json`);
  if (!wantsPlugin && existsSync(pluginPath)) FAIL(`${role}: prompt-only agent shipped a plugin`);
  if (existsSync(pluginPath)) {
    let plugin = subst(JSON.parse(pluginRaw || readFileSync(pluginPath, "utf8")), env);
    for (const err of schemaErrors(validators.plugin, plugin)) FAIL(`${role} plugin: ${err}`);
    if (validators.plugin(plugin)) OK(`${role}: plugin matches schema 2.4`);
    if (plugin.name_for_human !== agent.name) {
      FAIL(`${role}: plugin name "${plugin.name_for_human}" does not match agent name "${agent.name}"`);
    } else OK(`${role}: plugin name matches the agent name`);
    const runtime = (plugin.runtimes || [])[0] || {};
    const pinned = runtime.run_for_functions || [];
    const named = (plugin.functions || []).map((f) => f.name);
    if (pinned.length > MAX_TOOLS) FAIL(`${role}: ${pinned.length} pinned tools (max ${MAX_TOOLS})`);
    if (pinned.length !== named.length || pinned.some((n, i) => n !== named[i])) {
      FAIL(`${role}: run_for_functions does not match the function list`);
    }
    for (const name of pinned) {
      if (isDeniedTool(name)) FAIL(`${role}: pinned tool ${name} is on the deny list`);
    }
    if (expected) {
      const want = expected.tools.join(",");
      if (pinned.join(",") !== want) FAIL(`${role}: pinned tools are [${pinned.join(", ")}], plan wants [${want}]`);
      else OK(`${role}: ${pinned.length} read-only tools match the plan`);
    } else if (!pinned.some(isDeniedTool)) OK(`${role}: ${pinned.length} pinned tools, none denied`);
    const toolsPath = join(dir, "mcp-tools.json");
    if (!existsSync(toolsPath)) FAIL(`${role}: plugin points at mcp-tools.json but the file is missing`);
    else {
      const toolsDoc = JSON.parse(readFileSync(toolsPath, "utf8"));
      const listed = (toolsDoc.tools || []).map((t) => t.name);
      if (listed.join(",") !== pinned.join(",")) FAIL(`${role}: mcp-tools.json names do not match the pin list`);
      else OK(`${role}: mcp-tools.json lists the same ${listed.length} tools`);
    }
    if (runtime.spec?.url && !String(runtime.spec.url).includes("TODO") && !zipped) {
      FAIL(`${role}: resolved MCP url is not a TODO placeholder`);
    }
    if (zipped && runtime.spec?.url && !String(runtime.spec.url).includes("TODO")) {
      FAIL(`${role}: packaged MCP url is not a TODO placeholder`);
    }
  }

  checkIcons(dir, role);
}

function packagesIn(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((name) => statSync(join(base, name)).isDirectory());
}

console.log(`\n=== Microsoft 365 Copilot packages — ${root}${distMode ? " (dist)" : ""} ===\n`);

if (!distMode) {
  const base = join(root, "agency/adapters/m365");
  const roles = packagesIn(base).filter((name) => existsSync(join(base, name, "appPackage")));
  if (!roles.length) FAIL("no agency/adapters/m365/<role>/appPackage directories");
  for (const role of roles) checkPackage(join(base, role, "appPackage"), role);
} else {
  const dist = join(root, "dist/m365");
  if (!existsSync(dist)) FAIL("dist/m365 is missing — run scripts/build-m365-packages.mjs");
  else {
    const zips = readdirSync(dist).filter((f) => f.endsWith(".zip"));
    if (!zips.length) FAIL("dist/m365 has no zip packages");
    const stage = mkdtempSync(join(tmpdir(), "m365-zip-"));
    for (const zip of zips) {
      const dest = join(stage, zip.replace(/\.zip$/, ""));
      spawnSync("unzip", ["-q", join(dist, zip), "-d", dest], { stdio: "inherit" });
      const role = zip.split("-").slice(-2, -1)[0] || zip;
      // o-matic-agency-<role>-<version>.zip
      const m = zip.match(/-([a-z0-9]+)-\d+\.\d+\.\d+\.zip$/);
      checkPackage(dest, m ? m[1] : role, { zipped: true });
    }
    rmSync(stage, { recursive: true, force: true });
  }
}

if (pending.length) {
  console.log(`\nicon-pending: ${[...new Set(pending)].join(", ")}`);
}
console.log(`\n${fails ? "RESULT: FAIL" : "RESULT: PASS"} — ${fails} fail, ${warns} warn\n`);
process.exit(fails ? 1 : 0);
