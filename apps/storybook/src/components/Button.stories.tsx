import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const DownloadIcon = () => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 11.5 3.5 7H6V2h4v5h2.5L8 11.5Z" />
    <rect x="2" y="13" width="12" height="1.5" rx="0.75" />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { label: "Save changes" },
};

export const Secondary: Story = {
  args: { label: "Cancel", variant: "secondary" },
};

export const Danger: Story = {
  args: { label: "Delete account", variant: "danger" },
};

export const Disabled: Story = {
  args: { label: "Submit", disabled: true },
};

export const DisabledSecondary: Story = {
  name: "Disabled (secondary)",
  args: { label: "Cancel", variant: "secondary", disabled: true },
};

export const WithIcon: Story = {
  render: () => <Button label="Download" icon={<DownloadIcon />} />,
};

export const ButtonGroup: Story = {
  name: "Button group",
  render: () => (
    <div role="group" aria-label="Slide controls" style={{ display: "flex", gap: "8px" }}>
      <Button label="Previous slide" variant="secondary" />
      <Button label="Next slide" variant="secondary" />
    </div>
  ),
};
