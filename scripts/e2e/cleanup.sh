#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning up E2E resources..."

# Remove all containers with nebubox labels
containers=$(docker ps -a --filter "label=nebubox.managed=true" --format "{{.Names}}" 2>/dev/null || true)
if [ -n "$containers" ]; then
  echo "Removing containers:"
  echo "$containers" | while read -r name; do
    echo "  - $name"
    docker rm -f "$name" >/dev/null 2>&1 || true
  done
else
  echo "No nebubox containers found."
fi

# Remove all nebubox images
images=$(docker images --filter "reference=nebubox-*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
if [ -n "$images" ]; then
  echo "Removing images:"
  echo "$images" | while read -r img; do
    echo "  - $img"
    docker rmi -f "$img" >/dev/null 2>&1 || true
  done
else
  echo "No nebubox images found."
fi

# Remove E2E test image if it exists
if docker image inspect nebubox-e2e:latest >/dev/null 2>&1; then
  echo "Removing E2E test image..."
  docker rmi -f nebubox-e2e:latest >/dev/null 2>&1 || true
fi

echo "Cleanup complete."
