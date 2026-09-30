# Probot — the startup card

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## Contents

- 7b. The startup card — one shape, every host

## 7b. The startup card — one shape, every host

`SELECT * FROM v_startup_card` returns ONE row.

**PRINT THE CARD. Do not summarize it, do not rewrite it as bullet points, do not
reorder or rename its rows, and do not substitute prose that "covers the same
information."** Emit the fenced block below, filled from the row, as the FIRST
thing in the startup reply. Prose goes AFTER the card, never instead of it.

**HOST-FACTORY DEFERENCE — added v18.2.0, operator ruling 2026-08-31.** When the
connected factory's own startup SOP (read live from its `sop_registry` — e.g.
lucidIT SOP-001 step 7) defines a card render contract and battery, THAT contract
is the authority for the row list, the battery, and the shape: render the
factory's card per its SOP and do NOT additionally demand this section's fenced
form. The architecture Blueprint (KB-0478; KB-0051 is retired and split) Track 7 fixes substance and leaves formatting
host-specific; two simultaneously mandatory shapes was a measured defect
(lucidIT, 2026-08-31 — an adjudication tax paid at every session start).
Everything below in this section, the self-check included, applies ONLY when the
factory's database defines no render contract of its own.


This is not a formatting preference. Track 7 closes on *"every supported host
demonstrates identify → resolve → contract → roster → READY/DEGRADED/BLOCKED in a
fresh session."* **Demonstration requires comparison, and comparison requires an
identical shape.** Two hosts each writing their own tidy summary of the same row
prove nothing about each other — that is precisely the state this replaced.

Measured 2026-08-15: two startup runs on two hosts, both with this skill loaded,
both produced fluent bullet summaries carrying most of the right values and
neither produced the card. Both were recorded as acceptance FAILURES. A correct
summary is still a failure here, because the artifact under test is the shape.

**The shape is defined by code, not by this paragraph.**
`scripts/format-startup-card.mjs` is the single source of the render, and
`scripts/smoke-startup-card.mjs` asserts it — 15 assertions in `npm run check`,
including one that REJECTS a bullet summary of the exact form that failed the
first three acceptance attempts. If the block below and that function ever
disagree, **the function is right.** Prose lost this argument three times; it is
not being asked to win it a fourth.

```text
╭─ 🏠 O-Matic · an o-MATIC factory
│ State       🟢 READY · all database-measured fields ok
│ Generation  system-7 governance · release 5.7.1
│ Connection  o-MATIC  - Corp · o-matic · 6 granted
│ Retrieval   🟢 vector · telemetry live
│ Corpus      🟢 1,540 / 1,540 embedded · 0 stale · 0 unembedded
│ Roster      11/11 · 15 rules · 13 SOPs
│ Work        🟢 0 P1 · 5 open
│ Signal      🟢 all reported
╰─ Measured 2026-09-06 23:01:38.684427-04:00
```

**This block is the function's actual output, pasted.** It previously showed a
different shape entirely — a `🤖` header with Pin/Identity/Session rows that
`format-startup-card.mjs` has never emitted. The rule above says the function
wins when they disagree, and they disagreed completely, so every reader who
followed the prose rendered a card no host could compare. Measured 2026-09-06:
a Probot session rendered the prose shape while the shipped function rendered
the box, in the same session.

**The GENERATION row carries BOTH ladders, and that is the point.** System 7 is
the GOVERNANCE model (decision #409 — Objectives and Key Results, not a count);
System 5.7.x is the RELEASE ladder. SOP-022 calls them *"two ladders, one
keystroke apart."* The old identity row printed `factory_id · factory_version ·
state` — one number, the release rung — so a System 7 factory reported itself as
5.7.1 on every host. Print both, labeled, always. `factory_version` alone is
never the answer to "what system are we on."

**Column → row mapping, so there is nothing to interpret:**

| card row | columns |
|---|---|
| header | `factory_name` · `factory_subtitle` — **from the card, never a literal.** This was hardcoded to one factory's name, so every factory rendered under it |
| State | `state` · `state_reason` |
| Generation | `governance_contract_version` governance · release `factory_version` · `⚠ version conflict` when `version_conflict` |
| Connection | `connection` (wire) · `connection_database` · `grantedCount` granted |
| Retrieval | `retrieval_state` · `retrieval_telemetry_state` |
| Corpus | embedded/total **summed across every tier in `card.corpus`** · `corpus_stale_total` · `corpus_unembedded_total` |
| Roster | `roster_ready` · `governance.active_rules` · `governance.active_sops` |
| Work | `open_p1_count` · `open_task_total` |
| Signal | `unmeasured[]`, or `all reported` when empty |
| footer | `measured_at` |

**Counts are nested, and several arrive as strings.** `corpus_total`,
`corpus_embedded`, `governance_rules` and `sop_count` are **not card fields** —
they never existed. The real values live under `card.corpus.<tier>` and
`card.governance`. Reading the invented flat names rendered a 1,540-row fully
embedded corpus as `0 / 0 embedded` and 15 rules as `0`. Separately, the server
returns `corpus_stale_total` and `corpus_unembedded_total` as **strings**, so
`=== 0` is false and painted a clean corpus orange. Coerce with `Number()`
before comparing, never test the raw field.

`pin_state`, `identity_*` and `last_session_*` are on the card but are **not
card rows** — report them in the prose beneath it. The table above lists exactly
what the function emits and nothing it does not; a table promising rows the
renderer never prints is the same doc-versus-code disagreement this section
exists to settle.

Anything the card returns as `CLIENT_SUPPLIED` is filled from STEP 1/STEP 2, or
printed as `CLIENT_SUPPLIED` if this host genuinely cannot supply it. Never blank,
never guessed.

**Self-check before sending the startup reply.** If your output does not contain
a fenced block whose first line begins `╭─ 🏠 `, you have not run this protocol —
go back and print the card. A summary that "covers the same information" is the
documented failure mode, not an acceptable variant.

This check tested for `🤖 ` until 2026-09-06, a marker `format-startup-card.mjs`
has never emitted. A self-check that cannot pass on correct output is worse than
no self-check: it trains the reader to ignore it.

**Rules that make it a control rather than decoration:**

- **`state` and `state_reason` come from the card. Never recompute them.** Two
  readers deriving state from raw columns is how a factory ends up with two
  answers about itself.
- **Color comes from `severity`**, which the card emits per field as
  `ok`/`warn`/`bad`/`unknown`. Never invent a color from a value you read.
- **`unknown` is not `ok`.** Render it as unknown and say why. A field the card
  refuses to guess is doing its job; flattening it to green destroys the signal.
- **Print the age with every measurement.** "OK (probed 4m ago)" — never a bare OK.
- **`fts_only` needs its age before it means anything.** If `last_retrieval_at` is
  days old, the honest reading is *no retrieval has been attempted*, not
  *retrieval is broken*. Measured 2026-08-15: o-matic showed `retrieval_state =
  fts_only` with `last_event_at = 2026-08-09` — six days stale, 68 of 104 logged
  events historically vector. The card reported `retrieval=bad` on an empty
  window. Report the age; do not report an empty window as a failure.
- **BLOCKED is a report, not a crash.** A brand-new factory returns one row with
  `factory_id=UNKNOWN`, `state=BLOCKED`. Render it. That is the factory correctly
  telling you it has not been set up.

**Terse mode trims the report, never the query.** `fast` prints the header line
plus any non-`ok` field and the resume note. The card is fetched in full every
time.

***
