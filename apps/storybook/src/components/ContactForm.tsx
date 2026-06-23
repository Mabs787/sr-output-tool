import React from "react";

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const label: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#111",
};

const input: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "5px",
  border: "1.5px solid #ccc",
  fontSize: "14px",
  width: "100%",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#c00",
};

export function ContactForm() {
  return (
    <form
      aria-label="Contact us"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "420px",
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <h2 style={{ margin: 0, fontSize: "18px" }}>Contact us</h2>

      <div style={field}>
        <label htmlFor="cf-name" style={label}>
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="cf-name"
          type="text"
          autoComplete="name"
          required
          aria-required="true"
          placeholder="Jane Smith"
          style={input}
        />
      </div>

      <div style={field}>
        <label htmlFor="cf-email" style={label}>
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="cf-email"
          type="email"
          autoComplete="email"
          required
          aria-required="true"
          placeholder="jane@example.com"
          style={input}
        />
      </div>

      <div style={field}>
        <label htmlFor="cf-subject" style={label}>
          Subject
        </label>
        <select id="cf-subject" style={input}>
          <option value="">— Choose a topic —</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>

      <div style={field}>
        <label htmlFor="cf-message" style={label}>
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="cf-message"
          rows={4}
          required
          aria-required="true"
          placeholder="Your message…"
          style={input}
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "10px 20px",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Send message
      </button>
    </form>
  );
}

export function ContactFormWithError() {
  return (
    <form
      aria-label="Contact us"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "420px",
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <h2 style={{ margin: 0, fontSize: "18px" }}>Contact us</h2>

      <div style={field}>
        <label htmlFor="cfe-name" style={label}>
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="cfe-name"
          type="text"
          required
          aria-required="true"
          aria-invalid="true"
          aria-describedby="cfe-name-error"
          style={{ ...input, borderColor: "#c00" }}
        />
        <span id="cfe-name-error" role="alert" style={errorStyle}>
          Name is required.
        </span>
      </div>

      <div style={field}>
        <label htmlFor="cfe-email" style={label}>
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          id="cfe-email"
          type="email"
          required
          aria-required="true"
          placeholder="jane@example.com"
          style={input}
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "10px 20px",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Send message
      </button>
    </form>
  );
}
