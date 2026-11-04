# Worked examples

These are the measurements the procedure was written from. They are examples, not instructions for a named factory. Read the live schema. Do not copy a count forward.

## Contents

- Pipeline shape
- Non-current content
- Terms nobody added
- Hits that were not defects
- A detector nobody read

## Pipeline shape

One factory concentrated its triggers on a single source table: a version gate, a content hash, an automatic re-chunker, a stale marker, an index seeder, a delete cleaner, and a revision archiver. Edit the document and the corpus followed.

Another factory had more user triggers, laid out across several source tables, each with a seed, refresh, cleanup, and stale-mark. Its chunk table was not written by any database function. The only functions that named it were search functions, read-only. Chunks arrived from an external conversion. A changed source file refreshed the entity index and left the chunk tier serving the old text.

A third factory stored the chunk object as a view. A trigger count against the view returned zero and was reported as "no pipeline." The base table had the triggers. Resolve `relkind` first.

## Non-current content

One corpus was serving a large share of its chunks from documents already marked retired or archive. Both of its search functions mentioned status and neither filtered on it. The only match was a return column whose name contained the word. The startup card stayed READY the whole time.

## Terms nobody added

On the day a broker was retired, a naming-convention term was added and the retired mechanism's own names were not. The detector was maintained for the convention and not for the retirement. Precise terms beat a bare product name. One subject-matter corpus uses ordinary words that would make a broad term fire constantly.

Column shape differed: some factories keep the list in `factory.decommissioned_terms`, one keeps it under an archive schema, and not every shape has an allowlist column.

## Hits that were not defects

Four rule hits, three of them prohibitions. The one real defect had already been amended in its second half and still told sessions to call tool names that no longer exist. Read the whole rule.

A count of "two stale lines" was wrong. The real figure was the occurrences inside the procedure bodies. Count before you promise a fix.

## A detector nobody read

One factory had already cataloged a retirement with precise terms, and still carried the dead connector as a non-negotiable in its own project instructions. Terms without a reader change nothing.
