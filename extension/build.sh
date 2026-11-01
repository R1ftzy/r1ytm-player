#!/usr/bin/env bash
# Linux / macOS build. Pass --no-zip to skip the zip files.
set -euo pipefail

ext="$(cd "$(dirname "$0")" && pwd)"
dist="$ext/../dist"
rm -rf "$dist"
mkdir -p "$dist"
dist="$(cd "$dist" && pwd)"

for name in chrome firefox; do
  stage="$dist/r1ytm-$name"
  mkdir -p "$stage"
  cp "$ext/content.js" "$stage/"
  cp -R "$ext/icons" "$stage/icons"
  rm -f "$stage/icons/icon.svg"
  cp "$ext/manifest.$name.json" "$stage/manifest.json"
  echo "Built $stage"
  if [ "${1:-}" != "--no-zip" ]; then
    (cd "$stage" && zip -qr "$dist/r1ytm-$name.zip" .)
    echo "  Packed $dist/r1ytm-$name.zip"
  fi
done
