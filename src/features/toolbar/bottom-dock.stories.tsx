import type { LanguageId } from "@/features/editor/language";
import type { ExportScale } from "@/features/export/export-image";
import { BottomDock } from "@/features/toolbar/bottom-dock";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Toolbar/BottomDock",
  component: BottomDock,
} satisfies Meta<typeof BottomDock>;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};

export const Default: Story = {
  args: {
    lang: "tsx",
    scale: 2,
    busy: false,
    onLangChange: noop,
    onScaleChange: noop,
    onCopy: noop,
    onSave: noop,
    onCopyLink: noop,
  },
  render: (args) => {
    const [lang, setLang] = useState<LanguageId>(args.lang);
    const [scale, setScale] = useState<ExportScale>(args.scale);
    return (
      <BottomDock
        {...args}
        lang={lang}
        onLangChange={setLang}
        onScaleChange={setScale}
        scale={scale}
      />
    );
  },
};

export const Exporting: Story = {
  args: { ...Default.args, busy: true },
};
