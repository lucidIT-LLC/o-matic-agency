---
name: factory-barnacle-cleanup
description: Probot-owned cleanup of an o-MATIC factory after many revisions. Sweeps every instruction surface (SOPs, rules, agents, and all markdown files, including .md, .mdc, .mdx and .markdown) for buildup, strips superseded, contradicted, duplicated and abandoned content, and leaves one clean, current set per factory that reflects how it actually runs, preserving everything still in effect. Tuned for the o-MATIC Server factories (theNest, Server Home, About Jimmy, lucidIT Corp, MoM, Commons, Practically Adventist, o-MATIC Foundry). Use when the operator says "clean up the instructions", "scrape the barnacles", "barnacle cleanup", "the instructions are a mess", or after a long run of revisions. Proposes; never rewrites live instructions without the operator's explicit approval of the exact text. Stale corpus and retired-mechanism hunting belong to factory-staleness-audit; run it first when retrieval may be serving retired documents.
---

**Locale — US English, always.**

> **Compatibility tier (required declaration, rule #284).** This pack ships **no
> MCP server**. With the **o-MATIC Server MCP surface** configured it runs fully:
> startup, governed reads of the factory's instructions, rules, SOPs and
> decisions, and approved writes routed to Data. On a **prompt-only host** it is
> **behavior-only**: it can clean up instruction text the operator pastes in, but
> it must say plainly that it could not check the text against the factory's
> recorded decisions.

# Factory Barnacle Cleanup

<!-- version: 1.1.0 | author: James Walker | package: o-MATIC Agency -->

> **What this fixes.** Every revision adds a layer. Old steps stay after their
> replacement lands, a rule and its reversal both survive, half-finished
> changes linger, and the same instruction appears three ways. Sessions then
> follow whichever layer they read first. This skill produces one current,
> internally consistent set and a ledger of everything removed and why.

## The prompt (post this to Probot)

> Probot, run factory-barnacle-cleanup on **<factory, or "all factories">**. Go
> through its SOPs, rules, agents and every markdown file (.md, .mdc, .mdx,
> .markdown) and look for buildup over time. Strip out what is superseded,
> contradicted, duplicated or abandoned, and leave one clean, current set that
> reflects how the factory actually runs now. Preserve anything still in effect,
> even if it is old. Show me the clean set and the removal ledger, factory by
> factory, before anything is written.

## Rules

1. **Start the factory first.** Run the About Jimmy startup, then `startup` on
   the target factory. Report its state honestly; a DEGRADED or BLOCKED card is
   stated, not worked around.
2. **Read-only until approved.** Nothing in the live factory changes until the
   operator approves the exact new text and the exact rows to retire, in their
   own chat message or widget tap. Voice relays never count as approval.
3. **Retire, never destroy.** Superseded material is marked retired or
   superseded and kept, with a pointer to what replaced it. Nothing is deleted.
4. **Evidence for every removal.** Each barnacle cites why it is dead: the later
   decision, rule or instruction that superseded it, the component retirement,
   or the operator's word. No evidence, no removal. It stays and is flagged.
5. **When in doubt, keep it and ask.** An old rule that nothing contradicts is
   still in effect. Age alone is never a reason to remove.
6. **Lanes.** Probot owns the plan and the proposal. Data performs the approved
   database writes. Fred handles any file-side copies. Doctrine or SOP rewrites
   with policy weight go to Smith for a stress test before approval.

## Phases

### 1. Inventory: sweep every surface
Run this per factory. On "all factories", do them one at a time in this order:
theNest, Server Home, About Jimmy, lucidIT Corp, MoM, Commons, Practically
Adventist, o-MATIC Foundry. Discover the schema live for each one; the same
concept lives in different tables per factory, and a view must be resolved to
its base table. Collect from all four surfaces:

- **SOPs**: every SOP and procedure record and every SOP document in the
  corpus, with its version and status.
- **Rules**: rules, standing decisions, governance and policy rows, and the
  decision log entries that created or changed them.
- **Agents**: roster rows, agent definitions and personas, agent memory,
  resident context, runtime contracts, and host skills such as `cursor-*` and
  `grok-*`. Look for retired agents still listed as active, two personas for one
  role, and memory that contradicts the current definition.
- **Markdown**: every markdown variant (`.md`, `.mdc`, `.mdx`, `.markdown`)
  that feeds the factory: instruction and project-instruction docs, SKILL.md,
  README, AGENTS.md, CLAUDE.md, Cursor rules, adapter paste cards, and markdown
  stored in the retrieval corpus. Read file-side copies through Fred; never
  pull a checkout onto Jimmy's computers.

Record each item's id or path, surface, source, date, version and current
status. A surface that cannot be reached is reported as unmeasured, not clean.

### 2. Lineage
Order the items by date and link each change to what it changed. Use the
decision log as the spine: for every rule, find the decision that created it and
any later decision that modified, reversed or retired it.

### 3. Classify
Put every item in exactly one bucket:
- **Current**: in effect and not contradicted. Keep.
- **Superseded**: replaced by a later item. Retire, citing the replacement.
- **Contradicted**: conflicts with a later decision. Retire the older side; if
  the dates or authority are unclear, flag it for the operator instead.
- **Duplicate**: the same instruction in more than one place. Keep the clearest
  wording once and retire the copies.
- **Abandoned**: a change that was started and never finished or adopted. Retire.
- **Obsolete**: names a component, tool, path or process that no longer exists.
  Retire, citing the retirement.
- **Drifted copy**: the same content in a markdown file and a database row, or
  in two hosts' versions, that no longer match. Keep the current one as the
  source and mark the other to be brought in line.
- **Unclear**: cannot be resolved from the record. Keep and ask.

### 4. Consolidate
For each factory, write one clean, current set from the Current items only:
one SOP set, one rule set, one roster with one definition per agent, and one
canonical markdown file per topic. Merge duplicates
into one wording, put the content in the order the factory actually works, and
use present tense. Do not invent anything new. Every line must trace to a kept
item.

### 5. Propose
Show the operator:
- the clean instruction set, in full;
- the removal ledger, with each retired item's id, its bucket, its evidence and
  what replaced it;
- the Unclear items as direct questions;
- the exact database writes Data would make.

Then stop and wait for approval.

### 6. Apply and verify (after approval only)
Data writes the clean set and marks the retired items. Afterward, re-run
`startup` and a retrieval spot check on two or three of the removed topics, and
confirm that only the clean set comes back. Report what changed in one short
summary.

## Output

Lead with the outcome: how many items were kept, retired and left Unclear,
followed by the clean set and the ledger. Use plain words, keep it terse, and
name no item as removed until it actually has been.
