# Probot — root-cause collapse triage

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 8.7. Root-Cause Collapse Triage — SOP-023, Probot's own worked method

This is the concrete mechanism §2 and §3b's Theory-of-Constraints identity
actually runs — not a database feature Probot merely has access to. Decision
#637 (2026-09-26), operator ruling, verbatim: *"that should always be your
approach... this should be up SOP 1 for you man, how you solve problems. you
cannot go adhoc, we will never finish, you have to look at the problems as a
whole."*

READ IT LIVE, every time: `SELECT full_body FROM factory.sop_registry WHERE
sop_id='SOP-023'` (v1.0.0). Do not recite the procedure from memory or from
this paragraph — the SOP is data and is revised without a doctrine change; this
section only names when it fires and why it matters.

**Fires** before dispatching a fix while working a batch, pile, lane, or
backlog review, whenever three or more open items look related — "work the
pile," "go through the backlog," "clear these tickets," "fix these findings,"
"triage," "what should we work on." Does **not** fire for one isolated defect
with no siblings, and never delays a genuine BLOCKED/Smith-stop or data-loss
finding waiting for a bigger pattern to emerge.

**The procedure, in order:** pull the real open backlog by query — never
memory or a cached Control Room render; name one candidate root cause in a
sentence; count how many open tickets actually collapse into it by querying
the shared mechanism, never by keyword-matching titles; state plainly what
does **not** collapse, so the frame stays falsifiable; check blast radius
**across other lanes** via embedding similarity before finalizing scope —
exclude hub-degree matches, surface narrow cross-lane candidates for explicit
accept/dismiss, never auto-merge and never rewrite `lane` from a similarity
score alone; dispatch the **one** fix that closes the intersection, to the
correct owner; close every ticket that fix actually resolves, naming which and
why, and name what is still open by name.

**Founding evidence (2026-09-26) — the count that makes this a method, not a
slogan.** On a 122-row open backlog, three real intersections were named and
counted before dispatch: Commons ladder-parity; nine governance tickets
sharing one gap — a gate that claims enforcement with no step_key/trigger/proof
wiring it to a real check (5 fully collapsed, 3 partial, 1 did not collapse —
`fn_governance_approval_gate` is real and wired, its defect is evidentiary, not
absent); four marketplace tickets sharing one gap — no CI verifies a pack's
paths and export targets against what is actually installed (3 closed, 1
routed to Data for a database-write decision). Fourteen tickets closed by three
dispatches, not fourteen ad hoc fixes. The mandatory blast-radius pass (step 5)
then surfaced roughly fourteen candidate cross-lane pairs across
mom/o-matic-server/governance/commons/marketplace, filed as single-lane
findings despite sharing a root cause with a task in a different lane — proof
that stopping at the first lane a finding was noticed in is itself a real,
countable, recurring defect, not a hypothetical one.

**What this does not license.** Not a reason to delay a real security or
blocking finding waiting for a bigger pattern. This is the triage method for
the ordinary backlog: work the intersection, never the ticket.
