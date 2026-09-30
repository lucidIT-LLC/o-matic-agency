# Data — vector search

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 5d. Vector Search

When keyword search and direct SQL cannot surface a relevant pattern, Data uses semantic search across the factory brain.

**Architecture facts (measured 2026-08-09, System 5):**
- Vector storage: **Postgres** via `pgvector`. Single database.
- Tier 1: `brain.semantic_index` — `embedding vector(768)`, HNSW + FTS gin on `summary_text`
- Tier 2: `brain.document_chunks` — `embedding vector(768)`, HNSW + FTS gin on `content`
- Both tiers also carry `model_version`, `embedding_runtime`, `embedding_stale`, `embedded_at`
- Embedding model: **`nomic-embed-text-v1.5@e9b6763023c676ca8431644204f50c2b100d9aab`**, 768-d, cosine, **on device**
- Provider: `factory_config.embedding_provider = onboard-openai-compatible` — a protocol name, not a vendor. The embedder runs on the o-MATIC Server host. **There is no OpenAI credential and no call leaves the device.** The `openai_*` config keys still exist, and their NAMES are not evidence of an OpenAI path — they are OpenAI-**protocol** settings. But do not read them as current: measured 2026-08-24 on the reference factory, `openai_base_url` = `https://127.0.0.1:8438/v1` and `openai_api_key` = `env:CONDUCTOR_TOKEN` both point at a broker that was decommissioned on 2026-08-23, while the corpus embeds fine with zero stale rows. **The recorded contract is therefore not the live path, and whatever performs the embedding is not reading these keys** (tracked as a task). Report these values as measured; never present them as the live contract, and never "correct" them on a running factory because they look obsolete. Judge by value, never by key name — see the detection test below

**`embedding_runtime` vs `model_version` — do not conflate them.** `model_version` is the weights identity and defines the vector space; `embedding_runtime` (`coreml`/`onnx`/`cuda`/`directml`) is separate metadata recording which engine produced the row. The same weights on Core ML and ONNX are the *same* space. Mixed `model_version` in one column is a corpus emergency; mixed `embedding_runtime` is ordinary in a multi-device estate — but it is the first thing to check when cosine scores look wrong.

**Query order:**
1. **Direct SQL first** via `factory_query` — exact lookups, cheapest path
2. **`search`** — one call, embeds on the server host and searches in the same round trip. This is the normal path, not the advanced one.
3. **FTS-only** — `fn_search_*` with a NULL vector through `factory_query`. This is the *degraded* path; see below.

**Search workflow:**
1. Call the server's `search` tool (`query`, `connection` read off the wire, `limit`). It embeds on the server host and searches in the same round trip; the vector never leaves the server. The server applies the `search_query:` prefix itself — pre-prefixing double-prefixes and degrades retrieval with no error anywhere
2. **Never hand-build a vector** and pass it to `fn_search_semantic` yourself (Smith #1013 F18; the factory's own instructions say the same). If you are reading the SQL function's behavior for diagnosis: it takes `p_query_model_version` and **refuses a weights mismatch** (task #222)
3. Returned columns: `id`, `source_table`, `source_id`, `entity_type`, `summary_text`, `fts_rank`, `vec_distance`, `combined_score` (RRF), `embedding_stale`
4. Stale rows surface to the operator — refresh is a server-owned lifecycle action; Data does not trigger it or claim its state without server evidence

**Keyword-only retrieval is a finding, not a neutral fallback.** If the server's `search` tool reports FTS-only or the embedding path is down, say so and label the result degraded — nothing labels it for you. Measured 2026-08-08/09: 28 of 93 retrieval events ran keyword-only and the vector path was dead for roughly 22 hours with nothing surfacing it. `v_retrieval_health` is the gauge; check it before concluding the corpus is at fault.

**The word DEGRADED belongs in the deliverable, not only the tool-call log.**
Found 2026-09-06 (`roster_audit_log` audit_id 15): given a keyword-only ILIKE
instruction, Data correctly wrote "degraded" in a tool-log appendix, but the
word never reached the pasteable artifact itself — a reader who takes only the
deliverable elsewhere never sees the caveat. When a briefing, report, or status
update is built on keyword-only/ILIKE retrieval (no semantic search), the
deliverable text itself — the part that travels, gets pasted, or gets forwarded
— must say **DEGRADED** and name the reason in plain terms. An appendix, tool
log, or footnote is a supplement to that statement, never a substitute for it.
Never assume the reader also reads the tool log. Softer synonyms do not
satisfy this — "no embeddings used," "ILIKE search," or "keyword match" state
the mechanism without ever making the finding: they read as a method note, not
a caveat. The deliverable's **opening line** must carry both the literal word
and the semantic-vs-keyword contrast, e.g.:

> Retrieval state: DEGRADED. This is a keyword-only ILIKE sweep, not semantic
> retrieval — [reason, e.g. embed_query unavailable / search tool withheld at
> operator instruction].

Lead with it, not trail it: `known_rules #248` makes keyword-only retrieval a
halt-tier disclosure, and a caveat buried after the findings is a caveat a
skimming reader never reaches.

**Memory lifecycle health workflow:**
1. Measure embedding health, stale rows, mixed models, and search-function availability.
2. Inspect retrieval results for retired/deprecated/superseded content being presented as current authority.
3. Identify contradiction candidates by source overlap, decommissioned terminology, or multiple current rows claiming the same authority surface.
4. Produce findings and, when authorized, perform the bounded database change with a work claim, readback, and evidence record. Probot integrates the result.

### System 5 — recognizing where a factory stands

**Current-runtime discipline.** Measure retrieval, corpus health, and data integrity from the live o-MATIC Server surface and the schema actually granted to the session. Treat historical configuration labels and copied detector SQL as audit evidence only, never as a current runtime contract. Route a proven legacy finding to Probot’s governed staleness-audit lane.

***
