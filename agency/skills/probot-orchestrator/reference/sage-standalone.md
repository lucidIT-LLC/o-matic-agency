# Probot — Sage mode and standalone mode

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 9. Sage Mode & Standalone Mode

**Sage mode** = storage offline. Plugin still works, file ops blocked.

**Unstarted factory** = the o-MATIC Server MCP surface is not present on this host. Skills load and remain useful for planning, routing and advice; no factory read or write is possible, so every factory-internal fact is unverified. Declare it at callsign, name which host-side path is missing, and stop. This is a launch/configuration problem, never a database, network or credential problem inferred from a missing tool surface (KB-0418, KB-0417).

*"Standalone mode" and "advisory mode" are retired terms.* Both described a plugin — one absent, one whose Node runtime failed — and o-MATIC Agency ships no plugin. If a document still offers them as states, it predates this pack.

**The honest tension behind "unstarted factory" (decision #638).** The
operator's own ask, verbatim, 2026-09-26: *"you aren't a lot of help out in the
field when you are not connected... you need to understand system 7.5 system 8
whatever way better than you do."* That pulls directly against System 5.6's own
declared doctrine — *"identity is carried, knowledge is retrieved... once
carried, identity is not re-queried"* (this file's own header block; the same
line governs o-matic-server's CLAUDE.md). Carrying more of the factory's live
doctrine in this file would make Probot more useful exactly when the o-MATIC
Server surface is absent — which, by §7 STEP 5 and this section, is precisely
when it is least useful today. But that is the failure mode System 5.6 exists
to prevent: a factual corpus embedded here goes stale the moment the live
doctrine moves underneath it, and a stale copy served with confidence is worse
than an honest refusal. This factory has already paid for that mistake once —
CLAUDE.md itself records routing task #644 to a retired KB for hours because a
stale copy of *this same file* outlived the thing it named. There is no
version of this skill that is both fully useful offline and never stale; that
is a real architecture tension, not a gap waiting on a bigger rewrite, and it
is named here rather than oversold.

**A narrower middle ground exists, and it is a recommendation, not a decision
this skill makes for itself.** A small, durable set of *method* — the shape of
a procedure, such as SOP-023's seven steps (§8.7) or the L1–L4 conversion trace
in §8.5 — is a different kind of thing from a factual corpus: a method does not
go stale the way a fact does, because it does not assert what is currently true
of the factory, only how to find out. Carrying a short method summary in the
Tier 0 identity packet or this file is a materially smaller and safer bet than
carrying System 7.5/System 8 doctrine itself, which changes under every session
and must stay retrieval-only. Whether to make that trade — and for which
specific methods — is the operator's call under decision #413, not something
this revision implements unilaterally.

**Degraded mode** = one or more standard-criticality MCPs unavailable. Plugin online. Declare at startup and on any affected operation. Route to `v_mcp_readiness` for status. Affected skills declare reduced state at callsign (e.g., `CARVER [desktop unavailable — code-only mode]`).

***
