/** Render a terminal-safe startup card from a native O-Matic Server packet. */
const stateMark = (state) => ({ READY: '🟢', DEGRADED: '🟠', BLOCKED: '🔴' }[state] ?? '⚪');
const count = (value) => Number(value ?? 0).toLocaleString('en-US');

export function formatStartupCard(packet) {
  const card = packet?.card ?? packet;
  if (!card?.state) throw new TypeError('A native O-Matic Server startup card is required.');
  const connection = packet?.connection ?? card.connection_name ?? 'CLIENT_SUPPLIED';
  const grantedCount = packet?.grantedCount ?? packet?.granted?.length ?? 'UNKNOWN';
  const corpus = `${count(card.corpus_embedded)} / ${count(card.corpus_total)} embedded`;
  const lines = [
    '╭─ 🏠 theNest · O-Matic Factory',
    `│ State       ${stateMark(card.state)} ${card.state} · ${card.state_reason}`,
    `│ Connection  ${connection} · ${card.connection_database ?? 'UNKNOWN'} · ${grantedCount} granted`,
    `│ Retrieval   ${card.retrieval_state === 'vector' ? '🟢' : '🟠'} ${card.retrieval_state ?? 'UNKNOWN'} · telemetry ${card.retrieval_telemetry_state ?? 'UNMEASURED'}`,
    `│ Corpus      ${card.corpus_unembedded_total === 0 && card.corpus_stale_total === 0 ? '🟢' : '🟠'} ${corpus} · ${count(card.corpus_stale_total)} stale · ${count(card.corpus_unembedded_total)} unembedded`,
    `│ Roster      ${card.roster_ready ?? 'UNKNOWN'} · ${count(card.governance_rules)} rules · ${count(card.sop_count)} SOPs`,
    `│ Work        ${card.open_p1_count > 0 ? '⚠' : '🟢'} ${count(card.open_p1_count)} P1 · ${count(card.open_task_total)} open`,
    `│ Signal      ${Array.isArray(card.unmeasured) && card.unmeasured.length ? `◌ ${card.unmeasured.join(', ')} unmeasured` : '🟢 all reported'}`,
    `╰─ Measured ${card.measured_at ?? 'UNKNOWN'}`,
  ];
  return `\`\`\`text\n${lines.join('\n')}\n\`\`\``;
}

export function formatFactoryFooter(packet) {
  const card = packet?.card ?? packet;
  if (!card?.state) throw new TypeError('A native O-Matic Server startup card is required.');
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
