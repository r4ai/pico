#!/usr/bin/env bash
# Builds the UDEV Gothic subset that Pico ships.
#
# The full font is a ~3.9 MB TTF. Every export inlines the selected font as a
# data URI, so shipping it whole would put several megabytes into every image.
# Subsetting to Latin plus JIS X 0208 level 1 keeps Japanese comments correct
# at a fraction of the size.
#
# Only Regular is shipped; the browser synthesizes bold. Doubling the payload
# for the handful of tokens a theme emboldens is not a good trade.
#
# Requires uv (https://docs.astral.sh/uv/). Run from the repository root:
#   ./scripts/build-udev-subset.sh
set -euo pipefail

VERSION="v2.2.0"
OUT="public/fonts/udev-gothic-subset.woff2"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Downloading UDEV Gothic $VERSION…"
curl -sL -o "$WORK/udev.zip" \
  "https://github.com/yuru7/udev-gothic/releases/download/$VERSION/UDEVGothic_$VERSION.zip"
unzip -o -q "$WORK/udev.zip" -d "$WORK"
TTF="$(find "$WORK" -name 'UDEVGothic-Regular.ttf' | head -1)"

echo "Building the character set…"
python3 - "$WORK/charset.txt" <<'PY'
import sys

chars = []
# ASCII and Latin-1, which cover code itself.
chars += [chr(c) for c in range(0x20, 0x100)]
# JIS X 0208 rows 1-47: symbols, kana, Greek, Cyrillic, and level 1 kanji.
for ku in range(1, 48):
    for ten in range(1, 95):
        try:
            chars.append(bytes([0xA0 + ku, 0xA0 + ten]).decode("euc_jp"))
        except UnicodeDecodeError:
            pass
# Punctuation and full-width forms that show up in Japanese comments.
chars += [chr(c) for c in range(0x2010, 0x2030)]
chars += [chr(c) for c in range(0xFF00, 0xFFF0)]

text = "".join(dict.fromkeys(chars))
with open(sys.argv[1], "w", encoding="utf-8") as handle:
    handle.write(text)
print(f"  {len(text)} characters")
PY

echo "Subsetting…"
uv run --quiet --with 'fonttools[woff]' pyftsubset "$TTF" \
  --text-file="$WORK/charset.txt" \
  --layout-features='' \
  --no-hinting \
  --desubroutinize \
  --flavor=woff2 \
  --output-file="$OUT"

ls -lh "$OUT"
