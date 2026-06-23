import React from "react";

interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  /** If provided, rendered before the label with aria-hidden */
  icon?: React.ReactNode;
  onClick?: () => void;
}

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 18px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1,
  cursor: "pointer",
  transition: "opacity 0.15s",
  border: "none",
};

const variantStyles: Record<
  NonNullable<ButtonProps["variant"]>,
  React.CSSProperties
> = {
  primary: { background: "#0070f3", color: "#fff" },
  secondary: {
    background: "transparent",
    color: "#333",
    border: "1.5px solid #ccc",
  },
  danger: { background: "#e00", color: "#fff" },
};

export function Button({
  label,
  variant = "primary",
  disabled = false,
  icon,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...base,
        ...variantStyles[variant],
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </button>
  );
}
