# Bundled fonts

`udev-gothic-subset.woff2` is a subset of [UDEV Gothic](https://github.com/yuru7/udev-gothic)
v2.2.0 Regular, cut down to Latin plus JIS X 0208 level 1 so that Japanese
comments render correctly without putting several megabytes into every exported
image. Regenerate it with `scripts/build-udev-subset.sh`.

UDEV Gothic is licensed under the SIL Open Font License 1.1; see
`UDEVGothic-LICENSE.txt`.

The Latin coding fonts are not vendored here — they come from the
`@fontsource/*` packages, and their licenses ship with them.

## Additional Japanese coding fonts

HackGen, PlemolJP, and Firge use their original family names and complete Regular
faces. These files are WOFF2 compression of the pinned upstream TTFs, without
subsetting, renaming, removing hinting, changing layout features, or rewriting
metadata. Bold and italic are synthesized.

| Font                                          | Upstream release | Complete license notices                        |
| --------------------------------------------- | ---------------- | ----------------------------------------------- |
| [HackGen](https://github.com/yuru7/HackGen)   | v2.10.0          | [HackGen notices](./licenses/hackgen/LICENSE)   |
| [PlemolJP](https://github.com/yuru7/PlemolJP) | v3.1.0           | [PlemolJP notices](./licenses/plemoljp/LICENSE) |
| [Firge](https://github.com/yuru7/Firge)       | v0.3.0           | [Firge notices](./licenses/firge/LICENSE)       |

Each `licenses/<id>/` directory mirrors the upstream `LICENSE` and source-font
license files under `source/`, including nested component licenses. These files
ship in the production build alongside the fonts. Original copyright and license
metadata are retained exactly as supplied by upstream.

Rebuild with `uv run scripts/build-japanese-fonts.py` from the repository root.
The script pins upstream versions and FontTools, downloads matching notices,
and disables WOFF2 table transforms. It compares every decoded font table with
the original; only the container checksum and WOFF2 compression flag in `head`
are normalized for comparison. No font-specific metadata is added.
This follows the compression-only approach described in [OFL FAQ 2.2.1](https://openfontlicense.org/ofl-faq/).

Saved font IDs remain stable. Opening the picker does not download candidates;
selecting a font loads its face, and exports embed only the selected font.
Full faces increase the initial download and SVG size compared with the former
subsets. They preserve upstream character coverage, not every Unicode character;
characters absent upstream still use system fallback.
