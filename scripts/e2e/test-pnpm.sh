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
    echo "  FAIL: $desc (pattern '$pattern' was found)"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  fi
}

echo "=== pnpm Support Tests ==="

# Verify Docker is available
if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not available"
  exit 0
fi

TOOL="claude"
IMAGE_NAME="nebubox-${TOOL}-pnpm:latest"
CLEANUP_IMAGES+=("$IMAGE_NAME")

# ── Build with --pnpm ─────────────────────────────

echo "  Building ${TOOL} image with --pnpm (this may take a while)..."
assert_ok "build ${TOOL} --pnpm image via CLI" node dist/index.js build --tool "$TOOL" --pnpm

# Verify image exists
assert_ok "pnpm image exists after build" docker image inspect "$IMAGE_NAME"

# ── Verify pnpm is installed ──────────────────────

assert_ok "pnpm is installed" \
  docker run --rm "$IMAGE_NAME" -c "pnpm --version"

assert_output_contains "pnpm --version reports a version" "^[0-9]" \
  docker run --rm "$IMAGE_NAME" -c "pnpm --version"

assert_output_not_contains "pnpm runs without corepack download prompt" "Do you want to continue" \
  docker run --rm "$IMAGE_NAME" -c "pnpm --version"

# ── Verify npm still works alongside pnpm ─────────

assert_ok "npm still available" \
  docker run --rm "$IMAGE_NAME" -c "npm --version"

# ── Combined: --pnpm --github ─────────────────────

COMBINED_IMAGE="nebubox-${TOOL}-pnpm-github:latest"
CLEANUP_IMAGES+=("$COMBINED_IMAGE")

echo "  Building ${TOOL} image with --pnpm --github (this may take a while)..."
assert_ok "build ${TOOL} --pnpm --github image" node dist/index.js build --tool "$TOOL" --pnpm --github

assert_ok "combined image exists" docker image inspect "$COMBINED_IMAGE"

assert_ok "pnpm works in combined image" \
  docker run --rm "$COMBINED_IMAGE" -c "pnpm --version"

assert_ok "gh works in combined image" \
  docker run --rm "$COMBINED_IMAGE" -c "gh --version"

echo ""
echo "pnpm Support: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
