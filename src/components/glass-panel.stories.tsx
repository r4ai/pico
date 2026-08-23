import { GlassPanel } from "@/components/glass-panel";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Chrome/GlassPanel",
  component: GlassPanel,
  parameters: { layout: "fullscreen" },
  decorators: [
    // Glass only reads as glass over something worth blurring.
    (Story) => (
      <div className="grid h-80 place-items-center bg-[radial-gradient(circle_at_25%_30%,#7c3aed,transparent_45%),radial-gradient(circle_at_75%_65%,#0ea5e9,transparent_45%)] bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GlassPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "px-6 py-4 text-sm",
    children: "Floating above the canvas",
  },
};

export const Dense: Story = {
  args: {
    className: "flex items-center gap-2 p-1.5 text-sm",
    children: (
      <>
        <span className="px-2">One</span>
        <span className="px-2">Two</span>
        <span className="px-2">Three</span>
      </>
    ),
  },
};
