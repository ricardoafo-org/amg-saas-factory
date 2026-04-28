#!/usr/bin/env bash
# lint-castilian-spanish.sh — block Rioplatense voseo + LatAm lexicon in shipping copy.
#
# Memory rule: "AMG copy must be Castilian Spanish, never Rioplatense" — voseo
# (vos/tenés/querés) and LatAm-only words (computadora/celular) are dev-personality,
# never product copy. This gate keeps the rule deterministic so a future regression
# cannot quietly ship.
#
# Exit codes:
#   0  no violations found in scanned paths
#   1  one or more shipping files contain forbidden markers — block merge
#
# Scope (shipping content only — dev-facing files are NOT scanned):
#   src/app/**, src/core/**, src/emails/**, src/lib/chatbot/**
#   public/**/*.{html,json}
#   clients/**/*.json
#
# Excluded (dev-facing, comments-allowed):
#   **/__tests__/**, **/*.test.{ts,tsx}, **/*.spec.{ts,tsx}
#   src/lib/nlp/__tests__/** (NLP fixtures may classify voseo input)
#   docs/**, scripts/**, *.md, CLAUDE.md, README.md
#
# Run locally:
#   bash scripts/lint-castilian-spanish.sh
#   bash scripts/lint-castilian-spanish.sh --files "src/app/foo.tsx src/emails/bar.tsx"

set -uo pipefail

# Forbidden patterns — whole word, case-insensitive.
# Voseo verb conjugations (clearest signal — unambiguous Rioplatense):
VOSEO_VERBS='\b(tenés|querés|podés|decís|sabés|escribís|hablás|andás|salís|comés|hacés|ponés|mirá|venís|escribime|llamame|contame|fijate|acordate|dejame|esperame)\b'

# LatAm-only lexicon that diverges from Castilian:
LATAM_LEXICON='\b(computadora|celular|cuadra|manejar el (auto|coche|carro)|chequear|placard|pollera|frutilla|durazno)\b'

FAILURES=0
REPORT=""

red()    { printf '\033[0;31m%s\033[0m' "$1"; }
green()  { printf '\033[0;32m%s\033[0m' "$1"; }

# Determine target files
FILES_ARG=""
if [[ "${1:-}" == "--files" && -n "${2:-}" ]]; then
  FILES_ARG="$2"
fi

# Path filter: keep only files in shipping paths.
is_shipping_path() {
  local f="$1"
  # Excludes first
  case "$f" in
    *__tests__*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) return 1 ;;
    docs/*|scripts/*|*.md) return 1 ;;
    src/lib/nlp/*) return 1 ;;
  esac
  # Includes
  case "$f" in
    src/app/*|src/core/*|src/emails/*|src/lib/chatbot/*) return 0 ;;
    public/*.html|public/*.json) return 0 ;;
    clients/*.json) return 0 ;;
  esac
  return 1
}

scan_paths() {
  if [[ -n "$FILES_ARG" ]]; then
    for f in $FILES_ARG; do
      [[ -f "$f" ]] || continue
      is_shipping_path "$f" && echo "$f"
    done
  else
    # Full scan: enumerate shipping roots, then filter.
    {
      find src/app src/core src/emails src/lib/chatbot -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.json' \) 2>/dev/null
      find public -type f \( -name '*.html' -o -name '*.json' \) 2>/dev/null
      find clients -type f -name '*.json' 2>/dev/null
    } | while read -r f; do
      is_shipping_path "$f" && echo "$f"
    done
  fi
}

run_check() {
  local label="$1" pattern="$2"
  local hits=""

  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    # -E extended regex, -i case-insensitive, -n line numbers, -H filename
    if matches=$(grep -EiHn "$pattern" "$f" 2>/dev/null); then
      hits+="${matches}"$'\n'
    fi
  done < <(scan_paths)

  if [[ -n "$hits" ]]; then
    REPORT+="FAIL: ${label}"$'\n'"${hits}"$'\n'
    FAILURES=$((FAILURES + 1))
  else
    REPORT+="PASS: ${label}"$'\n'
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# Run checks
# ──────────────────────────────────────────────────────────────────────────────

run_check "voseo verbs (Rioplatense conjugations in shipping copy)" "$VOSEO_VERBS"
run_check "LatAm lexicon (non-Castilian word choices)" "$LATAM_LEXICON"

# ──────────────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────────────

printf '%b' "$REPORT"
echo ""

if [[ $FAILURES -gt 0 ]]; then
  red "Castilian Spanish lint FAILED — ${FAILURES} check(s) hit."
  echo ""
  echo "Memory rule: product copy ships in Castilian (tú/tienes/coche/ordenador)."
  echo "Rioplatense voseo is for dev dialogue ONLY, never user-facing strings."
  echo ""
  echo "Fix: rewrite the offending lines in Castilian, then re-run."
  exit 1
fi

green "Castilian Spanish lint PASSED — all ${FAILURES:-0} checks clean."
echo ""
exit 0
