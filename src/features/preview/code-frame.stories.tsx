import { CodeFrame } from "@/features/preview/code-frame";
import { PADDING_IDS, RADIUS_IDS, SHADOW_IDS } from "@/features/settings/appearance";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import type { Meta, StoryObj } from "@storybook/react-vite";

const COLORS = { background: "#121212", foreground: "#dbd7ca", lineNumber: "#dedcd550" };

const SAMPLE = (
  <div className="pico-code">
    <div className="pico-lines">
      <div className="pico-line">
        <span style={{ color: "#4d9375" }}>export const</span>
        <span style={{ color: "#dbd7ca" }}> greet = () =&gt; </span>
        <span style={{ color: "#c98a7d" }}>"hi"</span>
      </div>
      <div className="pico-line">
        <span style={{ color: "#758575" }}>// what the frame wraps</span>
      </div>
    </div>
  </div>
);

const meta = {
  title: "Preview/CodeFrame",
  component: CodeFrame,
  args: { settings: DEFAULT_SETTINGS, colors: COLORS, children: SAMPLE },
} satisfies Meta<typeof CodeFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Padding: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-start gap-6">
      {PADDING_IDS.map((padding) => (
        <CodeFrame {...args} key={padding} settings={{ ...args.settings, padding }} />
      ))}
    </div>
  ),
};

export const Corners: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-start gap-6">
      {RADIUS_IDS.map((radius) => (
        <CodeFrame {...args} key={radius} settings={{ ...args.settings, radius }} />
      ))}
    </div>
  ),
};

export const Shadow: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-start gap-10 p-10">
      {SHADOW_IDS.map((shadow) => (
        <CodeFrame {...args} key={shadow} settings={{ ...args.settings, shadow }} />
      ))}
    </div>
  ),
};
