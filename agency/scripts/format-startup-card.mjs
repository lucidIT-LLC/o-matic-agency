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

export function formatStartupCard(packet) {
  const card = packet?.card ?? packet;
  if (!card?.state) throw new TypeError('A native o-MATIC Server startup card is required.');
  const connection = packet?.connection ?? card.connection_name ?? 'CLIENT_SUPPLIED';
  const grantedCount = packet?.grantedCount ?? packet?.granted?.length ?? 'UNKNOWN';

  // The factory names itself. This header was hardcoded to one factory, so every
  // factory on this pack rendered under that name.
  const name = card.factory_name ?? card.factory_id ?? 'UNKNOWN';
  const subtitle = card.factory_subtitle ?? 'an o-MATIC factory';

  // TWO LADDERS, one keystroke apart (SOP-022): System 7 is the GOVERNANCE
  // model (decision #409, Objectives and Key Results); System 5.7.x is the
  // RELEASE ladder. Printing only one number is how a System 7 factory reports
  // itself as 5.7.1. Print both, labeled, always.
  const governance = card.governance_contract_version ?? 'UNKNOWN';
  const release = card.factory_version ?? 'UNKNOWN';

  const embedded = tierSum(card.corpus, 'embedded');
  const total = tierSum(card.corpus, 'total');
  const stale = num(card.corpus_stale_total);
  const unembedded = num(card.corpus_unembedded_total);
  const corpusClean = stale === 0 && unembedded === 0 && total > 0;

  const rules = card.governance?.active_rules;
  const sops = card.governance?.active_sops;

  const lines = [
    `╭─ 🏠 ${name} · ${subtitle}`,
    `│ State       ${stateMark(card.state)} ${card.state} · ${card.state_reason}`,
    `│ Generation  ${governance} governance · release ${release}${card.version_conflict ? ' ⚠ version conflict' : ''}`,
    `│ Connection  ${connection} · ${card.connection_database ?? 'UNKNOWN'} · ${grantedCount} granted`,
    `│ Retrieval   ${card.retrieval_state === 'vector' ? '🟢' : '🟠'} ${card.retrieval_state ?? 'UNKNOWN'} · telemetry ${card.retrieval_telemetry_state ?? 'UNMEASURED'}`,
    `│ Corpus      ${corpusClean ? '🟢' : '🟠'} ${count(embedded)} / ${count(total)} embedded · ${count(stale)} stale · ${count(unembedded)} unembedded`,
    `│ Roster      ${card.roster_ready ?? 'UNKNOWN'} · ${count(rules)} rules · ${count(sops)} SOPs`,
    `│ Work        ${num(card.open_p1_count) > 0 ? '⚠' : '🟢'} ${count(card.open_p1_count)} P1 · ${count(card.open_task_total)} open`,
    `│ Signal      ${Array.isArray(card.unmeasured) && card.unmeasured.length ? `◌ ${card.unmeasured.join(', ')} unmeasured` : '🟢 all reported'}`,
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
