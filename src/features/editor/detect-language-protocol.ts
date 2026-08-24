import type { LanguageId } from "@/features/editor/language";

/** A document to guess the language of, and the number the answer comes back under. */
export type DetectRequest = {
  readonly id: number;
  readonly code: string;
};

/**
 * What the worker sends back.
 *
 * `lang` is absent when nothing scored well enough to be worth acting on,
 * which is a normal answer rather than a failure; `error` is a failure.
 */
export type DetectResponse =
  | { readonly id: number; readonly lang: LanguageId | undefined }
  | { readonly id: number; readonly error: string };

/**
 * Types only, and nothing else in this file.
 *
 * Both sides of a worker boundary import it, and anything with a runtime value
 * here would be code the page and the worker each ship a copy of.
 */
