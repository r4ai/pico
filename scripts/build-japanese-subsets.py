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
    ("hackgen", "Pico Maru JP", "HackGen", "v2.10.0", (
        "LICENSE_GenJyuuGothic", "LICENSE_Hack", "LICENSE_NerdFonts",
    )),
    ("plemoljp", "Pico Sans JP", "PlemolJP", "v3.1.0", (
        "LICENSE_IBM-Plex", "LICENSE_NerdFonts", "IBM-Plex-Mono/license.txt",
        "IBM-Plex-Sans-JP/unhinted/license.txt", "hack/LICENSE", "nerd-fonts/LICENSE",
    )),
    ("firge", "Pico Mono JP", "Firge", "v0.3.0", (
        "LICENSE_FiraMono", "LICENSE_GenJyuuGothic_GenShinGothic",
    )),
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

for font_id, family, repo, version, notices in SOURCES:
    url = f"https://github.com/yuru7/{repo}/releases/download/{version}/{repo}_{version}.zip"
    member = f"{repo}-Regular.ttf"
    # Mirror upstream paths so the LICENSE's source/ references can be followed.
    license_texts = []
    for notice in ("LICENSE", *(f"source/{name}" for name in notices)):
        source_url = f"https://raw.githubusercontent.com/yuru7/{repo}/{version}/{notice}"
        with urlopen(source_url, timeout=60) as response:
            license_data = response.read()
        destination = Path("public/fonts/licenses") / font_id / notice
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(license_data)
        license_texts.append(license_data.decode("utf-8-sig"))
    with urlopen(url, timeout=60) as response:
        data = response.read()
    with ZipFile(BytesIO(data)) as archive:
        matches = [name for name in archive.namelist() if Path(name).name == member]
        assert len(matches) == 1, f"Expected exactly one {member}: {matches}"
        font = TTFont(BytesIO(archive.read(matches[0])), recalcTimestamp=False)

    # Modified fonts get distinct internal names, respecting OFL reserved names.
    for record in font["name"].names:
        if record.nameID in (1, 3, 4, 6, 16):
            name = family.replace(" ", "") if record.nameID == 6 else family
            record.string = name.encode(record.getEncoding())
    # Keep notices with the font even when it is embedded into an exported SVG.
    font["name"].setName("\n\n".join(license_texts), 13, 3, 1, 0x409)
    font["name"].setName("https://openfontlicense.org", 14, 3, 1, 0x409)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
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
