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

The font picker also offers Regular subsets of these yuru7 fonts:

| Font                                          | Upstream release | License                           |
| --------------------------------------------- | ---------------- | --------------------------------- |
| [HackGen](https://github.com/yuru7/HackGen)   | v2.10.0          | [OFL 1.1](./HackGen-LICENSE.txt)  |
| [PlemolJP](https://github.com/yuru7/PlemolJP) | v3.1.0           | [OFL 1.1](./PlemolJP-LICENSE.txt) |
| [Firge](https://github.com/yuru7/Firge)       | v0.3.0           | [OFL 1.1](./Firge-LICENSE.txt)    |

Rebuild with `uv run scripts/build-japanese-subsets.py` from the repository root.
The script pins upstream versions and FontTools. Internal font names use
`Pico <name> Subset` to distinguish these modifications from the originals;
the picker uses the upstream names for recognition.

Like UDEV Gothic, these subsets include Latin, JIS X 0208 rows 1–47 (symbols,
kana and level 1 kanji), punctuation and full-width forms. Characters outside
the subset use system fallback and are not embedded by Pico during export.
Only Regular is bundled; the browser synthesizes bold and italic.
Opening the picker does not download the candidates. Selecting a font loads its
face; exports embed only that selected font.
