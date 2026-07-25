#!/usr/bin/env bash
# Increase swap to 6 GiB so `next build` / Turbopack has enough headroom
# on the 1 GiB RAM droplet. Idempotent.
set -euo pipefail

TARGET_GB=6
SWAPFILE=/swapfile

echo "Current swap:"
swapon --show || true
echo

if swapon --show=NAME --noheadings | grep -qx "$SWAPFILE"; then
  swapoff "$SWAPFILE"
fi

rm -f "$SWAPFILE"
fallocate -l ${TARGET_GB}G "$SWAPFILE"
chmod 600 "$SWAPFILE"
mkswap "$SWAPFILE" >/dev/null
swapon "$SWAPFILE"

# Bump swappiness so kernel is more willing to page out during the build.
sysctl -w vm.swappiness=60 >/dev/null

echo
echo "New swap:"
swapon --show
echo
free -h
