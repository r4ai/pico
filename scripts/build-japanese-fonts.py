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

from fontTools.ttLib.woff2 import compress
from fontTools.ttLib import TTFont

# Version-pinned upstream releases, also documented in public/fonts/README.md.
SOURCES = (
    ("hackgen", "HackGen", "v2.10.0", (
        "LICENSE_GenJyuuGothic", "LICENSE_Hack", "LICENSE_NerdFonts",
    )),
    ("plemoljp", "PlemolJP", "v3.1.0", (
        "LICENSE_IBM-Plex", "LICENSE_NerdFonts", "IBM-Plex-Mono/license.txt",
        "IBM-Plex-Sans-JP/unhinted/license.txt", "hack/LICENSE", "nerd-fonts/LICENSE",
    )),
    ("firge", "Firge", "v0.3.0", (
        "LICENSE_FiraMono", "LICENSE_GenJyuuGothic_GenShinGothic",
    )),
)

for font_id, repo, version, notices in SOURCES:
    url = f"https://github.com/yuru7/{repo}/releases/download/{version}/{repo}_{version}.zip"
    member = f"{repo}-Regular.ttf"
    # Mirror upstream paths so the LICENSE's source/ references can be followed.
    for notice in ("LICENSE", *(f"source/{name}" for name in notices)):
        source_url = f"https://raw.githubusercontent.com/yuru7/{repo}/{version}/{notice}"
        with urlopen(source_url, timeout=60) as response:
            license_data = response.read()
        destination = Path("public/fonts/licenses") / font_id / notice
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(license_data)
    with urlopen(url, timeout=60) as response:
        data = response.read()
    with ZipFile(BytesIO(data)) as archive:
        matches = [name for name in archive.namelist() if Path(name).name == member]
        assert len(matches) == 1, f"Expected exactly one {member}: {matches}"
        original = archive.read(matches[0])

    output = Path("public/fonts") / f"{font_id}.woff2"
    # Compression only: retain all glyphs, hinting, layout tables and metadata.
    compress(BytesIO(original), output, transform_tables=set())
    source = TTFont(BytesIO(original), lazy=True)
    restored = TTFont(output, lazy=True)
    assert set(source.reader.keys()) == set(restored.reader.keys())
    for tag in source.reader.keys():
        before = bytearray(source.reader[tag])
        after = bytearray(restored.reader[tag])
        if tag == "head":
            # Container checksums and WOFF2's lossless-compression flag may differ.
            before[8:12] = after[8:12]
            before[16] |= 0x08
            after[16] |= 0x08
        assert before == after, f"{repo}: changed table {tag}"
    print(f"{output}: {output.stat().st_size:,} bytes; all font tables preserved", flush=True)
