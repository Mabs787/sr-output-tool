import React from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  navLabel?: string;
}

export function Breadcrumb({ items, navLabel = "Breadcrumbs" }: BreadcrumbProps) {
  return (
    <nav aria-label={navLabel}>
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          listStyle: "none",
          margin: 0,
          padding: 0,
          gap: "4px",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        {items.map((item, index) => (
          <li
            key={item.href}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            {index > 0 && (
              <span aria-hidden="true" style={{ color: "#999" }}>
                /
              </span>
            )}
            <a
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              style={{
                color: item.current ? "#111" : "#0070f3",
                textDecoration: item.current ? "none" : "underline",
                fontWeight: item.current ? 600 : 400,
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
