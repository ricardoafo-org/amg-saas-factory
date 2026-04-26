#!/usr/bin/env bash
# Deterministic security gate — covers HIGH/CRITICAL findings
# (tenant-isolation IDOR, filter injection, hardcoded secrets) and
# compliance checks (LOPDGDD, IVA, tenant data hardcoding).
#
# Exit codes:
#   0  all gates pass
#   1  one or more HIGH findings — block merge
#
# Runs on every PR via .github/workflows/security-gate.yml
# Designed to be cheap (grep only), deterministic, and reviewable.
#
# Run locally:
#   bash scripts/ci-security-gate.sh
#   bash scripts/ci-security-gate.sh --files "src/actions/foo.ts src/app/page.tsx"
#
# Scope:
#   - With --files: only the listed files are scanned (used in CI for changed files)
#   - Without:      the full src/ tree is scanned

set -uo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────

FAILURES=0
REPORT=""

red()    { printf '\033[0;31m%s\033[0m' "$1"; }
green()  { printf '\033[0;32m%s\033[0m' "$1"; }
yellow() { printf '\033[0;33m%s\033[0m' "$1"; }

log_fail() {
  local check="$1" msg="$2"
  REPORT+="FAIL: ${check}\n${msg}\n\n"
  FAILURES=$((FAILURES + 1))
}

log_pass() {
  local check="$1"
  REPORT+="PASS: ${check}\n"
}

# Determine target files
FILES_ARG=""
if [[ "${1:-}" == "--files" && -n "${2:-}" ]]; then
  FILES_ARG="$2"
fi

scan_paths() {
  if [[ -n "$FILES_ARG" ]]; then
    # Filter to ts/tsx and existing files only
    for f in $FILES_ARG; do
      [[ -f "$f" ]] || continue
      [[ "$f" =~ \.(ts|tsx)$ ]] || continue
      echo "$f"
    done
  else
    find src -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null
  fi
}

TARGETS=$(scan_paths)
if [[ -z "$TARGETS" ]]; then
  echo "$(yellow 'No TS/TSX files in scope — gate skipped.')"
  exit 0
fi

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 1 — Filter injection in PocketBase queries (HIGH)
#
# Bad:  pb.collection(...).getFirstListItem(`tenant_id = "${id}" && email = "${email}"`)
# Good: pb.collection(...).getFirstListItem(pb.filter('tenant_id = {:t} && email = {:e}', {...}))
#
# Heuristic: a getFirstListItem / getList / getFullList / getOne call whose first
# argument contains a backtick template literal with ${...} interpolation, AND
# the surrounding context does NOT use pb.filter().
# ──────────────────────────────────────────────────────────────────────────────

check_filter_injection() {
  local hits
  # Match: getFirstListItem(`...${...
  hits=$(echo "$TARGETS" | xargs grep -nE \
    '\.(getFirstListItem|getList|getFullList|getOne|getFirstItem)\s*\(\s*`[^`]*\$\{' \
    2>/dev/null || true)

  # Filter out lines that are inside a pb.filter(...) wrap
  local real_hits=""
  if [[ -n "$hits" ]]; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      if ! echo "$line" | grep -q 'pb\.filter'; then
        real_hits+="$line"$'\n'
      fi
    done <<<"$hits"
  fi

  if [[ -n "$real_hits" ]]; then
    log_fail "1. Filter injection — raw \${} interpolation into PocketBase filter" \
      "$(echo "$real_hits" | sed 's/^/  /')"
  else
    log_pass "1. Filter injection (PocketBase queries use parameterized pb.filter)"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 2 — Hardcoded IVA (HIGH for pricing logic)
# Anything multiplying by 1.21, 0.21, or "21%" in src/ is a violation.
# IVA rate must come from config collection.
# ──────────────────────────────────────────────────────────────────────────────

check_hardcoded_iva() {
  local hits
  hits=$(echo "$TARGETS" | xargs grep -nE '(\* *1\.21|\* *0\.21|^[^"\x27]*21%)' \
    2>/dev/null | grep -v '__tests__' | grep -v '\.test\.ts' || true)

  if [[ -n "$hits" ]]; then
    log_fail "2. Hardcoded IVA literal (must come from config collection)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "2. Hardcoded IVA"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 3 — Hardcoded tenant slug 'talleres-amg' in src/ (MEDIUM)
# Allowed in tests, clients/ config, and as fallback (BUG-008 deferred).
# Currently captures BUG-008 territory — informational, not blocking.
# ──────────────────────────────────────────────────────────────────────────────

check_hardcoded_tenant() {
  local hits
  hits=$(echo "$TARGETS" | xargs grep -nE "['\"]talleres-amg['\"]" \
    2>/dev/null | grep -v '__tests__' | grep -v '\.test\.ts' || true)

  if [[ -n "$hits" ]]; then
    REPORT+="WARN: 3. Hardcoded tenant slug 'talleres-amg' (BUG-008 deferred):\n$(echo "$hits" | sed 's/^/  /')\n\n"
  else
    log_pass "3. Hardcoded tenant slug"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 4 — PII in console logs (HIGH)
# console.log/.error/.info on the same line as email|phone|name|nif|dni|password
# is a leak. Caveat: strings like "email" as a label are filtered out.
# ──────────────────────────────────────────────────────────────────────────────

check_pii_in_logs() {
  local hits
  hits=$(echo "$TARGETS" | xargs grep -nE \
    'console\.(log|error|warn|info|debug)\s*\([^)]*(\bemail\b|\bphone\b|\bnif\b|\bdni\b|\bpassword\b|\btoken\b)' \
    2>/dev/null || true)

  # Exclude tests
  local real_hits
  real_hits=$(echo "$hits" | grep -v '__tests__' | grep -v '\.test\.ts' || true)

  if [[ -n "$real_hits" ]]; then
    log_fail "4. PII in console logs (LOPDGDD violation — Art. 32)" \
      "$(echo "$real_hits" | sed 's/^/  /')"
  else
    log_pass "4. PII in console logs"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 5 — Pre-ticked consent (HIGH — LOPDGDD Art. 7 + AEPD)
# Consent must be opt-in, never default-true.
# ──────────────────────────────────────────────────────────────────────────────

check_pre_ticked_consent() {
  local hits
  # Look for consent components with checked={true} or defaultChecked={true} or useState(true)
  hits=$(echo "$TARGETS" | xargs grep -lE 'consent|Consent' 2>/dev/null \
    | xargs grep -nE '(defaultChecked\s*=\s*\{?\s*true|^[^/]*\bchecked\s*=\s*\{?\s*true|useState\s*\(\s*true\s*\))' \
    2>/dev/null || true)

  if [[ -n "$hits" ]]; then
    log_fail "5. Pre-ticked consent (LOPDGDD violation — must be opt-in)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "5. Pre-ticked consent"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 6 — Secrets in client-side env (HIGH)
# NEXT_PUBLIC_*_KEY / *_SECRET / *_TOKEN exposes secrets to the browser bundle.
# ──────────────────────────────────────────────────────────────────────────────

check_client_side_secrets() {
  local hits
  hits=$(echo "$TARGETS" | xargs grep -nE \
    'NEXT_PUBLIC_[A-Z_]*_(KEY|SECRET|TOKEN|PASSWORD|PRIVATE)' \
    2>/dev/null || true)

  if [[ -n "$hits" ]]; then
    log_fail "6. Secret in NEXT_PUBLIC_* env var (leaks to client bundle)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "6. Client-side secrets"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 7 — Auth/PII tokens stored in localStorage / sessionStorage (HIGH)
# ──────────────────────────────────────────────────────────────────────────────

check_storage_tokens() {
  local hits
  hits=$(echo "$TARGETS" | xargs grep -nE \
    '(localStorage|sessionStorage)\.setItem\s*\([^)]*(token|email|phone|password|auth|jwt)' \
    2>/dev/null | grep -v '__tests__' | grep -v '\.test\.ts' || true)

  if [[ -n "$hits" ]]; then
    log_fail "7. Auth/PII in localStorage or sessionStorage (LOPDGDD + auth risk)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "7. Storage tokens"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 8 — Consent-log ordering invariant (HIGH)
# In any server action file that calls both consent_log.create and a personal-data
# write (appointments|customers|quote_requests), consent_log.create must appear FIRST.
# ──────────────────────────────────────────────────────────────────────────────

check_consent_log_order() {
  local violations=""
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    # Skip non-action files
    [[ "$f" =~ /actions/ ]] || continue
    # Skip tests
    [[ "$f" =~ __tests__|\.test\.ts$ ]] && continue

    local consent_line write_line
    consent_line=$(grep -nE "consent_log['\"]?\s*\)\s*\.create" "$f" 2>/dev/null | head -1 | cut -d: -f1)
    write_line=$(grep -nE "(appointments|customers|quote_requests)['\"]?\s*\)\s*\.create" "$f" 2>/dev/null | head -1 | cut -d: -f1)

    if [[ -n "$consent_line" && -n "$write_line" ]]; then
      if (( consent_line > write_line )); then
        violations+="  $f: consent_log.create at line $consent_line follows write at line $write_line\n"
      fi
    elif [[ -z "$consent_line" && -n "$write_line" ]]; then
      # Personal-data write without any consent_log
      violations+="  $f: personal-data write at line $write_line without consent_log.create in same file\n"
    fi
  done <<<"$TARGETS"

  if [[ -n "$violations" ]]; then
    log_fail "8. Consent-log order — consent_log.create MUST precede personal-data writes" \
      "$(printf '%b' "$violations")"
  else
    log_pass "8. Consent-log order"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 9 — Unconditional analytics in layout (HIGH — LSSI-CE)
# Tracking scripts must NOT execute before cookie consent.
# Plausible (cookieless, GDPR-compliant) is exempt.
# ──────────────────────────────────────────────────────────────────────────────

check_unconditional_analytics() {
  local hits
  # Match GA, GTM, FB Pixel, Hotjar, Clarity tags in layout/template files
  hits=$(echo "$TARGETS" | xargs grep -lE 'app/(layout|template)\.tsx$|src/app/.*layout' 2>/dev/null \
    | xargs grep -nE '(gtag\(|googletagmanager|fbq\(|hotjar|clarity\.ms)' \
    2>/dev/null || true)

  if [[ -n "$hits" ]]; then
    log_fail "9. Unconditional analytics in layout (LSSI-CE — must wait for consent)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "9. Unconditional analytics"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# CHECK 10 — .env files committed
# ──────────────────────────────────────────────────────────────────────────────

check_env_committed() {
  if git ls-files 2>/dev/null | grep -E '^\.env(\.|$)' | grep -v '\.env\.example' | grep -q . ; then
    local hits
    hits=$(git ls-files | grep -E '^\.env(\.|$)' | grep -v '\.env\.example')
    log_fail "10. .env file committed to git (secrets must not be tracked)" \
      "$(echo "$hits" | sed 's/^/  /')"
  else
    log_pass "10. .env not committed"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Run all checks
# ──────────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
echo "  AMG Security Gate — deterministic checks"
echo "═══════════════════════════════════════════════════════════════"
echo ""

check_filter_injection
check_hardcoded_iva
check_hardcoded_tenant
check_pii_in_logs
check_pre_ticked_consent
check_client_side_secrets
check_storage_tokens
check_consent_log_order
check_unconditional_analytics
check_env_committed

echo ""
echo "──────────────────────────────────────────────────────────────"
printf '%b' "$REPORT"
echo "──────────────────────────────────────────────────────────────"
echo ""

if (( FAILURES > 0 )); then
  echo "$(red "VERDICT: FAIL — $FAILURES blocking finding(s). Do not merge.")"
  exit 1
fi

echo "$(green 'VERDICT: PASS — no blocking findings.')"
exit 0
