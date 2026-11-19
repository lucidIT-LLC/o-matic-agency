/** Render a terminal-safe startup card from a native o-MATIC Server packet.
 *
 * Field paths follow the LIVE card contract (card_version 2.0.0). They were
 * previously invented — corpus_total, corpus_embedded, governance_rules and
 * sop_count do not exist on any card this server has ever returned, so a fully
 * embedded corpus rendered "0 / 0 embedded" and 15 rules rendered as 0. The
 * smoke test did not catch it because its fixture was built from these same
 * invented names, which made the test a mirror of the code rather than a
 * measurement of it.
 */
const stateMark = (state) => ({ READY: '🟢', DEGRADED: '🟠', BLOCKED: '🔴' }[state] ?? '⚪');
const count = (value) => Number(value ?? 0).toLocaleString('en-US');
// The card returns several counts as STRINGS ("0"). `"0" === 0` is false, which
// painted a clean corpus orange. Compare numbers, never the raw field.
const num = (value) => Number(value ?? 0);

/** Sum a metric across every memory tier the card reports. */
const tierSum = (corpus, key) =>
  corpus && typeof corpus === 'object'
    ? Object.values(corpus).reduce((total, tier) => total + num(tier?.[key]), 0)
    : 0;

/** One presentation row: `value · CONDITION`, or null when the server (older than
 * 2.5) did not send it. The rows are the server's own words; nothing is derived. */
const presented = (packet, key) => {
  const row = packet?.presentation?.startup_card?.[key];
  if (!row || row.value == null) return null;
  return row.condition?.label ? `${row.value} · ${row.condition.label}` : String(row.value);
};

export function formatStartupCard(packet) {
  const card = packet?.card ?? packet;
  if (!card?.state) throw new TypeError('A native o-MATIC Server startup card is required.');
  const connection = packet?.connection ?? card.connection_name ?? 'CLIENT_SUPPLIED';
  const grantedCount = packet?.grantedCount ?? packet?.granted?.length ?? 'UNKNOWN';

  // The factory names itself. This header was hardcoded to one factory, so every
  // factory on this pack rendered under that name.
  const name = card.factory_name ?? card.factory_id ?? 'UNKNOWN';
  const subtitle = card.factory_subtitle ?? 'an o-MATIC factory';

  // Decisions #439 and #554 retired the two-ladder label. The card's
  // factory_version is the coarser schema contract; use the independently
  // recorded System version only when both sources agree.
  const sources = card.version_sources ?? {};
  const manifest = sources['factory_config.version.manifest'];
  const kernel = sources['factory_config.product.kernel_version'];
  const versionRe = /^\d+\.\d+\.\d+$/;
  const measured = typeof manifest === 'string' && versionRe.test(manifest)
    && typeof kernel === 'string' && versionRe.test(kernel);
  const system = measured && manifest === kernel ? manifest : 'UNKNOWN';
  const versionStatus = (measured && manifest !== kernel) || card.version_conflict
    ? ' · ⚠ version conflict' : '';
  const unmeasuredFields = Array.isArray(card.unmeasured) ? [...card.unmeasured] : [];
  if (!measured) unmeasuredFields.push('system_version');

  const embedded = tierSum(card.corpus, 'embedded');
  const total = tierSum(card.corpus, 'total');
  const stale = num(card.corpus_stale_total);
  const unembedded = num(card.corpus_unembedded_total);
  const corpusClean = stale === 0 && unembedded === 0 && total > 0;

  const rules = card.governance?.active_rules;
  const sops = card.governance?.active_sops;

  const runningCode = presented(packet, 'running_code');
  const capabilities = presented(packet, 'capabilities');
  const frontDoor = presented(packet, 'front_door');

  const lines = [
    `╭─ 🏠 ${name} · ${subtitle}`,
    `│ State       ${stateMark(card.state)} ${card.state} · ${card.state_reason}`,
    `│ System      ${system}${versionStatus}`,
    `│ Connection  ${connection} · ${card.connection_database ?? 'UNKNOWN'} · ${grantedCount} granted`,
    `│ Retrieval   ${card.retrieval_state === 'vector' ? '🟢' : '🟠'} ${card.retrieval_state ?? 'UNKNOWN'} · telemetry ${card.retrieval_telemetry_state ?? 'UNMEASURED'}`,
    `│ Corpus      ${corpusClean ? '🟢' : '🟠'} ${count(embedded)} / ${count(total)} embedded · ${count(stale)} stale · ${count(unembedded)} unembedded`,
    `│ Roster      ${card.roster_ready ?? 'UNKNOWN'} · ${count(rules)} rules · ${count(sops)} SOPs`,
    `│ Work        ${num(card.open_p1_count) > 0 ? '⚠' : '🟢'} ${count(card.open_p1_count)} P1 · ${count(card.open_task_total)} open`,
    ...(runningCode ? [`│ Running code ${runningCode}`] : []),
    ...(capabilities ? [`│ Capabilities ${capabilities}`] : []),
    ...(frontDoor ? [`│ Front door   ${frontDoor}`] : []),
    `│ Signal      ${unmeasuredFields.length ? `◌ ${unmeasuredFields.join(', ')} unmeasured` : '🟢 all reported'}`,
    `╰─ Measured ${card.measured_at ?? 'UNKNOWN'}`,
  ];
  return `\`\`\`text\n${lines.join('\n')}\n\`\`\``;
}

export function formatFactoryFooter(packet) {
  const card = packet?.card ?? packet;
  if (!card?.state) throw new TypeError('A native o-MATIC Server startup card is required.');
  const connector = Array.isArray(card.unmeasured) && card.unmeasured.includes('connector_readiness')
    ? ' · connector readiness unmeasured' : '';
  return `⌂ ${card.factory_id ?? 'UNKNOWN'} · ${card.state} · ${card.retrieval_state ?? 'UNKNOWN'}${connector}`;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const chunks = [];
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', () => process.stdout.write(`${formatStartupCard(JSON.parse(chunks.join('')))}\n`));
}
