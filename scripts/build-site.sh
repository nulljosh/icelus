#!/usr/bin/env bash
# ponytail: compose the Pages site — marketing landing at /, the app at /app
set -euo pipefail
cd "$(dirname "$0")/.."

# vite lives in devDependencies; without this npx silently resolves nothing and
# the build dies with ERR_MODULE_NOT_FOUND.
[ -d node_modules/vite ] || npm install

# build into a scratch dir and only swap dist/ in on success, so a failed build
# never leaves you without the previous good one
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

npx vite build --base=/app/ --outDir="$staging/app" --emptyOutDir
cp -R landing/. "$staging/"

rm -rf dist
mv "$staging" dist
chmod 755 dist  # mktemp -d makes 0700; the site dir should be world-readable
trap - EXIT

echo "built dist/ (landing at /, app at /app)"
