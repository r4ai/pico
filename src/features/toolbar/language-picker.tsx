import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isLanguageId, LANGUAGE_IDS, LANGUAGES, type LanguageId } from "@/features/editor/language";
import { ChevronDownIcon } from "lucide-react";

export type LanguagePickerProps = {
  value: LanguageId;
  onChange: (value: LanguageId) => void;
};

/**
 * The language lives in the dock rather than the sidebar: it describes the
 * code itself, not how the picture looks, and people reach for it often.
 */
export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-1.5 px-2.5" size="sm" variant="ghost">
          {LANGUAGES[value].label}
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40" side="top">
        <DropdownMenuRadioGroup
          onValueChange={(next) => {
            if (isLanguageId(next)) onChange(next);
          }}
          value={value}
        >
          {LANGUAGE_IDS.map((id) => (
            <DropdownMenuRadioItem key={id} value={id}>
              {LANGUAGES[id].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
