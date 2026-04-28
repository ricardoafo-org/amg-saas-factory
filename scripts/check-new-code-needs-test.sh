#!/usr/bin/env bash
# check-new-code-needs-test.sh — block PRs that touch high-risk code without tests.
#
# Rule: any PR that adds or modifies TS/TSX in `src/actions/**` or `src/lib/**`
# must also add or modify at least one test file. This is the "new code needs
# test" rubric — informed by the SEV-1 incident where booking shipped without
# a regression test that would have caught the missing schema.
#
# Scope (high-risk paths — must be covered by tests):
#   src/actions/**/*.{ts,tsx}     (server actions = API surface)
#   src/lib/**/*.{ts,tsx}         (shared utilities + auth + tenant)
#
# Test paths (any of these counts as "test added"):
#   tests/**/*.{ts,tsx}
#   **/__tests__/**/*.{ts,tsx}
#   **/*.test.{ts,tsx}
#   **/*.spec.{ts,tsx}
#
# Exit codes:
#   0  PR adds tests OR touches no high-risk code OR has `no-test-required` label
#   1  PR adds high-risk code without any test change — block merge
#
# Inputs:
#   $1  --base-sha  (required)  base commit to diff against
#   $2  --head-sha  (required)  head commit
#   $3  --label-list (optional) comma-separated PR labels (skip if `no-test-required` present)
#
# Run locally (against current branch + main):
#   bash scripts/check-new-code-needs-test.sh \
#     --base-sha "$(git merge-base HEAD origin/main)" \
#     --head-sha HEAD

set -euo pipefail

BASE_SHA=""
HEAD_SHA=""
LABELS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-sha) BASE_SHA="$2"; shift 2 ;;
    --head-sha) HEAD_SHA="$2"; shift 2 ;;
    --label-list) LABELS="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$BASE_SHA" || -z "$HEAD_SHA" ]]; then
  echo "Usage: $0 --base-sha <sha> --head-sha <sha> [--label-list <csv>]" >&2
  exit 2
fi

# Escape hatch: PR labelled `no-test-required` skips this gate.
# Use this for pure type-only changes, doc-only refactors, and follow-up cleanups
# that have no behavior change. Document the reason in the PR body.
if [[ -n "$LABELS" ]] && echo ",${LABELS}," | grep -q ",no-test-required,"; then
  echo "PR labelled 'no-test-required' — skipping gate."
  echo "(Reason for skip should be documented in the PR description.)"
  exit 0
fi

# Compute changed files between base and head.
DIFF=$(git diff --name-only --diff-filter=AMR "$BASE_SHA" "$HEAD_SHA")

# High-risk: actions + lib TS/TSX, excluding tests inside those paths.
HIGH_RISK=$(echo "$DIFF" | grep -E '^(src/actions|src/lib)/' | grep -E '\.(ts|tsx)$' | grep -Ev '(__tests__|\.test\.|\.spec\.)' || true)

# Test changes: any file under tests/, __tests__, or *.test.* / *.spec.*
TESTS_CHANGED=$(echo "$DIFF" | grep -E '(^tests/|__tests__/|\.test\.(ts|tsx)$|\.spec\.(ts|tsx)$)' || true)

echo "── new-code-needs-test ──"
echo "High-risk files changed:"
echo "${HIGH_RISK:-  (none)}" | sed 's/^/  /'
echo ""
echo "Test files changed:"
echo "${TESTS_CHANGED:-  (none)}" | sed 's/^/  /'
echo ""

if [[ -z "$HIGH_RISK" ]]; then
  echo "PASS: PR touches no high-risk code — gate not applicable."
  exit 0
fi

if [[ -z "$TESTS_CHANGED" ]]; then
  echo "FAIL: PR modifies src/actions/** or src/lib/** without any test change."
  echo ""
  echo "Add a unit, contract, or integration test that exercises the new behavior,"
  echo "or apply the 'no-test-required' label with justification in the PR body."
  echo ""
  echo "Why this gate: the 2026-04-26 SEV-1 shipped because no test exercised the"
  echo "deployed booking flow. CI was green; production was dead. New high-risk"
  echo "code without a test is the failure mode that ate prod last week."
  exit 1
fi

echo "PASS: PR includes at least one test change alongside high-risk code edits."
exit 0
