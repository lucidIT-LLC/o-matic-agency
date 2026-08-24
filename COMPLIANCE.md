# Compliance posture — o-MATIC Agency

## The short version

**This repository makes no compliance claim.** It distributes Markdown
instruction files. It processes no data, stores nothing, transmits nothing, and
enforces nothing.

That is not modesty, it is accuracy. Compliance properties belong to the system
that actually handles data — the **O-Matic Server** and the **O-Matic Factory**
deployed on it. Restating those properties here would attach them to the wrong
artifact and inflate them in the process.

## Why this page exists at all

Because client IT and security reviewers reasonably ask, and the honest answer is
short and checkable:

- The packs contain **no PHI, no PII, and no customer data**, and cannot receive any.
- They contain **no credentials** and cannot obtain one.
- They **cannot open a connection**. There is no code to do it.
- Installing a pack changes what a model reads. It does not change what any
  system can reach.

If your review needs a boundary statement: **the trust boundary is the O-Matic
Server**, not this repository. Everything that authenticates, authorises, audits,
encrypts or refuses happens there.

## Where the real claims live, and their ceiling

Compliance status for the O-Matic Server and Factory is tracked in the System 5
compliance register, which records for every HIPAA Security Rule and HITRUST
control a **truth status** — MISSING / DESIGNED / BUILT / LIVE / EVIDENCED /
ASSESSED — together with the evidence that advanced it (a commit, a measurement,
or a signed document — never an intention).

Public language is capped by that status. This is an enforced rule, not a style
preference:

| Truth status | What may be said publicly |
|---|---|
| MISSING / DESIGNED / BUILT | **Nothing.** Silence. |
| LIVE | The specific measured mechanism, and nothing more. |
| EVIDENCED | The "designed to support HIPAA Security Rule safeguards" formulation. |
| ASSESSED | Only what the assessment letter permits, quoted. |

**Forbidden at every rung, always:**

- "HIPAA certified" — no such certification exists.
- "HITRUST certified" — before a validated assessment completes.
- "compliant" as an unqualified adjective.

Ask for the current register rather than inferring status from any document,
including this one. A compliance claim copied into a file goes stale silently;
the register does not.

## Scope note for reviewers

Two things are frequently conflated and should not be:

1. **This pack** — text, no capability, no claim. What you are reading.
2. **The O-Matic Server** — the control plane that holds credentials, issues
   per-client tokens, enforces per-connection grants, and returns SQLSTATE-only
   errors so that a database message cannot quote a failing row. That is the
   system a compliance review should examine.

A skill pack cannot make a factory compliant, and a compliant factory does not
make a skill pack a control.
