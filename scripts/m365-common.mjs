// Shared constants for the Microsoft 365 Copilot packages.
// The pin list is the Copilot host table (same kind of host-specific table as
// the Grok Bot lines in build-host-adapters.mjs). agent-pack.json stays the
// gold record. A future export may set targets.m365; until then this is the
// source the generator and the verifier both import.
import { inflateSync } from "node:zlib";

export const SCHEMA_VERSION = "v1.9";
export const APP_MANIFEST_VERSION = "1.30";
export const PLUGIN_SCHEMA_VERSION = "v2.4";
export const MAX_TOOLS = 8;
export const ACCENT = "#00B5AD";
export const DEVELOPER_NAME = "lucidIT, LLC (o-MATIC)";
export const WEBSITE_URL = "https://o-matic.ai";
export const PRIVACY_URL = "https://www.o-matic.ai/privacy-policy/";
export const TERMS_URL = "https://www.o-matic.ai/terms-of-service/";
export const MCP_URL_PLACEHOLDER = "${{OMATIC_MCP_URL}}";
export const APP_ID_PLACEHOLDER = "${{TEAMS_APP_ID}}";
export const AUTH_ID_PLACEHOLDER = "${{OMATIC_ENTRA_SSO_AUTH_ID}}";

// Read-only tools the plan pins. factory_query, startup, and every write stay off.
export const M365_BUILTIN = {
  probot: {
    wave: 1,
    capabilities: [],
    tools: [
      "connections_list",
      "omatic_guide",
      "search",
      "task_relationships",
      "task_duplicate_check",
      "slate_entity_search",
      "slate_entity_verify",
      "module_status",
    ],
    short: "Orchestrator. Turns intent into plans, owners and next steps.",
    starters: [
      ["Plan this work", "Probot, turn these notes into a plan with owners, sequence and stop conditions."],
      ["Route a request", "Probot, which o-MATIC specialist should handle this request, and why?"],
      ["Open work", "Probot, what open tasks are tied to this project, and which lanes do they touch?"],
      ["Check for duplicates", "Probot, is there already a task like this one in the factory?"],
      ["Incident triage", "Probot, something broke. Help me stabilize, isolate and assign one owner."],
      ["Factory status", "Probot, which factory connections can I reach from here?"],
    ],
  },
  fred: {
    wave: 2,
    capabilities: [],
    tools: [
      "connections_list",
      "omatic_guide",
      "search",
      "proposal_vault_list",
      "proposal_vault_get",
      "ocr_result_get",
    ],
    short: "Workspace manager. Finds, lists and organizes files.",
    starters: [
      ["Find a file", "Fred, find the latest version of this document in the file vault."],
      ["List a packet", "Fred, list the files in this packet with their sizes."],
      ["Read OCR text", "Fred, show me the extracted text from this scanned file."],
      ["Folder plan", "Fred, propose a folder structure for these project files."],
      ["Naming check", "Fred, suggest consistent names for this set of files."],
    ],
  },
  data: {
    wave: 2,
    capabilities: ["CodeInterpreter"],
    tools: [
      "connections_list",
      "omatic_guide",
      "search",
      "db_health_snapshot",
      "task_relationships",
      "slate_entity_search",
    ],
    short: "Data analyst. Reads data and says what it actually shows.",
    starters: [
      ["Database health", "Data, give me a health snapshot of this factory database."],
      ["Analyze a table", "Data, analyze this spreadsheet and tell me what it shows."],
      ["Compare datasets", "Data, compare these two lists and flag what differs."],
      ["Find anomalies", "Data, flag anomalies in this data and say how confident you are."],
      ["Review SQL", "Data, review this SQL for risk before anyone runs it."],
    ],
  },
};

export const TOOL_DESCRIPTIONS = {
  connections_list: "Lists the factory connections the signed-in person can reach.",
  omatic_guide: "Returns an o-MATIC operating-guide topic.",
  search: "Searches factory records the signed-in person can read.",
  task_relationships: "Lists tasks related to one task the person can read.",
  task_duplicate_check: "Reports whether a similar task already exists.",
  slate_entity_search: "Searches slate entities the signed-in person can read.",
  slate_entity_verify: "Checks one slate entity against the readable record.",
  module_status: "Reports which add-on modules are installed.",
  proposal_vault_list: "Lists files in a file-vault folder the person can read.",
  proposal_vault_get: "Returns one file-vault record the person can read.",
  ocr_result_get: "Returns extracted text for a file the person can read.",
  db_health_snapshot: "Returns a read-only health snapshot of a factory database.",
};

// Names that must never appear in a Copilot plugin. Writes, SQL, and startup.
export const DENY_TOOLS = new Set([
  "factory_query",
  "factory_owner_ddl",
  "startup",
  "embed_query",
  "kernel_session_open",
  "kernel_plan_update",
  "kernel_session_get",
  "kernel_delegate",
  "kernel_return",
  "module_install",
  "module_uninstall",
  "mom_signal_append",
  "retrieval_tune",
  "factory_web_publish",
  "factory_web_status",
  "factory_web_rollback",
  "proposal_vault_put",
  "proposal_vault_delete",
  "proposal_vault_append",
  "proposal_vault_organize",
  "proposal_vault_stage",
  "proposal_vault_ingest",
  "proposal_vault_transfer_batch",
  "proposal_vault_upload_start",
  "proposal_vault_upload_chunk",
  "proposal_vault_upload_commit",
  "proposal_vault_restore",
  "proposal_vault_purge",
  "proposal_vault_trash_list",
  "slate_canvas_create",
  "slate_revision_commit",
  "slate_revision_restore",
  "slate_asset_put",
  "slate_proposal_create",
  "slate_proposal_approve",
  "slate_proposal_reject",
  "work_claim_acquire",
  "work_claim_release",
  "roster_attest",
  "persona_attest",
]);

const DENY_PREFIXES = ["kernel_", "factory_web_", "proposal_vault_upload_"];

export function isDeniedTool(name) {
  if (DENY_TOOLS.has(name)) return true;
  return DENY_PREFIXES.some((p) => name.startsWith(p));
}

export function m365Config(agent) {
  const fromPack = agent.targets && agent.targets.m365;
  if (fromPack && Array.isArray(fromPack.tools)) {
    return {
      wave: fromPack.wave ?? null,
      capabilities: fromPack.capabilities || [],
      tools: fromPack.tools,
      short: fromPack.short || null,
      starters: fromPack.starters || null,
    };
  }
  return M365_BUILTIN[agent.id] || { wave: null, capabilities: [], tools: [], short: null, starters: null };
}

export function toolRecord(name) {
  return {
    name,
    description: TOOL_DESCRIPTIONS[name] || `Read-only o-MATIC tool ${name}.`,
    inputSchema: {
      type: "object",
      additionalProperties: true,
      description: "Read-only arguments. The live server schema is the authority.",
    },
  };
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Decode a non-interlaced 8-bit PNG (color types 0, 2, 4, 6) to raw pixels.
export function readPng(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return { error: "not a png" };
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
  }
  if (!width || !height) return { error: "png has no IHDR" };
  if (interlace !== 0) return { error: "interlaced png is not accepted", width, height, colorType };
  if (bitDepth !== 8) return { error: `bit depth ${bitDepth} is not 8`, width, height, colorType };
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!bpp) return { error: `color type ${colorType} is not supported`, width, height, colorType };
  let raw;
  try { raw = inflateSync(Buffer.concat(idat)); }
  catch (e) { return { error: `png inflate failed: ${e.message}`, width, height, colorType }; }
  const stride = width * bpp;
  const rows = new Array(height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) row[i] = raw[pos++];
    const prior = y > 0 ? rows[y - 1] : null;
    if (filter === 1) {
      for (let i = 0; i < stride; i++) row[i] = (row[i] + (i >= bpp ? row[i - bpp] : 0)) & 255;
    } else if (filter === 2) {
      for (let i = 0; i < stride; i++) row[i] = (row[i] + (prior ? prior[i] : 0)) & 255;
    } else if (filter === 3) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prior ? prior[i] : 0;
        row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prior ? prior[i] : 0;
        const ul = prior && i >= bpp ? prior[i - bpp] : 0;
        row[i] = (row[i] + paeth(left, up, ul)) & 255;
      }
    } else if (filter !== 0) {
      return { error: `unknown png filter ${filter}`, width, height, colorType };
    }
    rows[y] = row;
  }
  return { width, height, colorType, bpp, rows };
}

function pixel(info, x, y) {
  const row = info.rows[y];
  const i = x * info.bpp;
  if (info.colorType === 0) return { r: row[i], g: row[i], b: row[i], a: 255 };
  if (info.colorType === 2) return { r: row[i], g: row[i + 1], b: row[i + 2], a: 255 };
  if (info.colorType === 4) return { r: row[i], g: row[i], b: row[i], a: row[i + 1] };
  return { r: row[i], g: row[i + 1], b: row[i + 2], a: row[i + 3] };
}

// Outline icons are 32x32, white on transparent, or the reverse (black on transparent).
export function outlineVerdict(buf) {
  const info = readPng(buf);
  if (info.error) return { ok: false, reason: info.error };
  if (info.width !== 32 || info.height !== 32) {
    return { ok: false, reason: `outline is ${info.width}x${info.height}, want 32x32` };
  }
  let opaque = null;
  let transparent = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const p = pixel(info, x, y);
      if (p.a === 0) { transparent++; continue; }
      const white = p.r === 255 && p.g === 255 && p.b === 255;
      const black = p.r === 0 && p.g === 0 && p.b === 0;
      const kind = white ? "white" : black ? "black" : "other";
      if (kind === "other") return { ok: false, reason: `outline pixel at ${x},${y} is not white or black` };
      if (opaque && opaque !== kind) return { ok: false, reason: "outline mixes white and black" };
      opaque = kind;
    }
  }
  if (!transparent) return { ok: false, reason: "outline has no transparent pixel" };
  if (!opaque) return { ok: false, reason: "outline has no visible pixel" };
  return { ok: true, kind: opaque };
}

export function colorVerdict(buf) {
  const info = readPng(buf);
  if (info.error) return { ok: false, reason: info.error };
  if (info.width !== 192 || info.height !== 192) {
    return { ok: false, reason: `color icon is ${info.width}x${info.height}, want 192x192` };
  }
  return { ok: true };
}
