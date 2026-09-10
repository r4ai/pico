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

The picker names these modified Regular subsets separately from their upstream
fonts, as required by the Reserved Font Name clauses. The note beside each
name credits the upstream font, and searching its original name still works.

| Picker and CSS family | Derived from                                  | Upstream release | Complete license notices                        |
| --------------------- | --------------------------------------------- | ---------------- | ----------------------------------------------- |
| Pico Maru JP          | [HackGen](https://github.com/yuru7/HackGen)   | v2.10.0          | [HackGen notices](./licenses/hackgen/LICENSE)   |
| Pico Sans JP          | [PlemolJP](https://github.com/yuru7/PlemolJP) | v3.1.0           | [PlemolJP notices](./licenses/plemoljp/LICENSE) |
| Pico Mono JP          | [Firge](https://github.com/yuru7/Firge)       | v0.3.0           | [Firge notices](./licenses/firge/LICENSE)       |

Each `licenses/<id>/` directory mirrors the upstream `LICENSE` and its source
font license files under `source/`, including nested component licenses.
These public files also ship in the production build. Copyright metadata is
preserved in the WOFF2 files; the license description additionally contains the
bundled notices so they accompany fonts embedded in exported SVGs.

Rebuild with `uv run scripts/build-japanese-subsets.py` from the repository root.
The script pins upstream versions and FontTools, downloads the matching notices,
and uses the same family names in the binaries, picker, and CSS. Existing font
IDs and URLs remain stable for saved links.

Like UDEV Gothic, these subsets include Latin, JIS X 0208 rows 1–47 (symbols,
kana and level 1 kanji), punctuation and full-width forms. Characters outside
the subset use system fallback and are not embedded by Pico during export.
Only Regular is bundled; the browser synthesizes bold and italic.
Opening the picker does not download the candidates. Selecting a font loads its
face; exports embed only that selected font.
