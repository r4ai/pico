import { SearchableSelect } from "@/components/searchable-select";
import type { LanguageId } from "@/features/editor/language";
import { LANGUAGES } from "@/features/editor/language-registry";

/* Ordered by the registry rather than by LANGUAGE_IDS: both are alphabetical by
   label, but only one of them is the list this picker is drawing from. */
const LANGUAGE_OPTIONS = (Object.keys(LANGUAGES) as LanguageId[]).map((id) => ({
  value: id,
  label: LANGUAGES[id].label,
  render: LANGUAGES[id].label,
  searchTerms: [id, ...LANGUAGES[id].aliases],
}));

export type LanguagePickerProps = {
  value: LanguageId;
  onChange: (value: LanguageId) => void;
};

/**
 * The language lives in the dock rather than the sidebar: it describes the
 * code itself, not how the picture looks, and people reach for it often.
 *
 * The same picker the sidebar uses, borderless so it sits among the dock's
 * ghost buttons instead of reading as a form field dropped onto the glass.
 */
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <SearchableSelect
      ariaLabel="Language"
      className="h-7 min-w-0 shrink border-transparent dark:bg-transparent"
      onChange={onChange}
      options={LANGUAGE_OPTIONS}
      placeholder="Search languages"
      placement="top start"
      value={value}
      width="content"
    />
  );
}
