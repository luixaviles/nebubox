#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

assert_exit() {
  local desc="$1" expected="$2"
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  local actual=$?
  set -e
  if [ "$actual" -eq "$expected" ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (expected exit $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_output_contains() {
  local desc="$1" pattern="$2"
  shift 2
  set +e
  local output
  output=$("$@" 2>&1)
  set -e
  if echo "$output" | grep -q "$pattern"; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (pattern '$pattern' not found in output)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== CLI Basics ==="

# --help prints usage info and exits 0
assert_output_contains "--help shows usage" "USAGE" node dist/index.js --help
assert_exit "--help exits 0" 0 node dist/index.js --help

# 'help' command works the same
assert_exit "help command exits 0" 0 node dist/index.js help

# --version prints version and exits 0
assert_output_contains "--version shows version" "nebubox v" node dist/index.js --version
assert_exit "--version exits 0" 0 node dist/index.js --version

# Unknown command exits non-zero and shows error
assert_exit "unknown command exits 1" 1 node dist/index.js badcommand
assert_output_contains "unknown command shows error" "Unknown command" node dist/index.js badcommand

# Missing required argument exits non-zero
assert_exit "stop without name exits 1" 1 node dist/index.js stop
assert_exit "attach without name exits 1" 1 node dist/index.js attach
assert_exit "remove without name exits 1" 1 node dist/index.js remove
assert_exit "start without path exits 1" 1 node dist/index.js start

# Missing arg error messages mention usage
assert_output_contains "stop shows usage hint" "Usage:" node dist/index.js stop
assert_output_contains "attach shows usage hint" "Usage:" node dist/index.js attach
assert_output_contains "remove shows usage hint" "Usage:" node dist/index.js remove

# No command shows help and exits non-zero
assert_exit "no command exits 1" 1 node dist/index.js
assert_output_contains "no command shows usage" "USAGE" node dist/index.js

# Unknown flag warnings
assert_output_contains "unknown flag warns" "Unknown flag" node dist/index.js start . --tool claude --badFlag
assert_output_contains "unknown flag includes flag name" "--badFlag" node dist/index.js start . --tool claude --badFlag

# Known flags should NOT produce unknown flag warnings
# (--rebuild is known, output should not contain "Unknown flag")
# We test indirectly: --help with --rebuild should not warn
assert_exit "--help with --rebuild exits 0" 0 node dist/index.js --help --rebuild

# --no-cache should warn (replaced by --rebuild)
assert_output_contains "--no-cache warns as unknown" "Unknown flag" node dist/index.js build --tool claude --no-cache

echo ""
echo "CLI Basics: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
