# React Doctor false positives

Findings this repository has investigated and rejected, with the evidence. A
suppression belongs here before it belongs in the code; anything not listed here
is a finding to fix, not to silence.

## react-doctor/js-tosorted-immutable — `scripts/security-monitor.ts`

The rule reads `[...entries].sort()` as a copy made only to sort, and asks for
`toSorted()`. `entries` is a `Set`: the spread is how it becomes an array at
all, there is no array to copy, and `Set` has no `toSorted`. Suppressed at the
line with the reason beside it.

## react-doctor/async-await-in-loop — `scripts/security-monitor.ts` (fixed, not suppressed)

The rule asked for `Promise.all` over the loop that writes issues. It was wrong
twice over: the injected writer shells out to `gh api` through `execFileSync`,
so there was never any concurrency to gain, and GitHub asks that writes for one
account be made serially rather than concurrently. Rather than suppress it, the
pretend-asynchronous interface was removed — `syncIssues` and its writer are
synchronous, which is what they always were.

## react-doctor/context-provider-value-from-unmemoized-local-literal — `src/components/ui/toggle-group.tsx`

The rule wants a `useMemo` around a context value built in render. The React
Compiler already builds it once per set of values, and React Doctor stops
asking as soon as it detects the compiler — which it cannot do here, because it
does not recognize `react({ compiler: true })` from `@vitejs/plugin-react` 6.
See the React Compiler section of `docs/development.md` for the manual check
that stands in for the detection.

## react-hooks-js/static-components — `src/features/editor/components/code-surface.tsx`

The React Compiler's lint pass reads `<Editor {...props} />`, where `Editor`
came from `useCodeEditor()`, as a component created during render. It is not:
the editor is one module-level `import()` resolved once per page and held in
state, so the component identity is stable and nothing remounts. The compiler
itself agrees — `oxc-transform-react` compiles this file with a memo cache and
no errors.

`lazy()` with a `<Suspense>` fallback is the shape the rule has in mind, and it
is the wrong shape here. React throttles the reveal of resolved Suspense
content for up to 300ms after a fallback commits, which would delay the editor
on exactly the warm-cache visit where it currently arrives immediately, and the
stand-in is not a spinner: it is the same static rendering the export is made
of, which the editor has to replace without moving a pixel. See the chunk and
geometry invariants in `docs/development.md`.
