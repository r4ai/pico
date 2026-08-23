import { type LanguageId, LANGUAGES } from "@/features/editor/language";
import type { LanguageFn } from "highlight.js";

/**
 * Spellings that belong to CUDA and to nothing else Pico supports.
 *
 * These are checked before highlight.js rather than after. highlight.js has no
 * CUDA grammar, so a kernel gets scored by grammars that were never going to
 * fit it, and which one comes out on top is close to arbitrary — a short kernel
 * can land on LLVM IR. When one of these appears there is nothing left to guess.
 */
const CUDA_QUALIFIERS = /__global__|__device__|__shared__|__constant__|__syncthreads\b/;
const CUDA_BUILTINS = /\b(?:threadIdx|blockIdx|blockDim|gridDim|warpSize)\b/;
const CUDA_LAUNCH = /<<<[^<>]*>>>\s*\(/;

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
 * CUDA is settled first, from spellings no other supported language has.
 * highlight.js then does the coarse work, and the distinctions it cannot make
 * are settled after: it does not separate TSX from TypeScript or JSX from
 * JavaScript, because in both cases the second is the first plus syntax it
 * already accepts, and it reports plain C as C++ because C is very nearly a
 * subset of it.
 *
 * @returns `undefined` when nothing scores well enough to be worth acting on.
 * Guessing wrong is worse than leaving the language alone.
 */
export async function detectLanguage(code: string): Promise<LanguageId | undefined> {
  if (code.trim().length < MIN_LENGTH) return undefined;

  if (CUDA_QUALIFIERS.test(code) || CUDA_BUILTINS.test(code) || CUDA_LAUNCH.test(code)) {
    return "cuda";
  }

  const detect = await getEngine();
  const detected = detect(code) as HljsLang | undefined;
  if (!detected) return undefined;

  if (detected === "c" || detected === "cpp") return CPP_MARKERS.test(code) ? "cpp" : "c";
  if (detected === "typescript") return JSX_MARKERS.test(code) ? "tsx" : "ts";
  if (detected === "javascript") return JSX_MARKERS.test(code) ? "jsx" : "js";
  return UNAMBIGUOUS[detected];
}
