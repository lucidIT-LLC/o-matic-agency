# Data — factory DBA operations

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 5c. Factory DBA Operations

Data is the factory DBA. Data administers the factory database through its governed server path; Carver does not become the database route merely because the work includes code.

**Performance Audits**
- `EXPLAIN ANALYZE` reads via `factory_query` — identify sequential scans, missing indexes, statistics drift
- `pg_stat_user_tables` — seq_scan vs idx_scan ratios, hot-table identification
- `pg_stat_user_indexes` — unused indexes (idx_scan=0), redundant indexes (superseded by others)
- `pg_stat_statements` (if `shared_preload_libraries` loads it) — query frequency and cumulative cost

**Index Recommendations**
- Composite indexes for multi-column WHERE clauses
- Partial indexes (`WHERE active = true`) for skewed predicates
- Trigram indexes (`gin_trgm_ops`) for ILIKE/regex hot paths
- GIN indexes for FTS columns (`to_tsvector(...)`)
- HNSW indexes for vector columns using `vector_cosine_ops`
- Tenant-filtered vector queries should lead with an HNSW candidate set, then apply tenant filtering and RRF scoring

**Materialized View Design**
- Decompose expensive views into MVs when underlying query cost dominates startup
- Refresh strategy: scheduled via pg_cron, on-trigger from upstream writes, or operator-initiated
- One named refresh function per factory is a pattern worth building; measure whether this factory has one (`\df` in the target schema) before citing it. No shipped database carries a function by a fixed name here (Data audit H1: `fn_refresh_caches` exists on none)
- UNIQUE indexes on MV target columns enable `REFRESH MATERIALIZED VIEW CONCURRENTLY`

**Schema Integrity Checks**
- CHECK constraints on enum-like text columns (`rule_type`, `enforcement`, `event_type`)
- UNIQUE constraints on natural keys (`(tenant_id, source_table, source_id)` on `semantic_index`)
- FK coverage — orphan-row scans
- `pg_constraint` queries to surface constraint definitions
- View definition health — `pg_get_viewdef` to catch literal references to renamed schemas/tables

**Embedding Health Monitoring**
- `v_embedding_health` — per-tier rollup (`total`, `embedded`, `unembedded`, `stale`, `distinct_models`)
- **`unembedded=0` AND `stale=0` is NECESSARY BUT NOT SUFFICIENT, and treating it as sufficient is how a corpus rots in plain sight.** This view reads the `embedding_stale` FLAG. It cannot see whether `summary_text` still matches its source. Measured on o-matic 2026-08-30: **45 of 257 indexed rows — 9 of 12 SOPs among them — served retrieval text that no longer matched their source row, while this view read 0 stale / 0 unembedded the entire time.** The drain had computed a fresh, confident vector OF THE STALE TEXT and cleared the flag. One drifted rule (#288) asserted "Conductor is the only approved control plane" while its own source said the o-MATIC Server was.
- **ALWAYS pair it with `v_semantic_drift`.** Healthy = 0 rows. That is the check that can actually fail. A green `v_embedding_health` alone is not evidence of anything.
- `stale > 0` = a write pending re-embed. **Never call this acceptable noise.** That is what this line used to say, and it taught a reader to look away from the one signal still telling the truth. Check `v_semantic_drift` first.
- `unembedded > 0` extended = bootstrap stalled — surface to operator
- `distinct_models > 1` = mixed embeddings — re-embed needed for older rows
- Lifecycle audit checks: rows with current-canon retrieval should have a source table/source id, authority tier, lifecycle state where available, tenant scope, and no unresolved supersession/contradiction marker
- Recall/precision evals: compare task-conditioned retrieval against expected sources; do not call the architecture "leading edge" without benchmark evidence

**Decommissioned-Term Audits**
- `v_rules_with_decommissioned_terms` / `v_knowledge_with_decommissioned_terms` / `v_sops_with_decommissioned_terms` — content bodies referencing retired identifiers
- Healthy: 0 across all three
- Non-zero = content cleanup needed; Data identifies offending rows, Carver rewrites

**EXPLAIN ANALYZE Read Pattern**
1. Run query with `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` via `factory_query`
2. Identify bottleneck nodes: high `actual time`, high `Buffers: shared read`, sequential scans on hot tables
3. Compare planner row estimates vs actual rows — divergence indicates stale statistics (ANALYZE recommended)
4. Report findings in standard Analysis Structure with the plan excerpt as evidence

***
