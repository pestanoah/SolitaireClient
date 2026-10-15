#!/usr/bin/env bash
# Regenerates every app icon PNG from the SVG sources in assets/icon-src/.
#
# Requirements (macOS): Google Chrome (headless SVG rasterization) and `sips`.
# Override the Chrome binary with CHROME=/path/to/chrome if needed.
#
# Native (referenced from app.json):
#   assets/icon.png (1024)                     full-bleed, opaque (iOS applies its own mask)
#   assets/favicon.png (48)                    rounded square; Expo builds favicon.ico from it
#   assets/android-icon-background.png (1024)  felt only
#   assets/android-icon-foreground.png (1024)  cards only, scaled into the adaptive-icon safe zone
#   assets/android-icon-monochrome.png (1024)  silhouette for Android 13+ themed icons
#
# PWA (referenced from public/manifest.json and public/index.html):
#   public/icons/icon-192.png / icon-512.png   rounded square "any" icons (transparent corners)
#   public/icons/icon-maskable-512.png         full-bleed maskable icon (art inside 80% safe zone)
#   public/icons/apple-touch-icon.png (180)    full-bleed, opaque
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/icon-src/icon.svg"
MONO_SRC="$ROOT/assets/icon-src/icon-monochrome.svg"
ASSETS="$ROOT/assets"
PWA="$ROOT/public/icons"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$PWA"

# Android adaptive icons are masked to as little as the central 66/108 (~61%) of the
# canvas, so the foreground artwork is shrunk to stay clear of the edges.
ADAPTIVE_SCALE='<g id="cards" transform="translate(256 256) scale(0.8) translate(-256 -256)">'

# --- Build SVG variants -------------------------------------------------------
cp "$SRC" "$TMP/full.svg"
sed 's/rx="0" fill="url(#felt)"/rx="112" fill="url(#felt)"/' "$SRC" > "$TMP/rounded.svg"
sed '/<g id="cards">/,/<!-- \/cards -->/d' "$SRC" > "$TMP/background.svg"
sed -e '/id="bg"/d' -e "s|<g id=\"cards\">|$ADAPTIVE_SCALE|" "$SRC" > "$TMP/foreground.svg"
sed "s|<g id=\"cards\">|$ADAPTIVE_SCALE|" "$MONO_SRC" > "$TMP/monochrome.svg"

# --- Rasterize ----------------------------------------------------------------
render() {
  # Renders a 512x512 SVG to a 1024x1024 PNG master with a transparent background.
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 \
    --window-size=512,512 --force-device-scale-factor=2 \
    --screenshot="$TMP/$1.png" "file://$TMP/$1.svg" >/dev/null 2>&1
}

for variant in full rounded background foreground monochrome; do
  render "$variant"
done

resize() {
  sips -z "$2" "$2" "$TMP/$1.png" --out "$3" >/dev/null
}

# Native
resize full 1024 "$ASSETS/icon.png"
resize rounded 48 "$ASSETS/favicon.png"
resize background 1024 "$ASSETS/android-icon-background.png"
resize foreground 1024 "$ASSETS/android-icon-foreground.png"
resize monochrome 1024 "$ASSETS/android-icon-monochrome.png"

# PWA
resize rounded 192 "$PWA/icon-192.png"
resize rounded 512 "$PWA/icon-512.png"
resize full 512 "$PWA/icon-maskable-512.png"
resize full 180 "$PWA/apple-touch-icon.png"

echo "Icons written to $ASSETS and $PWA"
