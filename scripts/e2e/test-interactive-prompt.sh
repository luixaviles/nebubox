#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

echo "=== Interactive Prompt Tests ==="

# Test that start without --tool and without TTY exits with error
# and produces the expected error message about stdin not being interactive
set +e
output=$(echo "" | node dist/index.js start /tmp 2>&1)
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo "  PASS: start without --tool and no TTY fails"
  PASS=$((PASS + 1))
else
  echo "  FAIL: start without --tool and no TTY should fail (got exit 0)"
  FAIL=$((FAIL + 1))
fi

# Verify the error message mentions stdin/interactive/--tool (not some unrelated error)
if echo "$output" | grep -qi "tool\|interactive\|stdin\|TTY"; then
  echo "  PASS: error message mentions tool/interactive/stdin"
  PASS=$((PASS + 1))
else
  echo "  FAIL: error message does not mention tool/interactive/stdin: $output"
  FAIL=$((FAIL + 1))
fi

# Test that build without --tool and without TTY exits with error
set +e
output=$(echo "" | node dist/index.js build 2>&1)
rc=$?
set -e

if [ "$rc" -ne 0 ]; then
  echo "  PASS: build without --tool and no TTY fails"
  PASS=$((PASS + 1))
else
  echo "  FAIL: build without --tool and no TTY should fail (got exit 0)"
  FAIL=$((FAIL + 1))
fi

if echo "$output" | grep -qi "tool\|interactive\|stdin\|TTY"; then
  echo "  PASS: build error message mentions tool/interactive/stdin"
  PASS=$((PASS + 1))
else
  echo "  FAIL: build error message does not mention tool/interactive/stdin: $output"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "Interactive Prompt: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
