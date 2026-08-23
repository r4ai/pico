import type { ExportScale } from "@/features/export/export-image";
import { SaveSplitButton } from "@/features/toolbar/save-split-button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Toolbar/SaveSplitButton",
  component: SaveSplitButton,
} satisfies Meta<typeof SaveSplitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { scale: 2, busy: false, pending: false, onSave: () => {}, onScaleChange: () => {} },
  render: (args) => {
    const [scale, setScale] = useState<ExportScale>(args.scale);
    return <SaveSplitButton {...args} onScaleChange={setScale} scale={scale} />;
  },
};

export const Saving: Story = {
  args: { scale: 2, busy: true, pending: true, onSave: () => {}, onScaleChange: () => {} },
};
