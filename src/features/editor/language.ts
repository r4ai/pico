export const LANGUAGE_IDS = ["tsx", "ts", "jsx", "js", "c", "cpp", "cuda", "rust", "llvm"] as const;

export type LanguageId = (typeof LANGUAGE_IDS)[number];

export type Language = {
  readonly id: LanguageId;
  /** Shown in the language picker. */
  readonly label: string;
  /** Grammar to highlight with. Not always equal to `id`. */
  readonly shikiLang: string;
  /**
   * Grammar highlight.js auto-detection may report for this language. Several
   * ids share one — the detector disambiguates them afterwards.
   */
  readonly hljsLang: string;
  /** Used for the downloaded file name. */
  readonly extension: string;
};

export const LANGUAGES = {
  tsx: { id: "tsx", label: "TSX", shikiLang: "tsx", hljsLang: "typescript", extension: "tsx" },
  ts: {
    id: "ts",
    label: "TypeScript",
    shikiLang: "typescript",
    hljsLang: "typescript",
    extension: "ts",
  },
  jsx: { id: "jsx", label: "JSX", shikiLang: "jsx", hljsLang: "javascript", extension: "jsx" },
  js: {
    id: "js",
    label: "JavaScript",
    shikiLang: "javascript",
    hljsLang: "javascript",
    extension: "js",
  },
  c: { id: "c", label: "C", shikiLang: "c", hljsLang: "c", extension: "c" },
  cpp: { id: "cpp", label: "C++", shikiLang: "cpp", hljsLang: "cpp", extension: "cpp" },
  cuda: { id: "cuda", label: "CUDA", shikiLang: "cuda", hljsLang: "cpp", extension: "cu" },
  rust: { id: "rust", label: "Rust", shikiLang: "rust", hljsLang: "rust", extension: "rs" },
  llvm: { id: "llvm", label: "LLVM IR", shikiLang: "llvm", hljsLang: "llvm", extension: "ll" },
} as const satisfies Record<LanguageId, Language>;

export const DEFAULT_LANGUAGE: LanguageId = "tsx";

export function isLanguageId(value: string): value is LanguageId {
  return Object.hasOwn(LANGUAGES, value);
}
