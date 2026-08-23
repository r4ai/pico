import { cudaGrammars } from "@/features/editor/cuda-grammar";
import type { LanguageRegistration } from "shiki/core";

type LanguageDefinition = {
  /** Shown in the language picker. */
  readonly label: string;
  /** Grammar name passed to Shiki. Not always equal to the Pico id. */
  readonly shikiLang: string;
  /** Loads every registration the grammar depends on. */
  readonly load: () => Promise<LanguageRegistration[]>;
};

/**
 * Pico's supported languages and their lazy Shiki loaders.
 *
 * Keeping the loader beside the user-facing metadata makes this the only
 * registry that changes when a language is added. Static import paths let the
 * bundler keep every grammar in its own chunk.
 */
export const LANGUAGES = {
  tsx: {
    label: "TSX",
    shikiLang: "tsx",
    load: async () => (await import("@shikijs/langs/tsx")).default,
  },
  ts: {
    label: "TypeScript",
    shikiLang: "typescript",
    load: async () => (await import("@shikijs/langs/typescript")).default,
  },
  jsx: {
    label: "JSX",
    shikiLang: "jsx",
    load: async () => (await import("@shikijs/langs/jsx")).default,
  },
  js: {
    label: "JavaScript",
    shikiLang: "javascript",
    load: async () => (await import("@shikijs/langs/javascript")).default,
  },
  c: {
    label: "C",
    shikiLang: "c",
    load: async () => (await import("@shikijs/langs/c")).default,
  },
  cpp: {
    label: "C++",
    shikiLang: "cpp",
    load: async () => (await import("@shikijs/langs/cpp")).default,
  },
  cuda: {
    label: "CUDA",
    shikiLang: "cuda",
    load: async () => [...(await import("@shikijs/langs/cpp")).default, ...cudaGrammars],
  },
  rust: {
    label: "Rust",
    shikiLang: "rust",
    load: async () => (await import("@shikijs/langs/rust")).default,
  },
  llvm: {
    label: "LLVM IR",
    shikiLang: "llvm",
    load: async () => (await import("@shikijs/langs/llvm")).default,
  },
} as const satisfies Record<string, LanguageDefinition>;

export type LanguageId = keyof typeof LANGUAGES;

export const LANGUAGE_IDS = Object.keys(LANGUAGES) as LanguageId[];

export const DEFAULT_LANGUAGE: LanguageId = "tsx";

export function isLanguageId(value: string): value is LanguageId {
  return Object.hasOwn(LANGUAGES, value);
}
