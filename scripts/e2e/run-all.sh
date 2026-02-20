#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0

run_test() {
  local script="$1"
  local name
  name=$(basename "$script" .sh)
  echo ""
  echo "========================================"
  echo "Running: $name"
  echo "========================================"
  set +e
  bash "$script"
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

# Run all test scripts in order
for script in "$SCRIPT_DIR"/test-*.sh; do
  if [ -f "$script" ]; then
    run_test "$script"
  fi
done

echo ""
echo "========================================"
echo "E2E Summary: $TOTAL_PASS suites passed, $TOTAL_FAIL suites failed"
echo "========================================"

if [ "$TOTAL_FAIL" -gt 0 ]; then
  exit 1
fi
