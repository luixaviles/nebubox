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

echo "=== Build All Providers ==="

# Verify Docker is available
if ! docker info >/dev/null 2>&1; then
  echo "SKIP: Docker not available"
  exit 0
fi

TOOLS=$(node -e "const t = require('./dist/config/tools.js'); console.log(Object.keys(t.TOOL_PROFILES).join(' '))")

for TOOL in $TOOLS; do
  IMAGE_NAME="nebubox-${TOOL}:latest"
  CLEANUP_IMAGES+=("$IMAGE_NAME")

  echo "  Building ${TOOL} image..."
  assert_ok "build ${TOOL} image via CLI" node dist/index.js build --tool "$TOOL"
  assert_ok "${TOOL} image exists after build" docker image inspect "$IMAGE_NAME"
done

echo ""
echo "Build All Providers: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
