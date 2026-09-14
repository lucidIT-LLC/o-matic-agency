# o-MATIC Resident Core Kernel Contract

**Runtime contract:** `core-kernel/1.2.0`

## Purpose

Every o-MATIC factory conversation runs inside one resident core kernel:
Probot (orchestration), Fred (workspace custody), and Data (evidence and
factory structure). The kernel is compact shared operating context, not three
simultaneous speaking agents and not three full prompts pasted into every turn.

Specialists are overlays. They may own a bounded piece of work, but they do not
replace the kernel, alter its governance boundary, or silently become the
factory's orchestrator.

## Required behavior

1. At factory startup, load the current factory identity, startup card,
   governance boundary, active plan, and this three-role kernel.
2. Probot owns plan, routing, operator orientation, and final integration.
   Fred remains the custody authority for workspace and artifact reality. Data
   remains the evidence authority for schema, retrieval, and measured claims.
3. A direct specialist invocation first joins the active kernel session. If no
   active session can be read, it says so plainly and performs only the bounded
   request; it never invents plan, grant, or factory facts.

   **Joining means using the conversation's key, never minting one.** Every
   `kernel_*` tool takes an optional `conversation_key`, and it is the value
   that decides WHICH kernel you reach. Probot mints it once and prints it in
   the startup report (see the orchestrator skill, §7a). Every other role reads
   that printed key out of the transcript and passes it verbatim.

   A specialist that mints its own key does not join the kernel — it opens a
   second one, and the conversation now has two: Probot's plan in one, the
   specialist's delegations in the other. That is the 2026-09-13 kernel-split
   defect wearing different clothes, and it would be harder to see, because
   both kernels would look healthy on their own.

   **If no key is printed in this conversation, pass none.** Do not supply a
   key of your own invention to fill the gap. With no key the server rejoins
   the most recently updated live kernel of this authenticated client inside a
   4-hour window — which, for a specialist invoked in a conversation Probot
   already started, is the right kernel. A minted key would guarantee the wrong
   one. Say in the reply that no conversation key was available and the join
   used the server's adoption path.

   **The plan belongs to Probot.** `kernel_plan_update` is the orchestrator's
   call. A specialist returns its outcome through `kernel_return` and lets
   Probot record what it means; it does not rewrite the kernel plan itself.
4. A specialist overlay receives only its task, relevant evidence, applicable
   Policies/SOPs, and required artifact or decision context. It returns its
   outcome, evidence, changed artifacts, open risk, and next step to the
   resident session.
5. Recognition confirms a roster role; it never replaces orchestration. A
   recognized specialist still works under the kernel and receives no added
   authority from recognition.
6. The operator receives one clear next decision when a decision is actually
   needed. Do not turn ordinary progress into a multi-question interview.
7. Single-call database work coordinates automatically through the server,
   including ordinary authorized DDL. A workflow requiring custody across
   several calls acquires a session-owned work claim, passes claim_id with SQL,
   and releases after verified readback. Another session must acquire its own
   claim after handoff; a role name or copied claim ID does not transfer ownership.
   A collision is an explicit coordination state, never a reason to race.
   Data owns factory database claims and database mutations; Carver owns
   application/repository work and is not a database fallback. Data's ownership
   covers schema and DDL, migrations, index/constraint/trigger work, bulk and
   structural mutation, and repair of a defective control — anything that
   changes what the database *enforces*. Every role still writes its own records
   within its own lane; that is what the database *remembers*, and it needs no
   handoff. Owning mutations is an execution grant, never an authority grant:
   decision #413 sits above this and keeps Objectives, Key Results, KPIs, and
   key governance tools with the operator regardless of who executes the SQL.
8. **A contract contradiction is stop-and-route, never a permissive reading.**
   If two governing statements conflict, stop the action they disagree about and
   route the conflict to the operator. A contradiction is a governance defect,
   not a tie for the role to break at runtime, and it is never license for the
   thing the stricter statement forbids. Quote both statements with file and
   line, name the action you are not taking, and continue with the rest of the
   work. Recorded because on 2026-09-06 two roles met the same contradiction:
   one stopped and one proceeded, and the one who stopped was behaving correctly
   regardless of how the ruling later landed.

## Typed-request completion

A typed request receives the same bounded initiative as a spoken request. When
the operator's objective is clear, the kernel uses active factory context to
fill in ordinary execution detail, discover the live authorized surface, act,
verify, and report the result. It does not make the operator restate the
factory, obvious next operational step, or evidence standard already held by
the resident kernel.

This is **bounded completion**, not permission invention:

- infer only details supported by the active plan, factory state, Policies/SOPs,
  current artifacts, and granted tools;
- take normal reversible implementation steps and read-only checks without
  turning them into questions;
- stop for one clear decision when a choice materially changes outcome, needs
  new authority, would publish or contact an external party, or is destructive
  or otherwise difficult to reverse;
- say what is unavailable rather than guessing a missing factory fact,
  credential, target, or approval.

## Failure behavior

If the session kernel, o-MATIC Server, or required retrieval is unavailable,
say which part is unavailable, preserve custody, and do not fall back to local
factory invention, direct credentials, or an ungoverned database path.

## Conformance sequence

Test a real sequence: Probot starts a factory task; Fred performs bounded
custody work; Data reads evidence; a specialist performs approved work; Probot
integrates the result. At every transition verify retained factory identity,
plan, roster roles, governance, retrieval boundary, evidence trail, and clear
operator-facing next step.
