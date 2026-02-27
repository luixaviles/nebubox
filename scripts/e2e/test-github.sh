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

echo "=== GitHub CLI Integration Tests ==="

# Verify Docker is available
if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not available"
  exit 0
fi

TOOL="codex"
IMAGE_NAME="nebubox-${TOOL}-github:latest"
CLEANUP_IMAGES+=("$IMAGE_NAME")

# ── Build with --github ─────────────────────────────

echo "  Building ${TOOL} image with --github (this may take a while)..."
assert_ok "build ${TOOL} --github image via CLI" node dist/index.js build --tool "$TOOL" --github

# Verify image exists
assert_ok "github image exists after build" docker image inspect "$IMAGE_NAME"

# ── Verify gh CLI is installed ──────────────────────

assert_ok "gh is installed" \
  docker run --rm "$IMAGE_NAME" -c "gh --version"

assert_output_contains "gh --version reports gh" "gh version" \
  docker run --rm "$IMAGE_NAME" -c "gh --version"

# ── Verify setup script is installed ────────────────

assert_ok "nebubox-gh-setup exists and is executable" \
  docker run --rm "$IMAGE_NAME" -c "test -x /usr/local/bin/nebubox-gh-setup"

assert_output_contains "nebubox-gh-setup contains auth check" "gh auth status" \
  docker run --rm "$IMAGE_NAME" -c "cat /usr/local/bin/nebubox-gh-setup"

# ── Verify .bashrc hook ────────────────────────────

assert_output_contains ".bashrc contains gh auto-setup hook" "nebubox-gh-setup" \
  docker run --rm "$IMAGE_NAME" -c "cat /home/coder/.bashrc"

echo ""
echo "GitHub CLI Integration: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
