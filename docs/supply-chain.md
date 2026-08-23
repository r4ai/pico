# Supply-chain security

The repository uses pnpm's native controls to reduce dependency supply-chain
risk:

- dependency versions must be at least 24 hours old, including transitive
  dependencies;
- direct dependencies and tool versions are pinned exactly;
- packages without registry publication timestamps are rejected;
- releases whose publisher trust evidence regresses are rejected;
- transitive dependencies cannot use arbitrary Git or tarball sources;
- only the packages explicitly listed in `allowBuilds` may run install scripts;
- CI installs the committed lockfile without resolving new versions;
- GitHub Actions are pinned to full commit SHAs and checked by pinact;
- pull requests receive dependency review, and CI rejects moderate-or-higher
  known vulnerabilities.

`trustPolicyExclude` contains narrowly versioned exceptions for legacy
transitive releases that predate consistent publisher trust evidence. Do not
broaden an exception to a package name or version range.

## Updating dependencies

Run updates only with the pnpm version pinned in `mise.toml`:

```sh
mise exec -- pnpm update --latest
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm run check
mise exec -- pnpm run test
mise exec -- pnpm run build
mise exec -- pnpm run build-storybook
mise exec -- pnpm run security:audit
```

pnpm selects the newest versions that satisfy `minimumReleaseAge`. Review every
manifest and lockfile change before committing it. If an update introduces an
install script, pnpm fails until that exact package is deliberately approved or
denied in `allowBuilds`.

Update workflow action pins with:

```sh
mise exec -- pinact run
mise exec -- pinact run --check
```
