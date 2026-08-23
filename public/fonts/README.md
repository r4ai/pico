# Bundled fonts

`udev-gothic-subset.woff2` is a subset of [UDEV Gothic](https://github.com/yuru7/udev-gothic)
v2.2.0 Regular, cut down to Latin plus JIS X 0208 level 1 so that Japanese
comments render correctly without putting several megabytes into every exported
image. Regenerate it with `scripts/build-udev-subset.sh`.

UDEV Gothic is licensed under the SIL Open Font License 1.1; see
`UDEVGothic-LICENSE.txt`.

The Latin coding fonts are not vendored here — they come from the
`@fontsource/*` packages, and their licenses ship with them.
