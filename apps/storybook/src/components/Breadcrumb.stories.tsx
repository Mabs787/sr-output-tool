import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  title: "Components/Breadcrumb",
  component: Breadcrumb,
};

export default meta;

type Story = StoryObj<typeof Breadcrumb>;

export const TwoLevels: Story = {
  name: "Two levels",
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Docs", href: "/docs", current: true },
    ],
  },
};

export const ThreeLevels: Story = {
  name: "Three levels",
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Accessibility tools", href: "/products/a11y", current: true },
    ],
  },
};

export const AriaCurrentFalse: Story = {
  name: "aria-current=false is ignored",
  render: () => (
    <nav aria-label="Breadcrumbs">
      <ol
        style={{
          display: "flex",
          listStyle: "none",
          margin: 0,
          padding: 0,
          gap: "8px",
          fontSize: "14px",
        }}
      >
        <li>
          {/* aria-current="false" should NOT be announced as a current indicator */}
          <a href="/" aria-current="false" style={{ color: "#0070f3" }}>
            Home
          </a>
        </li>
        <li style={{ color: "#999" }}>
          <span aria-hidden="true">/</span>
          <a
            href="/current"
            aria-current="page"
            style={{ color: "#111", fontWeight: 600, marginLeft: "8px" }}
          >
            Current page
          </a>
        </li>
      </ol>
    </nav>
  ),
};
