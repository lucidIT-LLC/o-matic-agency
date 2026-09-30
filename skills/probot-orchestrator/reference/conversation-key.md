# Probot — the conversation key

Reference file for this skill. SKILL.md is the role guide and says when to read this file.

## 7a. The conversation key — mint once, carry, never regenerate

`conversation_key` must be **stable for the life of one conversation** and
**distinct between concurrent conversations**. Those two properties are the
whole specification; everything below exists to satisfy both without pretending
to a capability this runtime does not have.

**What is NOT available, established rather than assumed.** MCP 2025-06-18
carries no conversation identifier — no header, no parameter, nothing. Its only
identity field, `Mcp-Session-Id`, is minted fresh on every `initialize` by
spec, so it is *anti-stable*. And a skill file is instructions to a model, not
code: it cannot compute or hash anything at runtime. **A value the model
invents fresh each turn is worse than passing nothing at all** — no key at
least adopts the right kernel across a reconnect, while a per-turn key opens a
brand-new kernel on every single call. That is the churn we just fixed,
reproduced from the client side, and it would not look like a failure.

**The rule, most reliable first.**

1. **If this host names the conversation in a value you can RE-READ, use it.**
   Some hosts hand a session a durable per-conversation path or identifier —
   Claude Code, for example, gives each session its own scratchpad directory
   whose name is that session's UUID. Prefer any such value, because it can be
   *looked up again* on any later turn instead of recalled. Form the key as
   `omatic-<factory_id>-<that identifier>`. Re-read it; never recite it from
   memory.

2. **Otherwise mint it ONCE, at STEP 1b, and carry it.** Compose
   `omatic-<factory_id>-<UTC date>-<time to the minute>-<four random
   characters>`, e.g. `omatic-omatic-20260913-2148-k7qz`. The date-time makes
   two conversations minutes apart distinct; the random suffix covers two
   opened inside the same minute.

**MINT ONCE MEANS ONCE PER CONVERSATION, NOT ONCE PER TURN, AND NOT ONCE PER
TOOL CALL.** Read that sentence again before writing a key. The mechanism that
makes carrying safe is mechanical, not memory: **the key is printed in the
startup report, and every subsequent `kernel_*` call copies it verbatim off
that printed line.** If you are about to type a `conversation_key` that is not
character-for-character identical to the one already in this transcript, you
are regenerating, and you must not. If no key appears in this transcript, this
conversation has not run STEP 1b — run it, do not invent one retroactively.

**It is scoped by the server, so it need not be secret.** The server derives the
kernel key from `sha256("ck:" + authenticated principal + ":" + your key)`. The
principal is server-side and never caller-supplied, so a guessed key cannot
reach another client's kernel. A readable, printable key is therefore safe, and
readable is exactly what makes re-reading possible.

**The honest limit.** Route 2 is the weaker route and is named as weak: it
depends on the model copying a printed string correctly for the length of a
session. That is why the self-check in STEP 1b exists — `continuity` must read
`bound` on every kernel call after the first. `opened` twice, or `adopted` at
all, means the carry failed, and the report says so rather than glossing it.
Route 1 has no such dependency and is preferred wherever the host offers it.

***
