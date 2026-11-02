#!/usr/bin/env node
// build-m365-packages.mjs — zip each Microsoft 365 Copilot app into dist/m365/.
//
// dist/ is gitignored. Nothing here is published, sideloaded, or released.
// Placeholders are resolved from adapters/m365/<role>/env/.env.sample, which
// holds TODO values only: no tenant id, no private host, no secret.
//
// Usage: node scripts/build-m365-packages.mjs <marketplace-root>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, cpSync, rmSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const rootArg = process.argv[2];
if (!rootArg) {
  console.error("usage: build-m365-packages.mjs <marketplace-root>");
  process.exit(2);
}
const root = resolve(rootArg);

const pluginDir = "agency";
const base = join(root, pluginDir, "adapters/m365");
const packVersion = JSON.parse(readFileSync(join(root, pluginDir, ".claude-plugin/plugin.json"), "utf8")).version;
const outDir = join(root, "dist/m365");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

function readEnv(roleDir) {
  const env = {};
  const sample = join(roleDir, "env", ".env.sample");
  if (!existsSync(sample)) return env;
  for (const line of readFileSync(sample, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function substText(text, env) {
  let s = text;
  for (const [k, v] of Object.entries(env)) s = s.split(`\${{${k}}}`).join(v);
  return s;
}

function substJson(value, env) {
  if (typeof value === "string") return substText(value, env);
  if (Array.isArray(value)) return value.map((x) => substJson(x, env));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substJson(v, env)]));
  }
  return value;
}

const roles = readdirSync(base).filter((name) => existsSync(join(base, name, "appPackage", "manifest.json")));
const catalog = [];

for (const role of roles) {
  const roleDir = join(base, role);
  const pkg = join(roleDir, "appPackage");
  const env = readEnv(roleDir);
  env.PACK_VERSION = env.PACK_VERSION || packVersion;
  const stage = mkdtempSync(join(tmpdir(), `m365-${role}-`));
  const instructions = readFileSync(join(pkg, "instructions.txt"), "utf8").replace(/\n$/, "");
  for (const name of readdirSync(pkg)) {
    const src = join(pkg, name);
    if (name === "declarativeAgent.json") {
      const agent = substJson(JSON.parse(readFileSync(src, "utf8")), env);
      if (typeof agent.instructions === "string" && agent.instructions.startsWith("$[file(")) {
        agent.instructions = instructions;
      }
      writeFileSync(join(stage, name), JSON.stringify(agent, null, 2) + "\n");
      continue;
    }
    if (name.endsWith(".json")) {
      const doc = substJson(JSON.parse(readFileSync(src, "utf8")), env);
      writeFileSync(join(stage, name), JSON.stringify(doc, null, 2) + "\n");
      continue;
    }
    cpSync(src, join(stage, name));
  }
  const agent = JSON.parse(readFileSync(join(stage, "declarativeAgent.json"), "utf8"));
  for (const skill of agent.agent_skills || []) {
    const folder = String(skill.folder || "").replace(/^\.\//, "");
    const skillName = folder.split("/").pop();
    const src = join(root, pluginDir, "skills", skillName);
    if (!existsSync(src)) {
      console.error(`MISSING SKILL: ${role} references ${skill.folder} and agency/skills/${skillName} is not there`);
      process.exit(1);
    }
    cpSync(src, join(stage, folder), { recursive: true });
  }
  const zipName = `o-matic-agency-${role}-${packVersion}.zip`;
  const zipPath = join(outDir, zipName);
  const zipped = spawnSync("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: stage });
  if (zipped.status !== 0) {
    console.error(`zip failed for ${role} (status ${zipped.status}): ${zipped.stderr?.toString() || zipped.error || "no stderr"}`);
    process.exit(1);
  }
  rmSync(stage, { recursive: true, force: true });
  const sha = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
  const manifest = JSON.parse(substText(readFileSync(join(pkg, "manifest.json"), "utf8"), env));
  const tools = existsSync(join(pkg, "ai-plugin.json"))
    ? JSON.parse(readFileSync(join(pkg, "ai-plugin.json"), "utf8")).runtimes[0].run_for_functions
    : [];
  const color = existsSync(join(pkg, "color.png"));
  const outline = existsSync(join(pkg, "outline.png"));
  catalog.push({ role, version: packVersion, zip: zipName, sha256: sha, tools, wave: null, icons: { color, outline } });
  console.log(`zip:  dist/m365/${zipName}`);
  console.log(`      sha256 ${sha}`);
  if (!outline || !color) console.log(`      icon-pending: ${[!color && "color.png", !outline && "outline.png"].filter(Boolean).join(", ")}`);
}

const statusPath = join(base, "CATALOG.md");
if (existsSync(statusPath)) {
  const text = readFileSync(statusPath, "utf8");
  for (const row of catalog) {
    const m = text.match(new RegExp(`\\| ${row.role} \\| (\\d+|—) \\|`));
    row.wave = m ? m[1] : "—";
  }
}

const lines = [
  "# Microsoft 365 Copilot packages (build output)",
  "",
  "Generated by scripts/build-m365-packages.mjs. This directory is gitignored.",
  "These zips are not uploaded, sideloaded, or attached to a release.",
  "The MCP URL and the Teams app id inside each zip are TODO placeholders from env/.env.sample.",
  "",
  "| Role | Zip | SHA-256 | Tools | Icons |",
  "|---|---|---|---|---|",
];
for (const row of catalog) {
  const icons = row.icons.color && row.icons.outline ? "color + outline" : "icon-pending";
  lines.push(`| ${row.role} | ${row.zip} | \`${row.sha256}\` | ${row.tools.length} | ${icons} |`);
}
lines.push("");
writeFileSync(join(outDir, "CATALOG.md"), lines.join("\n"));
console.log(`\ndone — ${catalog.length} package(s) in dist/m365/`);
