<!-- shared:system-5-detection start -->
**Test the value and the observable shape, never the key name.** A key called
`openai_api_key` is not evidence of an OpenAI path. On the reference factory it
holds `env:CONDUCTOR_TOKEN`, and `openai_embedding_model` holds the current
`nomic-embed-text-v1.5@e9b67630…`. Those names survive because the on-device
provider is `onboard-openai-compatible` — it speaks the OpenAI REST *protocol*
against loopback. They are protocol names, not vendor names. Matching the label
false-positived both reference factories, and it misses the same secret stored
under any other label (task #276; FA-2026-05 §4.1, "search for values, not just
key names").

That `env:CONDUCTOR_TOKEN` value is not a typo and has not been corrected here:
it is what the reference factory still holds, verified 2026-08-24. That retired
broker was shut down 2026-08-23 (decision #355), so the value is a pointer into a retired
system's environment — which is the lesson twice over. Read what is there, report
it, and do not "fix" a config value because its name looks obsolete.

Run this through the O-Matic Server's `factory_query`. It resolves vector columns by type,
so it does not care whether the tiers live in `brain.*`, `kb.*`, or elsewhere,
and it reads `factory_config` in a way that works whether `value` is `jsonb` or
`text`:

```sql
-- System 5 detection v2. One row out. Any error is a FAIL — except 42P01 on
-- factory.factory_config, which is NOT-A-FACTORY (see PASS / FAIL below).
WITH vec AS (
  SELECT n.nspname AS sch, c.relname AS tbl, a.atttypmod AS dim
  FROM pg_attribute a
  JOIN pg_class c     ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_type t      ON t.oid = a.atttypid
  WHERE t.typname = 'vector' AND a.attnum > 0 AND NOT a.attisdropped
    AND c.relkind IN ('r','m','p')
    AND n.nspname NOT IN ('pg_catalog','information_schema')),
-- Memory-tier candidates: a vector table that ALSO carries the rest of the
-- KB-0002 bookkeeping set. A query cache or a held evaluation set has the
-- vector and none of this, and is correctly excluded rather than failed.
vt AS (
  SELECT v.sch, v.tbl
  FROM (SELECT DISTINCT sch, tbl FROM vec) v
  JOIN pg_class c     ON c.relname  = v.tbl
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.sch
                     AND c.relnamespace = n.oid
  WHERE (SELECT count(DISTINCT a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
            AND a.attname IN ('model_version','embedded_at','embedding_stale')) = 3),
rt AS (
  SELECT count(*) AS n FROM pg_attribute a
  JOIN pg_class c     ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE a.attname = 'embedding_runtime' AND a.attnum > 0 AND NOT a.attisdropped
    AND (n.nspname, c.relname) IN (SELECT sch, tbl FROM vt)),
cfg AS (SELECT key, btrim(value::text, '"') AS v FROM factory.factory_config),
live AS (
  SELECT key, v FROM cfg
  WHERE key <> 'embedding_migration_state'
    AND v IS NOT NULL AND btrim(v) <> '' AND lower(v) <> 'null'
    AND v !~ '^env:'),
t AS (SELECT
  (SELECT count(*) FROM vec) > 0
    AND (SELECT count(*) FROM vec WHERE dim <> 768) = 0            AS a_vector_dim,
  (SELECT count(*) FROM vt) > 0
    AND (SELECT n FROM rt) = (SELECT count(*) FROM vt)             AS b_runtime_col,
  coalesce((SELECT v FROM cfg WHERE key = 'embedding_dimension'),'') = '768'
                                                                   AS c_cfg_dim,
  (SELECT count(*) FROM live
     WHERE v ~ '^sk-[A-Za-z0-9_-]{16,}'
        OR v ~* 'api\.openai\.com'
        OR v ~* 'text-embedding-(3-(small|large)|ada-002)') = 0     AS d_no_live_openai)
SELECT a_vector_dim, b_runtime_col, c_cfg_dim, d_no_live_openai,
  CASE WHEN a_vector_dim AND b_runtime_col AND c_cfg_dim AND d_no_live_openai
       THEN 'PASS — System 5' ELSE 'FAIL — pre-System-5 or unproven' END AS verdict
FROM t;
```

**Three portability defects this version fixes, all found by running it on a
second factory** (FA-2026-09 / KB-0441, raised by theNest, 2026-08-16):

1. **`factory_config.value` is not `jsonb` everywhere.** The previous `cfg` CTE
   used `value #>> '{}'` and the previous `live` CTE used `jsonb_typeof(value)`.
   **Both** are independent JSONB dependencies, and on a `text` column each
   raises `42883`. A patch that fixed only `jsonb_typeof` still errored — measure
   after patching, do not assume. `btrim(value::text, '"')` reads both column
   types and still compares cleanly to `'768'` on a `jsonb` factory.
   `lower(v) <> 'null'` replaces the `jsonb_typeof` guard and additionally
   catches a literal text `"null"`, which the old form missed.
2. **`b_runtime_col` was over-scoped.** It demanded `embedding_runtime` on every
   vector-bearing table, including ones KB-0002 says are *not* memory. A factory
   with a legitimate query-embedding cache reported `false` forever, no matter
   how compliant its real tiers were. `vt` now selects only tables carrying the
   `model_version` + `embedded_at` + `embedding_stale` bookkeeping set. This is
   deliberately **not** the full contract shape — `embedding_runtime` is excluded
   from the filter precisely so the boolean still has something to prove. A 4.x
   memory table carries the other three and lacks the runtime column, and is
   correctly failed.
3. **"Any error is a FAIL" conflated *pre-System-5* with *not a factory at
   all*.** See the verdict table below.

**Before publishing any change to this block, run it on at least two factories
whose `factory_config.value` column types differ.** The original was written
against one schema and shipped as canonical; every peculiarity of its birth
factory silently became a precondition of the standard. Where a standard's own
text converts an execution error into a substantive verdict, the error path *is*
a reported result — and an unexercised error path reports confidently and
wrongly.

**What each column proves**, in descending order of reliability:

| Column | PASS needs | Why it holds |
|---|---|---|
| `a_vector_dim` | `true` | Structural. Every `vector` column is `vector(768)`. A `vector(1536)` is decisive pre-5 and no config row can fake it either way. Resolved from `pg_attribute`, so a renamed schema or table cannot hide it. |
| `b_runtime_col` | `true` | Every **memory-tier** table also carries `embedding_runtime`. Added by the on-device migration; absent on 4.x. Scoped to tables carrying the KB-0002 bookkeeping set, so a query cache or evaluation set does not fail a compliant factory. |
| `c_cfg_dim` | `true` | `factory_config.embedding_dimension` is `768`. Read it with `btrim(value::text, '"')` — `value` is `jsonb` on some factories and `text` on others, and `#>> '{}'` raises `42883` on the latter. Weakest of the four: it is a config row, so it agrees with `a_vector_dim` or one of them is lying. |
| `d_no_live_openai` | `true` | **Value-shaped scan over every config value regardless of its key name** — the false-negative half. Flags an API-key-shaped literal, an `api.openai.com` endpoint, or an OpenAI embedding model named as live config. |

`d_no_live_openai` deliberately excludes two things that are *not* evidence of a
live OpenAI path: values beginning `env:` (an indirection to the Keychain/token,
never a literal secret), and the `embedding_migration_state` row, whose
`from_model` legitimately records `text-embedding-3-small` as the model the
factory migrated *away* from. Provenance is not exposure.

**PASS / FAIL:**

- **PASS — System 5** only when `verdict` reads `PASS — System 5`, i.e. all four
  booleans are `true` in the one returned row.
- **NOT-A-FACTORY** when the error is `42P01` (undefined_table) on
  `factory.factory_config` — the database has no `factory` schema. This is a
  *distinct verdict*, not a FAIL. Reporting it as FAIL invites a conversion of
  something that was never a factory and must never become one.
- **FAIL — pre-System-5 or unproven** on anything else, specifically:
  - any boolean `false`;
  - **the query errors** for any other reason — no `vector` type, no grant, wrong
    connection, `42883` from an un-patched detector against a `text` config
    column. An error is a FAIL, never "inconclusive". Report the SQLSTATE and the
    error text verbatim and stop;
  - **zero rows** — this query returns exactly one row whenever it runs at all,
    so no rows means it did not run. An empty result is never a pass.

**Read the SQLSTATE before you read the verdict.** A refusal that is treated as a
finding, and re-run rather than diagnosed, survives indefinitely: `42883` is
`undefined_function` and `428C9` is `generated_always`, and neither has ever
meant `insufficient_privilege`. Both have cost this estate weeks.
- A `false` on `d_no_live_openai` is the only *credential* finding in the set.
  Treat it as an exposure and route it before conversion, not as a schema note.

Do not reinstate a `schema_contract` check here — **the mechanism was never
built.** `system-5-built-vs-planned.md` records that no `schema_contract` table
exists anywhere in the database and lists writing one as an outstanding DDL
deliverable. The plan's enforcement language — historical, naming the retired
broker and the plugin as readers at connect/startup, with a conformance suite
testing three states — is
plan text describing intent, not a record of shipped behaviour. Measured
2026-08-14: absent from o-matic in every form; present in Commons only as a row
hand-written on 2026-08-09. One hand-made row in one database is not a mechanism,
and a detector for an unbuilt mechanism detects nothing.

If `schema_contract` is ever built for real — written on every factory, read at
startup, and tested by the conformance suite — reinstate it then, and not before.
Until that happens, treating its absence as a factory defect reports a planning
gap as an operational failure.

Report the result plainly. A pre-5 factory is not broken and it is not "degraded
System 5" — it runs the 4.x contract: plugin-direct SQL, credentials on the host,
keyword-only retrieval where no embedding provider is reachable. Conversion is a sequenced
advisory (FA-2026-05), not an ad-hoc fix; never half-convert a factory to make one
query work.

## What good looks like — the data doctrine

Detection tells you whether a factory is System 5. **KB-0002, *Factory Vector
Memory Design*** (Commons, design-guide, v2.0.0) tells you what a correct one is
built from. Read it before designing or repairing a tier — not after.

The parts you are expected to know without opening it:

- **The mandatory column set on every vector-bearing table:** `embedding`,
  `model_version`, `embedded_at`, `embedding_stale`, `embedding_runtime`. Missing
  any one of them means the table cannot participate in a drain — a table with a
  vector column and nothing else is storage, not memory. Measured 2026-08-15: the
  drain resolves tier tables by *contract shape*, so a table lacking these is
  correctly skipped rather than corrupted, which is how About Jimmy's
  `query_embedding_cache` and two held evaluation sets survive a drain untouched.
- **Index pairing:** partial HNSW on `embedding WHERE embedding IS NOT NULL`,
  plus a GIN index on a **precomputed `tsv` column** — never inline
  `to_tsvector()`. Hybrid retrieval needs both halves; one alone is not the
  contract.
- **Tenant scoping is per-corpus, not universal.** `brain.*` carries `tenant_id`;
  `kb.*` in the shared doctrine library has **no tenant column at all**. Code that
  assumes one throws on Commons. This is a real defect that shipped — the drain
  pinned `tenant_id = 'omatic'` and would have failed on Commons even after its
  schema hardcode was fixed.
- **The `factory_config` embedding block** declares provider, endpoint, model and
  dimension. It is a *declaration*, not proof: a complete, correct-looking
  embedding contract can be entirely inert. Call it and read what comes back.

**Row counts prove storage. Only a query with a real vector distance proves
retrieval.** A corpus that is 100% embedded and never queried with a vector is a
filing cabinet.

Doctrine lives in Commons and is the authority: **KB-0051** (the Blueprint —
System 5.2 is a chapter of it, amendment v2.6.0, not a separate book) and
**KB-0002** (this data doctrine). The files in `_omatic/blueprints/` — among them
`system-5-plan.md`, `system-5-compliance-register.md` and
`marketplace-change-log.md`, plus historical notes such as `conductor-v1.5.md`
that describe retired mechanisms — are working notes derived from those, and they
carry no version, hash or gate. **When they disagree with Commons, Commons wins.**
<!-- shared:system-5-detection end -->
