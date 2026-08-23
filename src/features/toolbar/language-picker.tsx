import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
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
    <DropdownMenuTrigger>
      <Button size="sm" variant="ghost">
        {LANGUAGES[value].label}
        <ChevronDownIcon className="opacity-60" data-icon="inline-end" />
      </Button>
      <DropdownMenu className="w-auto min-w-40" placement="top start">
        <DropdownMenuGroup
          onSelectionChange={(keys) => {
            const next = keys === "all" ? undefined : keys.values().next().value;
            if (typeof next === "string" && isLanguageId(next)) onChange(next);
          }}
          selectedKeys={[value]}
          selectionMode="single"
        >
          {LANGUAGE_IDS.map((id) => (
            <DropdownMenuItem id={id} key={id}>
              {LANGUAGES[id].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
