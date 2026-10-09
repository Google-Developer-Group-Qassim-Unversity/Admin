#!/usr/bin/env bash
# Screenshot one view with headless Chromium.
# Usage: design-options/shot.sh <view> <lang> <theme> <out.png> [width] [height] [file]
#   view: compare | najdi | metro | pocket | tonal
#   file: defaults to .preview-<view>.html if it exists, else gdg-admin-designs.html
set -euo pipefail
cd "$(dirname "$0")"
view=$1 lang=$2 theme=$3 out=$4 w=${5:-1760} h=${6:-3200}
file=${7:-}
if [ -z "$file" ]; then
  if [ -f ".preview-$view.html" ]; then file=".preview-$view.html"; else file="gdg-admin-designs.html"; fi
fi
/usr/bin/chromium --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
  --virtual-time-budget=8000 --window-size="$w,$h" \
  --screenshot="$out" "file://$PWD/$file?d=$view&lang=$lang&theme=$theme" 2>/dev/null
echo "$out"
