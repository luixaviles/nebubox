#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
CLEANUP_CONTAINERS=()
CLEANUP_IMAGES=()

cleanup() {
  for name in "${CLEANUP_CONTAINERS[@]}"; do
    docker rm -f "$name" >/dev/null 2>&1 || true
  done
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

echo "=== Docker Integration Tests ==="

# Verify Docker is available
if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not available"
  exit 0
fi

TOOL="codex"
IMAGE_NAME="nebubox-${TOOL}:latest"
TEST_DIR=$(mktemp -d)
CONTAINER_NAME="nebubox-${TOOL}-$(basename "$TEST_DIR")"
CLEANUP_CONTAINERS+=("$CONTAINER_NAME")
CLEANUP_IMAGES+=("$IMAGE_NAME")

# ── Build ────────────────────────────────────────────

echo "  Building image (this may take a while)..."
assert_ok "build image via CLI" node dist/index.js build --tool "$TOOL"

# Verify image exists with docker directly
assert_ok "image exists after build" docker image inspect "$IMAGE_NAME"

# ── List (before any containers) ─────────────────────

assert_ok "list command runs" node dist/index.js list
assert_ok "list with --tool filter runs" node dist/index.js list --tool "$TOOL"

# ── Start container ──────────────────────────────────

# Use the CLI to start a container (non-interactive: it will create + start but
# attachContainer will fail immediately since there's no TTY, which is expected)
set +e
node dist/index.js start "$TEST_DIR" --tool "$TOOL" </dev/null >/dev/null 2>&1
set -e

# Verify the container was created (even if attach failed)
set +e
container_inspect=$(docker inspect "$CONTAINER_NAME" --format '{{.Name}}' 2>&1)
inspect_rc=$?
set -e
if [ "$inspect_rc" -eq 0 ]; then
  echo "  PASS: container created after start"
  PASS=$((PASS + 1))
else
  echo "  FAIL: container not found after start ($container_inspect)"
  FAIL=$((FAIL + 1))
fi

# List should now show our container
assert_output_contains "list shows created container" "$CONTAINER_NAME" node dist/index.js list

# ── Stop container ───────────────────────────────────

# Ensure container is running first
docker start "$CONTAINER_NAME" >/dev/null 2>&1 || true

set +e
running=$(docker inspect "$CONTAINER_NAME" --format '{{.State.Running}}' 2>&1)
set -e
if [ "$running" = "true" ]; then
  assert_ok "stop container via CLI" node dist/index.js stop "$CONTAINER_NAME"

  # Verify it's no longer running
  set +e
  stopped=$(docker inspect "$CONTAINER_NAME" --format '{{.State.Running}}' 2>&1)
  set -e
  if [ "$stopped" = "false" ]; then
    echo "  PASS: container stopped after stop command"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: container still running after stop (state=$stopped)"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  SKIP: container not running, cannot test stop (state=$running)"
fi

# ── Remove container ─────────────────────────────────

assert_ok "remove container via CLI" node dist/index.js remove "$CONTAINER_NAME"

# Verify container is gone
set +e
docker inspect "$CONTAINER_NAME" >/dev/null 2>&1
gone_rc=$?
set -e
if [ "$gone_rc" -ne 0 ]; then
  echo "  PASS: container gone after remove"
  PASS=$((PASS + 1))
else
  echo "  FAIL: container still exists after remove"
  FAIL=$((FAIL + 1))
fi

# ── Cleanup temp dir ─────────────────────────────────

rm -rf "$TEST_DIR"

echo ""
echo "Docker Integration: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
