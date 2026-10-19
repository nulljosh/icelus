#!/usr/bin/env bash
# Cut every icon surface from brand/icon-1024.png (made by the icon skill's make_brand.py).
# Run after each new major's icon: iOS + Mac AppIcon, Watch AppIcon, web icons, landing copies, og image.
set -euo pipefail
cd "$(dirname "$0")/.."
src=brand/icon-1024.png
cut() { magick "$src" -resize "$1x$1" -alpha off "$2"; }
cp "$src" ios/App/Assets.xcassets/AppIcon.appiconset/icon_1024.png
for s in 16 32 64 128 256 512 1024; do cut $s ios/App/Assets.xcassets/AppIcon.appiconset/mac_$s.png; done
for s in 48 55 58 80 87 88 100 172 196 216 1024; do cut $s watchos/Assets.xcassets/AppIcon.appiconset/icon-$s.png; done
for s in 192 512; do cut $s public/icon-$s.png; done
cut 512 public/icon-512-maskable.png
cp icon.svg landing/icon.svg
cp public/icon-192.png landing/icon-192.png
# The og image is brand/og.html (it reads icon.svg): screenshot it at 1200x630 to landing/og.png.
echo "icon surfaces cut from $src"
