import assert from 'node:assert/strict';
import { formatFactoryFooter, formatStartupCard } from './format-startup-card.mjs';

/* A REAL packet, captured from the o-MATIC Server 2026-09-06 23:01:38, not a
 * hand-written fixture. The previous fixture invented flat field names
 * (corpus_total, corpus_embedded, governance_rules, sop_count) that no card has
 * ever carried, so it agreed with the formatter's bugs instead of catching
 * them: a 1,540-row fully embedded corpus rendered "0 / 0 embedded" in orange,
 * 15 rules rendered as 0, and every factory rendered under a hardcoded name.
 * A fixture built from the code's assumptions cannot fail. */
const omatic = {
  connection: 'o-MATIC  - Corp',
  grantedCount: 6,
  card: {
    card_version: '2.0.0', factory_id: 'omatic', factory_name: 'O-Matic',
    factory_subtitle: 'an o-MATIC factory',
    factory_version: '5.7.1', governance_contract_version: 'system-7',
    version_conflict: false,
    state: 'READY', state_reason: 'all database-measured fields ok',
    connection_database: 'o-matic',
    retrieval_state: 'vector', retrieval_telemetry_state: 'live',
    corpus: {
      semantic_index: { total: 380, embedded: 380, stale: 0, unembedded: 0 },
      document_chunks: { total: 1160, embedded: 1160, stale: 0, unembedded: 0 },
    },
    // The server returns these as STRINGS. That is not a typo in this fixture:
    // it is the exact shape that made `=== 0` fail and paint a clean corpus orange.
    corpus_stale_total: '0', corpus_unembedded_total: '0',
    roster_ready: '11/11',
    governance: { active_rules: 15, active_sops: 13, roster_rows: 13 },
    open_p1_count: 0, open_task_total: 5,
    unmeasured: [], measured_at: '2026-09-06 23:01:38.684427-04:00',
  },
};

const card = formatStartupCard(omatic);

// The factory names itself.
assert.match(card, /^```text\n╭─ 🏠 O-Matic · an o-MATIC factory/m);

// BOTH ladders, labeled. System 7 is governance; 5.7.x is the release rung.
// Printing one number is how a System 7 factory reports itself as 5.7.1.
assert.match(card, /Generation  system-7 governance · release 5\.7\.1/);

// Real counts, summed across every memory tier.
assert.match(card, /1,540 \/ 1,540 embedded · 0 stale · 0 unembedded/);
assert.match(card, /Corpus      🟢/, 'a clean corpus is green even when the counts arrive as strings');
assert.match(card, /11\/11 · 15 rules · 13 SOPs/);
assert.match(card, /🟢 READY · all database-measured fields ok/);
assert.match(card, /o-MATIC  - Corp · o-matic · 6 granted/);
assert.match(card, /🟢 all reported/);

/* CONTROL: the header must follow the card, not the code. A second factory has
 * to render under its own name. This is the assertion the old test could not
 * make, because it asserted the hardcoded name as correct. */
const other = {
  connection: 'theNest', grantedCount: 6,
  card: { ...omatic.card, factory_id: 'thenest', factory_name: 'The Nest',
    factory_subtitle: 'an o-MATIC factory', connection_database: 'thenest',
    unmeasured: ['connector_readiness'] },
};
const otherCard = formatStartupCard(other);
assert.match(otherCard, /╭─ 🏠 The Nest · an o-MATIC factory/);
assert.doesNotMatch(otherCard, /O-Matic ·/, 'one factory name must never leak into another factory card');
assert.match(otherCard, /◌ connector_readiness unmeasured/);

// A degraded corpus must actually read degraded.
const dirty = { ...omatic, card: { ...omatic.card, corpus_unembedded_total: '3' } };
assert.match(formatStartupCard(dirty), /Corpus      🟠/, 'unembedded rows must not render green');

// A version conflict must be visible on the generation line.
const conflicted = { ...omatic, card: { ...omatic.card, version_conflict: true } };
assert.match(formatStartupCard(conflicted), /⚠ version conflict/);

assert.match(formatFactoryFooter(other), /^⌂ thenest · READY · vector · connector readiness unmeasured$/);
assert.throws(() => formatStartupCard({}), /startup card/);
console.log('startup card smoke test passed');
