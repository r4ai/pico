import type { LanguageId } from "@/features/editor/language";
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
 * Languages whose highlight.js grammars are broad enough to steal unrelated
 * snippets. Each marker is distinctive, so these can be settled before the
 * statistical detector without adding them to its candidate set.
 */
const SIGNATURE_LANGUAGES = [
  {
    id: "java",
    markers: /\bpackage\s+[\w.]+\s*;|\bimport\s+java\.|\bpublic\s+(?:final\s+)?class\s+\w+/,
  },
  { id: "dart", markers: /\bimport\s+['"]dart:|\b(?:Future|Stream)<[^>]+>/ },
  { id: "scala", markers: /\bcase\s+class\b|\bobject\s+[A-Z]\w*\s*\{|\bdef\s+\w+\([^)]*\)\s*:/ },
  { id: "powershell", markers: /\[Parameter\b|\b(?:Get|Set|New|Remove)-[A-Z]\w+|\$_\./ },
  { id: "r", markers: /(?:^|\s)<-\s|\b(?:library|mutate|summarise)\s*\(|%>%/m },
  { id: "elixir", markers: /\bdefmodule\s+[A-Z]|\bdefp?\s+\w+.*\bdo\b|\|>\s*[A-Z]\w*\./ },
] as const satisfies readonly { id: LanguageId; markers: RegExp }[];

/**
 * Spellings that exist in C++ but not C.
 *
 * highlight.js reports plain C as C++ because C is very nearly a subset of it,
 * so the two are told apart here instead.
 */
const CPP_MARKERS =
  /\b(?:class|template|typename|namespace|nullptr|constexpr|std|public|private|protected|throw|virtual)\b|::/;

/** JSX structure that cannot be mistaken for a generic type such as `List<String>`. */
const JSX_MARKERS = /<\/[A-Za-z][\w.]*\s*>|<[A-Za-z][\w.]*(?:\s+[\w:.-]+\s*=|\s*\/>)|<>/;

/** Markup names that indicate HTML rather than generic XML. */
const HTML_MARKERS =
  /<!doctype\s+html\b|<\/?(?:html|head|body|title|meta|link|script|style|main|section|article|nav|header|footer|div|span|p|a|button|form|input|label|ul|ol|li|table|tr|td|th|img|video|audio|canvas)\b/i;

/** XML declarations and namespaces are unambiguous even when tags resemble HTML. */
const XML_MARKERS = /<\?xml\b|\bxmlns(?::[\w.-]+)?\s*=/i;

/** Below this, highlight.js is mostly guessing from a handful of tokens. */
const MIN_RELEVANCE = 6;

/** Too short to carry evidence either way. */
const MIN_LENGTH = 12;

/** Static so the bundler can split each grammar out; typed so none can be forgotten. */
const GRAMMARS = {
  typescript: () => import("highlight.js/lib/languages/typescript"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  rust: () => import("highlight.js/lib/languages/rust"),
  llvm: () => import("highlight.js/lib/languages/llvm"),
  python: () => import("highlight.js/lib/languages/python"),
  go: () => import("highlight.js/lib/languages/go"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  swift: () => import("highlight.js/lib/languages/swift"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  php: () => import("highlight.js/lib/languages/php"),
  bash: () => import("highlight.js/lib/languages/bash"),
  sql: () => import("highlight.js/lib/languages/sql"),
  json: () => import("highlight.js/lib/languages/json"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  xml: () => import("highlight.js/lib/languages/xml"),
  css: () => import("highlight.js/lib/languages/css"),
  lua: () => import("highlight.js/lib/languages/lua"),
} as const satisfies Record<string, () => Promise<{ default: LanguageFn }>>;

type HljsLang = keyof typeof GRAMMARS;

const SUBSET = Object.keys(GRAMMARS) as HljsLang[];

/**
 * highlight.js grammars that name exactly one of Pico's languages.
 *
 * The rest each cover more than one and are settled by their own rules below:
 * `typescript` and `javascript` by whether there is JSX, `c` and `cpp` by
 * which dialect the code is actually written in.
 */
const DIRECT_LANGUAGES: Partial<Record<HljsLang, LanguageId>> = {
  rust: "rust",
  llvm: "llvm",
  python: "python",
  go: "go",
  csharp: "csharp",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  php: "php",
  bash: "shellscript",
  sql: "sql",
  json: "json",
  yaml: "yaml",
  css: "css",
  lua: "lua",
};

function detectSignatureLanguage(code: string): LanguageId | undefined {
  if (CUDA_QUALIFIERS.test(code) || CUDA_BUILTINS.test(code) || CUDA_LAUNCH.test(code)) {
    return "cuda";
  }
  return SIGNATURE_LANGUAGES.find((language) => language.markers.test(code))?.id;
}

function resolveMarkupLanguage(code: string): LanguageId {
  if (XML_MARKERS.test(code)) return "xml";
  return HTML_MARKERS.test(code) ? "html" : "xml";
}

const SHARED_LANGUAGE_RESOLVERS: Partial<Record<HljsLang, (code: string) => LanguageId>> = {
  c: (code) => (CPP_MARKERS.test(code) ? "cpp" : "c"),
  cpp: (code) => (CPP_MARKERS.test(code) ? "cpp" : "c"),
  typescript: (code) => (JSX_MARKERS.test(code) ? "tsx" : "ts"),
  javascript: (code) => (JSX_MARKERS.test(code) ? "jsx" : "js"),
  xml: resolveMarkupLanguage,
};

function resolveDetectedLanguage(detected: HljsLang, code: string): LanguageId | undefined {
  return SHARED_LANGUAGE_RESOLVERS[detected]?.(code) ?? DIRECT_LANGUAGES[detected];
}

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
 * CUDA and languages with distinctive signatures are settled first. Keeping
 * their broad highlight.js grammars out of auto-detection prevents them from
 * stealing unrelated snippets. highlight.js then does the coarse work, and
 * the distinctions it cannot make are settled after: TSX/TypeScript,
 * JSX/JavaScript, C/C++, and HTML/XML.
 *
 * @returns `undefined` when nothing scores well enough to be worth acting on.
 * Guessing wrong is worse than leaving the language alone.
 */
export async function detectLanguage(code: string): Promise<LanguageId | undefined> {
  if (code.trim().length < MIN_LENGTH) return undefined;

  const signatureLanguage = detectSignatureLanguage(code);
  if (signatureLanguage) return signatureLanguage;

  const detect = await getEngine();
  const detected = detect(code) as HljsLang | undefined;
  if (!detected) return undefined;

  return resolveDetectedLanguage(detected, code);
}
