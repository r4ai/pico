import type { ReactNode } from "react";

export type SearchableOption<T extends string> = {
  readonly value: T;
  /** Matched against what the reader types, and shown once chosen. */
  readonly label: string;
  /** How the option is drawn in the list. */
  readonly render: ReactNode;
  /** Extra terms that filter to this option without changing its label. */
  readonly searchTerms?: readonly string[];
};

export function searchTextOf<T extends string>(option: SearchableOption<T>): string {
  return [option.label, ...(option.searchTerms ?? [])].join(" ");
}
