import { SettingsSidebar } from "@/features/settings/settings-sidebar";
import { DEFAULT_SETTINGS, type Settings } from "@/features/settings/settings";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = {
  title: "Settings/SettingsSidebar",
  component: SettingsSidebar,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SettingsSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { open: true, settings: DEFAULT_SETTINGS, onClose: () => {}, onChange: () => {} },
  render: (args) => {
    const [settings, setSettings] = useState<Settings>(args.settings);
    return (
      <div className="h-screen bg-background">
        <SettingsSidebar
          {...args}
          onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))}
          settings={settings}
        />
      </div>
    );
  },
};

export const Closed: Story = {
  args: { ...Open.args, open: false },
  render: (args) => (
    <div className="h-screen bg-background">
      <SettingsSidebar {...args} />
      <p className="p-6 text-muted-foreground text-sm">
        Closed, and inert: nothing inside can be tabbed to.
      </p>
    </div>
  ),
};
