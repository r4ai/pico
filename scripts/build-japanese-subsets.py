#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.59.1"]
# ///
"""Rebuild the three additional Japanese Regular faces; run from the repo root."""

from io import BytesIO
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

from fontTools import subset
from fontTools.ttLib import TTFont

# Version-pinned upstream releases, also documented in public/fonts/README.md.
SOURCES = (
    (
        "hackgen", "HackGen",
        "https://github.com/yuru7/HackGen/releases/download/v2.10.0/HackGen_v2.10.0.zip",
        "HackGen-Regular.ttf",
    ),
    (
        "plemoljp", "PlemolJP",
        "https://github.com/yuru7/PlemolJP/releases/download/v3.1.0/PlemolJP_v3.1.0.zip",
        "PlemolJP-Regular.ttf",
    ),
    (
        "firge", "Firge",
        "https://github.com/yuru7/Firge/releases/download/v0.3.0/Firge_v0.3.0.zip",
        "Firge-Regular.ttf",
    ),
)

# Same repertoire as build-udev-subset.sh: Latin, JIS X 0208 rows 1–47,
# punctuation and full-width forms. Characters outside it use system fallback.
characters = set(range(0x20, 0x100))
for row in range(1, 48):
    for cell in range(1, 95):
        try:
            characters.add(ord(bytes((0xA0 + row, 0xA0 + cell)).decode("euc_jp")))
        except UnicodeDecodeError:
            pass  # Unassigned JIS positions.
characters.update(range(0x2010, 0x2030))
characters.update(range(0xFF00, 0xFFF0))

for font_id, label, url, member in SOURCES:
    with urlopen(url, timeout=60) as response:
        data = response.read()
    with ZipFile(BytesIO(data)) as archive:
        matches = [name for name in archive.namelist() if Path(name).name == member]
        assert len(matches) == 1, f"Expected exactly one {member}: {matches}"
        font = TTFont(BytesIO(archive.read(matches[0])), recalcTimestamp=False)

    # Modified fonts get distinct internal names, respecting OFL reserved names.
    family = f"Pico {label} Subset"
    for record in font["name"].names:
        if record.nameID in (1, 3, 4, 6, 16):
            name = family.replace(" ", "") if record.nameID == 6 else family
            record.string = name.encode(record.getEncoding())
    options = subset.Options()
    options.layout_features = []
    options.hinting = False
    options.desubroutinize = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font.flavor = "woff2"
    output = Path("public/fonts") / f"{font_id}-subset.woff2"
    font.save(output)
    print(f"{output}: {output.stat().st_size:,} bytes")
