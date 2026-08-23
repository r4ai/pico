import { type LanguageId, LANGUAGES } from "@/features/editor/language";
import type { LanguageFn } from "highlight.js";

/** CUDA is C++ plus these, and highlight.js has no grammar that knows them. */
const CUDA_MARKERS =
  /__global__|__device__|__shared__|__constant__|<<<[^<>]*>>>|threadIdx|blockIdx/;

/**
 * Spellings that exist in C++ but not C.
 *
 * highlight.js reports plain C as C++ because C is very nearly a subset of it,
 * so the two are told apart here instead.
 */
const CPP_MARKERS =
  /\b(?:class|template|typename|namespace|nullptr|constexpr|std|public|private|protected|throw|virtual)\b|::/;

/** An opening JSX element, which is what separates TSX from TS and JSX from JS. */
const JSX_MARKERS = /<[A-Za-z][\w.]*(\s[^<>]*)?\/?>|<>/;

/** Below this, highlight.js is mostly guessing from a handful of tokens. */
const MIN_RELEVANCE = 6;

/** Too short to carry evidence either way. */
const MIN_LENGTH = 12;

/** Derived from the registry's literals, not from `Language`, so it stays a union. */
type HljsLang = (typeof LANGUAGES)[LanguageId]["hljsLang"];

/** Static so the bundler can split each grammar out; typed so none can be forgotten. */
const GRAMMARS: Record<HljsLang, () => Promise<{ default: LanguageFn }>> = {
  typescript: () => import("highlight.js/lib/languages/typescript"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  rust: () => import("highlight.js/lib/languages/rust"),
  llvm: () => import("highlight.js/lib/languages/llvm"),
};

const SUBSET = [...new Set(Object.values(LANGUAGES).map((language) => language.hljsLang))];

/**
 * highlight.js grammars that name exactly one of Pico's languages.
 *
 * The rest each cover more than one and are settled by their own rules below:
 * `typescript` and `javascript` by whether there is JSX, `c` and `cpp` by
 * which dialect the code is actually written in.
 */
const UNAMBIGUOUS: Partial<Record<HljsLang, LanguageId>> = {
  rust: "rust",
  llvm: "llvm",
};

let engine: Promise<(code: string) => string | undefined> | undefined;

/** Loads highlight.js with only Pico's grammars, and only on first use. */
function getEngine() {
  engine ??= (async () => {
    const { default: hljs } = await import("highlight.js/lib/core");
    await Promise.all(
      SUBSET.map(async (name) => {
        hljs.registerLanguage(name, (await GRAMMARS[name]()).default);
      }),
    );

    return (code: string) => {
      const result = hljs.highlightAuto(code, SUBSET);
      return result.relevance >= MIN_RELEVANCE ? result.language : undefined;
    };
  })();
  return engine;
}

/**
 * Guesses which of Pico's languages a snippet is.
 *
 * highlight.js does the coarse work; two distinctions it cannot make are
 * settled afterwards. It has no CUDA grammar, and it does not separate TSX
 * from TypeScript or JSX from JavaScript, because in both cases the second is
 * the first plus syntax it already accepts.
 *
 * @returns `undefined` when nothing scores well enough to be worth acting on.
 * Guessing wrong is worse than leaving the language alone.
 */
export async function detectLanguage(code: string): Promise<LanguageId | undefined> {
  if (code.trim().length < MIN_LENGTH) return undefined;

  const detect = await getEngine();
  const detected = detect(code) as HljsLang | undefined;
  if (!detected) return undefined;

  if (detected === "c" || detected === "cpp") {
    if (CUDA_MARKERS.test(code)) return "cuda";
    return CPP_MARKERS.test(code) ? "cpp" : "c";
  }
  if (detected === "typescript") return JSX_MARKERS.test(code) ? "tsx" : "ts";
  if (detected === "javascript") return JSX_MARKERS.test(code) ? "jsx" : "js";
  return UNAMBIGUOUS[detected];
}
