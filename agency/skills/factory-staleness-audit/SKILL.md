---

**Locale — US English, always.** Write American spellings in every output:
*color*, *behavior*, *normalize*, *organize*, *recognize*, *license*, *defense*,
*center*, *analyze*, *catalog*, *artifact*, *labeled*, *program*, *gray*.
Reject the British forms of these — the `-ise`/`-isation`, `-our`, `-ence` and
`-re` endings, and the doubled-l past tense. They are deliberately not spelled
out here: a rule that quotes the wrong spelling poisons every future search for
it, which is why Commons KB-0432, KB-0433 and KB-0436 still register as hits
against their own correction notes.

Do not "correct" `aria-labelledby`, `programmer`, or the `madvise` syscall, and
note that roughly thirty-five words that look British are correct US English —
*evidence*, *sequence*, *enterprise*, *precise*, *specialist*, *otherwise*,
*expertise*, *promise*, *premise* among them.

This is not a style preference. These packs ship to US clients, and a wrong
spelling *in this file* propagates into everything the agent writes. Measured
2026-09-01: 122 British spellings in the agent definitions were the upstream
source of British spelling reaching client deliverables, surviving four rounds
of downstream correction because nobody looked at the definitions.
name: factory-staleness-audit
description: Audit an O-Matic factory for stale doctrine being served as current — retired documents still in the retrieval corpus, decommissioned mechanisms named as live in rules and SOPs, and a decommissioned-terms detector that nobody has fed. Use when the operator says records are being lost, when a session acted on out-of-date instructions, after any component is retired, or on the triggers "audit the corpus", "staleness audit", "are we serving stale doctrine", "purge the swamp", "what's rotten in Commons". Routed by Probot; findings that require SOP or doctrine rewrites route on to Smith.
---

> **Compatibility tier (required declaration, rule #284).** This pack ships **no
> MCP server**. On a host with the **O-Matic Server MCP surface** configured, it
> operates fully: startup, governed retrieval, task and decision writes. On a
> **prompt-only host** it is **behavior-only** — this audit cannot run at all,
> because every phase is a database measurement. Say plainly that the factory
> brain is unreachable and that no staleness claim can be made. The absence of
> the server surface is a **host configuration gap**, not a clean audit.

# Factory Staleness Audit

<!-- version: 1.0.0 | author: James Walker | package: o-MATIC Agency -->


> **What this catches.** A factory can be perfectly healthy by its startup card —
> corpus fully embedded, zero stale, retrieval `vector`, roster green — and still
> be handing every session instructions built on systems that no longer exist.
> The startup card measures whether memory *works*. This audits whether memory is
> *true*.
>
> Measured 2026-08-28: Commons was serving 329 chunks (41% of its corpus) from
> documents explicitly marked `retired` or `archive`, and lucidIT was serving a
> Project Instructions document that had been tombstoned on disk two and a half
> months earlier. Both factories reported READY throughout.

## When to run it

- After **any** component, connector, tool or app is retired — the retirement
  decision does not propagate itself
- When the operator says records are being lost, or that old ways of working keep
  resurfacing
- When a session acts on an instruction that turns out to be obsolete
- Periodically on legacy factories, which accumulate this fastest

## The five phases

Run them in order. Each one's result changes how you read the next.

---

### Phase 1 — Does this factory have a re-ingestion pipeline?

**This is the first question and it determines everything downstream.** A factory
whose corpus self-heals on edit is a different problem from one where editing a
document changes nothing anybody retrieves.

**Resolve the object to its base table first.** A trigger query against a VIEW
returns zero rows every time, because views do not carry triggers — and zero
reads exactly like "this factory has no pipeline." That mistake was made here on
2026-08-28: `brain.document_chunks` is a view over `brain.brain_chunks`, the
zero-trigger result was reported as a structural gap, and it was used to justify
a claim about the factory that was wrong. Enumerate the whole schema instead of
probing one name you assume is a table:

```sql
SELECT c.relname AS object,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
                      WHEN 'm' THEN 'matview' ELSE c.relkind::text END AS kind,
       count(t.tgname) FILTER (WHERE NOT t.tgisinternal) AS user_triggers
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid
WHERE n.nspname = 'brain'          -- or 'kb'
GROUP BY c.relname, c.relkind
ORDER BY c.relkind, c.relname;
```

**Then ask the question triggers cannot answer: does anything actually write the
chunks?** A factory can be dense with triggers and still have no re-ingestion
path, because the triggers maintain the *entity index* while the *chunks* arrive
from outside the database entirely.

```sql
WITH f AS (
  SELECT n.nspname||'.'||p.proname AS fn, p.oid, pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname IN ('public','ops','brain','factory')
    AND p.prokind = 'f' AND l.lanname IN ('plpgsql','sql')   -- prokind filter is
)                                    -- required: pg_get_functiondef raises 42809
SELECT fn,                           -- on aggregates and window functions
       CASE WHEN def ~* 'insert[[:space:]]+into[[:space:]]+(brain\.)?brain_chunks'
              THEN 'INSERTS chunks'
            WHEN def ~* 'delete[[:space:]]+from[[:space:]]+(brain\.)?brain_chunks'
              THEN 'DELETES chunks'
            ELSE 'reads only' END AS writes
FROM f WHERE def ~* 'brain_chunks' ORDER BY 2, 1;
```

**Two factories, both measured 2026-08-28 — and they are not good vs absent:**

*Commons* concentrates seven triggers on one source table, `kb.documents`: a
version gate refusing content changes without a version bump, a content-hash
setter, an **automatic re-chunker**, a stale marker, a semantic-index seeder, an
index cleaner on delete, and a revision archiver. Edit the document, the corpus
follows.

*lucidIT* carries **fifteen** user triggers in `brain` — more than Commons, laid
out differently. Three source tables (`docling_index`, `factory_memory`,
`project_knowledge`) each carry a full four-trigger lifecycle: seed on INSERT,
refresh on UPDATE, cleanup on DELETE, stale-mark on meaningful change.
`brain_chunks` and `semantic_index` each carry an embed-needed `pg_notify`, and
`brain_chunks` marks itself stale when its content changes. **Tier 1 is complete
and self-healing.**

What lucidIT lacks is the re-chunker, and the function query proves it: *no
database object writes `brain_chunks` at all* — the only two functions that name
it are the search functions, read-only. Chunks are converted from files by an
external process. So a changed source file refreshes the entity index correctly
and leaves Tier 2 serving the old text indefinitely.

**Report the gap where it actually is.** "This factory has no pipeline" was
wrong about lucidIT twice over: it has one, and the real defect is narrower and
harder to see — a Tier 1 that self-heals in front of a Tier 2 that cannot. A
factory with a healthy-looking trigger census can still be serving stale chunks.
If nothing writes the chunk table, **every fix in later phases must be applied
to the document AND the chunk**, or search keeps serving the old text.

---

### Phase 2 — Is non-current content being served as current?

Only applies where documents carry a status. Skip if the corpus is file-sourced
with no status column.

```sql
-- How much of the corpus comes from documents that are not current?
SELECT d.status,
       count(DISTINCT d.id) AS docs,
       count(c.id)          AS chunks_in_corpus
FROM kb.documents d
LEFT JOIN kb.document_chunks c ON c.document_id = d.id
GROUP BY d.status ORDER BY d.status;
```

Then check whether retrieval respects that status — **do not assume it does:**

```sql
SELECT p.proname,
       (regexp_matches(pg_get_functiondef(p.oid), '(.{0,120}status.{0,160})', 'g'))[1] AS ctx
FROM pg_proc p WHERE p.proname ILIKE 'fn_search%';
```

**Trap, measured:** both Commons search functions *referenced* `status` and
neither *filtered* on it. The only match was a return column named
`weights_status`. Grepping for the word is not evidence of a filter — read the
clause.

**The fix is a purge, not a filter.** A status filter leaves the dead weight in
the table, in the HNSW index and in every scan. Delete the derived retrieval
artifacts and keep the source:

```sql
DELETE FROM kb.document_chunks c USING kb.documents d
 WHERE c.document_id = d.id AND d.status IN ('retired','archive');

DELETE FROM kb.semantic_index si USING kb.documents d
 WHERE si.source_table = 'kb.documents'
   AND si.source_id = d.id::text          -- NOTE: source_id is text, d.id is bigint
   AND d.status IN ('retired','archive');
```

**Verify first that nothing is lost.** Chunks are *derived* data — safe to delete
only if the document retains full text:

```sql
SELECT status, count(*) AS docs,
       count(*) FILTER (WHERE content IS NOT NULL AND length(content) > 200) AS with_full_text
FROM kb.documents WHERE status IN ('retired','archive') GROUP BY status;
```

Both numbers must match. If they don't, stop — the chunks are the only copy.

---

### Phase 3 — Has anyone fed the decommissioned-terms detector?

Most factories already have this mechanism. **The common failure is not that it
is broken — it is that nobody added the last retirement to it.**

```sql
SELECT count(*) AS terms, max(created_at)::date AS newest_term
FROM factory.decommissioned_terms;
```

Compare `newest_term` against the most recent retirement decision. **A gap is the
finding.** Measured 2026-08-28: Conductor was retired on 2026-08-23 by decision
#355; on that same day someone added `System 6` to o-MATIC's term list as a naming
convention and did not add `Conductor`, `postgres-cabinet` or `localhost:8438`.
The detector was maintained for the convention and not for the retirement.

**Expect schema variation. Four factories, three shapes, two locations — measured:**

| Factory | Location | Columns |
|---|---|---|
| o-MATIC | `factory.decommissioned_terms` | `id, term, category, retired_note, replacement, created_at, allowlisted_note` |
| lucidIT | `factory.decommissioned_terms` | `id, tenant_id, term, replaced_by, domain, created_at` |
| Practically Adventist | `factory.decommissioned_terms` | `term, retired_in, retired_at, notes, tenant_id` |
| theNest | **`archive.`**`decommissioned_terms` | `term, retired_in, retired_at, notes, tenant_id` |

Read the columns before writing. A single INSERT will not work across the estate.

**Choosing terms.** Precise beats broad. `postgres-cabinet` and `localhost:8438`
are unambiguous anywhere. A bare product name like `Conductor` is safe in an
infrastructure corpus and risky in a subject-matter one — Practically Adventist is
a biblical-research corpus where the word has ordinary senses. **A noisy detector
gets ignored, which is worse than no detector.** Scope or omit, and say which in
the notes column.

Note that lucidIT's term table has **no allowlist column** and o-MATIC's does.
Without one you cannot mark a legitimate historical reference as expected, and
Phase 4's false positives recur at every run.

---

### Phase 4 — Run the detectors and triage the hits

```sql
SELECT 'rules' AS surface, count(*) FROM public.v_rules_with_decommissioned_terms
UNION ALL SELECT 'sops',      count(*) FROM public.v_sops_with_decommissioned_terms
UNION ALL SELECT 'knowledge', count(*) FROM public.v_knowledge_with_decommissioned_terms;
```

**The discipline that matters: a hit is not a defect.** Sort every hit into three
buckets before changing anything.

| Bucket | Looks like | Action |
|---|---|---|
| **Prescription** | Names the retired thing as the way to do something now | **Fix.** This is the defect |
| **Prohibition** | "Never use X", "X is retired, do not follow it" | **Keep.** The detector cannot tell these apart |
| **History** | A decision record, postmortem or changelog describing what was true then | **Keep.** A decision record *should* say what it said |

Measured on lucidIT: **4 rule hits, 3 of them false positives.** Rules 5, 222 and
224 named Conductor only to prohibit it. Only rule 212 was a real defect — and it
was subtler than it looked: it had *already been amended* for the Conductor
retirement, and the amendment fixed the second half of the rule while leaving the
first half instructing sessions to call `omatic_select_factory` and
`omatic_resolve_factory`, tools deleted in plugin 5.0.0 and forbidden by
halt-rule #288. **A rule can contradict itself. Read the whole rule, not the
excerpt the view returns.**

**Count occurrences before promising a fix.** Measured: I reported "two stale
lines" in two SOPs and the real figure was **sixteen** — `SOP-001` had 9 and
`SOP-011` had 7, with whole sections prescribing the retired mechanism.

```sql
SELECT sop_key,
       (length(body_md) - length(replace(lower(body_md), 'conductor', ''))) / 9 AS occurrences
FROM factory.sop_registry WHERE body_md ILIKE '%conductor%';
```

If the count is small and each is a phrase, fix them. **If a whole section
prescribes the retired mechanism, that is a documented rewrite with a version
bump — route it to Smith rather than pattern-matching at it.**

---

### Phase 5 — Sweep the estate

Retirements are estate-wide; corpora are not. Run phases 1–4 against every
granted connection, reading names off the wire:

```sql
-- per connection
SELECT count(*) FILTER (WHERE content ILIKE '%<retired-thing>%') AS hits,
       count(*) AS total
FROM brain.document_chunks;
```

Report per factory. **Do not assume a factory is behind** — measured 2026-08-28,
theNest had already cataloged the Conductor retirement thoroughly, with nine
precise terms including `"Absence of CONDUCTOR is the halt condition"` and
`"through Conductor"`. It was ahead of the others.

**And note what that proved:** theNest had the terms *and* still carried the dead
connector as a Non-Negotiable in its own project instructions. **A working
detector that nobody reads changes nothing.** The gap is not detection. It is
that a retirement decision does not propagate into the documents that depend on
it.

---

## Reporting

Report per surface, with counts, and separate the three buckets explicitly. Never
report a hit count as a defect count — that overstates the problem and destroys
trust in the next run.

State plainly which of these the factory is:

- **Pipeline present** — fixes to a document self-heal into the corpus
- **Pipeline absent** — every fix must touch document *and* chunk, or search keeps
  serving the old text

## Lane discipline

- **Probot** runs the audit and reports.
- **Fred** executes deletions and archives — custody first, `.trash/` or an
  archive folder, never a bare delete of the only copy.
- **Smith** takes anything that needs a doctrine or SOP rewrite, and the standing
  question this audit keeps raising: *what makes a retirement decision propagate
  into the documents that depend on it?*
- **Operator** approves any write to a sovereign factory, any purge, and any
  change to shared Commons doctrine.

## Three things that will bite you

**A destructive statement needs `confirm_destructive: true` on `factory_query`,
and privileges vary.** `DROP TABLE` in Commons was refused with `42501
insufficient_privilege` on the `omatic_llm` role. That is the grant working — an
owner-level session is required. Report the refusal; do not attempt to escalate.

**Respect the version gate.** `kb.documents` refuses a content change without a
version bump in the same UPDATE, raising `23514` with the hint *"there is no
bypass: this is the task #323 write gate."* That constraint is protecting the
factory — it forces a versioned, revision-archived change instead of a silent
overwrite. Comply with it; never route around it.

**A zero is not a finding until you know what you measured.** Two of this
audit's queries return a clean-looking zero when aimed at the wrong object: a
trigger count against a VIEW is always zero, and `pg_get_functiondef` raises
`42809` on aggregates unless you filter `prokind = 'f'`. Both failures read as
"nothing here." Resolve `relkind` before you believe a count, and when the answer
is zero, state the object you measured alongside it — `brain.document_chunks`
returned zero triggers and the factory had fifteen.
