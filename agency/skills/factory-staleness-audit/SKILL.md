---
name: factory-staleness-audit
description: Probot-owned audit of an o-MATIC factory for stale doctrine being served as current. Retired documents still in the retrieval corpus, decommissioned mechanisms named as live, and a decommissioned-terms detector nobody has fed. Use when records are being lost, a session acted on out-of-date instructions, or after a component is retired. Triggers — audit the corpus, staleness audit, are we serving stale doctrine, purge the swamp. Doctrine rewrites route to Smith.
---

<!-- version: 1.1.0 | author: LucidIT, LLC | package: o-MATIC Agency -->

> **Compatibility.** This pack ships **no MCP server**. Every phase is a database measurement. On a prompt-only host, say the factory is unreachable and that no staleness claim can be made.

**Locale: US English, always.** Use American spelling in everything you write. Do not "correct" words that are already US English (*evidence, sequence, enterprise, precise, specialist, otherwise, expertise, promise, premise*) or identifiers such as `aria-labelledby`, `programmer` and `madvise`.

# Factory Staleness Audit

A factory can be READY — corpus embedded, retrieval healthy, roster green — and still hand every session instructions built on systems that no longer exist. The startup card measures whether memory works. This audit measures whether memory is true.

Measured cases, with the factory names left out, are in [reference/worked-examples.md](reference/worked-examples.md).

Host notes: see `probot-orchestrator` → Host notes.

## When to run it

- After any component, connector, tool, or app is retired. The retirement does not propagate itself.
- When the operator says records are being lost, or that old ways of working keep resurfacing.
- When a session acts on an instruction that turns out to be obsolete.
- On a legacy factory, which accumulates this fastest.

## The five phases

Run them in order. Each result changes how you read the next. Read connection names off the wire. Run the set against every granted connection.

### Phase 1 — Does this factory have a re-ingestion pipeline?

A factory whose corpus self-heals on edit is a different problem from one where editing a document changes nothing anybody retrieves.

Resolve the object to its base table first. A trigger query against a view returns zero rows, and zero reads exactly like "no pipeline." Whether a given object is a view is a per-factory fact. Enumerate the schema. Do not probe one name you assume is a table.

```sql
SELECT c.relname AS object,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
                      WHEN 'm' THEN 'matview' ELSE c.relkind::text END AS kind,
       count(t.tgname) FILTER (WHERE NOT t.tgisinternal) AS user_triggers
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid
WHERE n.nspname = 'brain'
GROUP BY c.relname, c.relkind
ORDER BY c.relkind, c.relname;
```

Then ask whether anything writes the chunks. Triggers can maintain an entity index while the chunks arrive from outside the database.

```sql
WITH f AS (
  SELECT n.nspname||'.'||p.proname AS fn, pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname IN ('public','ops','brain','factory')
    AND p.prokind = 'f' AND l.lanname IN ('plpgsql','sql')
)
SELECT fn,
       CASE WHEN def ~* 'insert[[:space:]]+into[[:space:]]+(brain\.)?brain_chunks'
              THEN 'INSERTS chunks'
            WHEN def ~* 'delete[[:space:]]+from[[:space:]]+(brain\.)?brain_chunks'
              THEN 'DELETES chunks'
            ELSE 'reads only' END AS writes
FROM f WHERE def ~* 'brain_chunks' ORDER BY 2, 1;
```

If nothing writes the chunk table, every later fix must touch the document and the chunk, or search keeps serving the old text. "No pipeline" is the wrong report when Tier 1 self-heals and Tier 2 does not. Say which tier is the gap.

### Phase 2 — Is non-current content being served?

Skip this phase when the corpus is file-sourced and documents have no status column.

```sql
SELECT d.status, count(DISTINCT d.id) AS docs, count(c.id) AS chunks_in_corpus
FROM kb.documents d
LEFT JOIN kb.document_chunks c ON c.document_id = d.id
GROUP BY d.status ORDER BY d.status;
```

Then check whether retrieval filters on that status. A function that mentions the word is not a filter. Read the clause.

```sql
SELECT p.proname,
       (regexp_matches(pg_get_functiondef(p.oid), '(.{0,120}status.{0,160})', 'g'))[1] AS ctx
FROM pg_proc p WHERE p.proname ILIKE 'fn_search%';
```

The fix is a purge of derived retrieval artifacts, not a filter that leaves the dead weight in the index. Keep the source. Before deleting, prove the document still holds the full text. If the counts do not match, stop. The chunks are the only copy.

```sql
DELETE FROM kb.document_chunks c USING kb.documents d
 WHERE c.document_id = d.id AND d.status IN ('retired','archive');
```

Run the matching delete for the semantic index only after that proof, and only with the operator's approval. Destructive statements need `confirm_destructive` on `factory_query`. A privilege refusal is the grant working. Report it. Do not escalate.

### Phase 3 — Has anyone fed the decommissioned-terms detector?

```sql
SELECT count(*) AS terms, max(created_at)::date AS newest_term
FROM factory.decommissioned_terms;
```

Compare `newest_term` with the most recent retirement. A gap is the finding. Expect the table's columns and even its schema to differ by factory. Read the columns before writing. One insert shape will not fit the estate.

Choose precise terms. A broad product name is safe in an infrastructure corpus and noisy in a subject-matter one. A noisy detector gets ignored, which is worse than no detector. If the table has no allowlist column, you cannot mark a legitimate historical reference as expected, and the next phase's false positives recur.

### Phase 4 — Run the detectors and triage the hits

```sql
SELECT 'rules' AS surface, count(*) FROM public.v_rules_with_decommissioned_terms
UNION ALL SELECT 'sops', count(*) FROM public.v_sops_with_decommissioned_terms
UNION ALL SELECT 'knowledge', count(*) FROM public.v_knowledge_with_decommissioned_terms;
```

A hit is not a defect. Sort every hit before changing anything.

| Bucket | Looks like | Action |
|---|---|---|
| Prescription | Names the retired thing as the way to do something now | Fix. This is the defect |
| Prohibition | Says never to use it | Keep. The detector cannot tell these apart |
| History | A decision record or postmortem of what was true then | Keep |

Read the whole rule, not the excerpt the view returns. A rule can contradict itself. Count occurrences before promising a fix. If a whole section prescribes the retired mechanism, that is a documented rewrite with a version bump. Route it to Smith. Do not pattern-match a section into a one-line edit.

### Phase 5 — Sweep the estate

Retirements are estate-wide. Corpora are not. Repeat phases 1–4 on every granted connection. Report per factory. Do not assume a factory is behind. A detector nobody reads changes nothing. The gap is that a retirement does not propagate into the documents that depend on it.

## Reporting

Report per surface, with counts, and separate the three buckets. Never report a hit count as a defect count.

State which of these the factory is:

- **Pipeline present** — a document fix self-heals into the corpus.
- **Pipeline absent** — every fix must touch the document and the chunk.

## Lane

- **Probot** runs the audit and reports.
- **Fred** executes deletions and archives. Custody first. `.trash/` or an archive folder. Never a bare delete of the only copy.
- **Data** runs the approved database statements and reads them back.
- **Smith** takes anything that needs a doctrine or procedure rewrite.
- **Operator** approves any write, any purge, and any change to shared doctrine.

## Three traps

**Privileges vary.** A destructive statement the role cannot run is a refusal. Report the SQLSTATE. Do not try to become the owner.

**Respect the version gate.** A content change that the table refuses without a version bump in the same statement is the gate working. Comply. Never route around it.

**A zero is not a finding until you know what you measured.** A trigger count against a view is always zero. Name the object beside the zero.
