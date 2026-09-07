#!/usr/bin/env bash
# scheduled-live-run.sh — task #613.
#
# KR4-same-result-three-times grades RED at 19 for exactly one reason: all 47
# graded verdicts sit on ONE calendar day (2026-09-06). Nothing reruns the
# conformance suite, so the factory holds zero evidence about what survives a
# cold context — which is the entire question that Key Result asks. This is the
# harness half of the fix; the scheduler that calls it is
# ~/.claude/scheduled-tasks/conformance-suite-daily/.
#
# WHAT THIS SCRIPT DOES, AND WHAT IT DELIBERATELY DOES NOT.
#   preflight   proves the credential presented is the eval-conformance client
#               at permission read_only, and ABORTS otherwise (exit 3). This is
#               task #616's gate: Smith's 16-case L2 run of 2026-09-06 was
#               declared VOID (audit_id 22) because a conformance stimulus hit a
#               real stateful trigger and mutated the very row it was grading. A
#               work claim cannot stop that, because every agent authenticates
#               as the same read_write principal. Only the CREDENTIAL can.
#   grade       turns a live transcript file into per-case verdicts and the
#               roster_audit_log payload in KR4's exact expected shape.
#   record      NOT DONE HERE, on purpose. Appending the audit row is a write and
#               the eval credential cannot make one — that is the point of it.
#               The caller records the emitted payload through the governed
#               path as a separate, single, append-only statement.
#
# Usage:
#   scheduled-live-run.sh preflight
#   scheduled-live-run.sh grade <transcripts.json>
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN_FILE="${OMATIC_EVAL_TOKEN_FILE:-$HOME/.claude/omatic-eval-conformance.token}"

if [[ ! -r "$TOKEN_FILE" ]]; then
  echo "✘ eval credential not readable at $TOKEN_FILE" >&2
  echo "  Refusing to run. A conformance run must present the read_only" >&2
  echo "  eval-conformance client; falling back to a write-capable token is" >&2
  echo "  the defect task #616 exists to prevent." >&2
  exit 3
fi
# Read the token WITHOUT exporting the operator's read_write OMATIC_MCP_TOKEN
# into the child: run-conformance.mjs falls back to OMATIC_MCP_TOKEN when
# OMATIC_EVAL_TOKEN is unset, and that fallback must not be reachable here.
OMATIC_EVAL_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
export OMATIC_EVAL_TOKEN
unset OMATIC_MCP_TOKEN

case "${1:-}" in
  preflight)
    exec node "$HERE/run-conformance.mjs" --live
    ;;
  grade)
    [[ -n "${2:-}" ]] || { echo "grade needs a transcripts.json path" >&2; exit 2; }
    # Preflight first even on grade: the credential check is what makes the run
    # admissible, and grading a run whose credential was never verified would
    # record evidence about a run nobody can vouch for.
    node "$HERE/run-conformance.mjs" --live >/dev/null
    exec node "$HERE/run-conformance.mjs" --grade-file "$2"
    ;;
  selftest)
    # No credential needed: fixture grading touches no database at all.
    node "$HERE/run-conformance.mjs"
    exec node "$HERE/run-conformance.mjs" --armor
    ;;
  *)
    echo "usage: scheduled-live-run.sh {preflight|grade <transcripts.json>|selftest}" >&2
    exit 2
    ;;
esac
