import type { Meta, StoryObj } from "@storybook/react";
import { ContactForm, ContactFormWithError } from "./ContactForm";

const meta: Meta<typeof ContactForm> = {
  title: "Components/Contact Form",
  component: ContactForm,
};

export default meta;

type Story = StoryObj<typeof ContactForm>;

export const Default: Story = {};

export const WithValidationError: Story = {
  name: "With validation error",
  render: () => <ContactFormWithError />,
};
