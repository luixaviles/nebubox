#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
CLEANUP_IMAGES=()

cleanup() {
  for img in "${CLEANUP_IMAGES[@]}"; do
    docker rmi -f "$img" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT

assert_ok() {
  local desc="$1"
  shift
  set +e
  "$@" >/dev/null 2>&1
  local rc=$?
  set -e
  if [ "$rc" -eq 0 ]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (exit $rc)"
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
    echo "  FAIL: $desc (pattern '$pattern' not found)"
    FAIL=$((FAIL + 1))
  fi
}

assert_output_not_contains() {
  local desc="$1" pattern="$2"
  shift 2
  set +e
  local output
  output=$("$@" 2>&1)
  set -e
  if echo "$output" | grep -q "$pattern"; then
    echo "  FAIL: $desc (pattern '$pattern' unexpectedly found)"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  fi
}

echo "=== Environment Isolation Tests ==="

# Verify Docker is available
if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not available"
  exit 0
fi

# Build an npm-based tool image to validate ARG vs ENV behaviour.
# The bug: NPM_CONFIG_PREFIX was set as a Docker ENV, persisting at runtime.
# Tools that re-exec themselves after login (e.g. Gemini CLI) would fail with
# "Cannot find module" because Node used the stale prefix for resolution.
# The fix: NPM_CONFIG_PREFIX is now a Docker ARG (build-time only).

TOOL="gemini"
IMAGE_NAME="nebubox-${TOOL}:latest"
CLEANUP_IMAGES+=("$IMAGE_NAME")

echo "  Building ${TOOL} image..."
assert_ok "build ${TOOL} image" node dist/index.js build --tool "$TOOL"

# ── Build-time ARG must NOT leak into runtime ────────

assert_output_not_contains \
  "NPM_CONFIG_PREFIX is not set at runtime" \
  "NPM_CONFIG_PREFIX" \
  docker run --rm "$IMAGE_NAME" -c "env"

# ── Runtime PATH still includes .npm-global/bin ──────

assert_output_contains \
  "PATH includes .npm-global/bin" \
  ".npm-global/bin" \
  docker run --rm "$IMAGE_NAME" -c 'echo $PATH'

# ── Tool binary is discoverable via PATH ─────────────

assert_ok "tool binary is in PATH" \
  docker run --rm "$IMAGE_NAME" -c "which gemini"

# ── npm package directory exists ─────────────────────

assert_ok "npm package exists in .npm-global" \
  docker run --rm "$IMAGE_NAME" -c "test -d /home/coder/.npm-global/lib/node_modules/@google/gemini-cli"

# ── Tool starts without module resolution errors ─────
# This is the exact failure mode: the tool binary runs but Node.js
# cannot find the backing module, producing "Cannot find module ...".

set +e
output=$(docker run --rm "$IMAGE_NAME" -c "gemini --help 2>&1 || true")
set -e

if echo "$output" | grep -q "Cannot find module"; then
  echo "  FAIL: tool has module resolution errors"
  FAIL=$((FAIL + 1))
elif echo "$output" | grep -q "MODULE_NOT_FOUND"; then
  echo "  FAIL: tool has MODULE_NOT_FOUND error"
  FAIL=$((FAIL + 1))
else
  echo "  PASS: tool starts without module resolution errors"
  PASS=$((PASS + 1))
fi

echo ""
echo "Environment Isolation: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
