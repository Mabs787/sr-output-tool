import React, { useState, useEffect, useCallback } from "react";
import { addons, useStorybookState } from "storybook/manager-api";
import type { ScanLogEntry } from "@sr-output/engine";
import { EVENTS, FEEDBACK_URL } from "./constants";

// ── Inject panel styles once ──────────────────────────────────────────────────

const STYLE_ID = "sr-addon-panel-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .sr-panel {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      height: 100%;
      overflow: auto;
      background: transparent;
      color: var(--sr-text, #edf3f8);
      scrollbar-width: thin;
      scrollbar-color: var(--sr-scrollbar-thumb, #4f6680) var(--sr-scrollbar-track, #101820);
    }

    .sr-panel-empty {
      padding: 16px;
      color: var(--sr-text-muted, #b8c6d4);
      font-style: italic;
      font-size: 12px;
    }

    .sr-copy-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid var(--sr-border, #2b3847);
      background: transparent;
      position: sticky;
      top: 0;
      z-index: 1;
      gap: 6px;
    }

    .sr-copy-bar-actions {
      display: flex;
      gap: 6px;
    }

    .sr-copy-btn {
      min-height: 28px;
      padding: 4px 12px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: var(--sr-btn-secondary, #2a3441);
      color: var(--sr-btn-secondary-text, #edf3f8);
      transition: background 0.15s;
    }

    .sr-copy-btn:hover {
      background: var(--sr-btn-secondary-hover, #364455);
    }

    .sr-log-list {
      list-style: none;
      margin: 0;
      padding: 8px;
      counter-reset: sr-log-counter;
      --sr-index-digits: 2;
      --sr-index-width: max(16px, calc(var(--sr-index-digits) * 6px));
      --sr-index-gutter: calc(var(--sr-index-width) + 16px);
    }

    .sr-log-item {
      counter-increment: sr-log-counter;
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 8px 10px 8px var(--sr-index-gutter);
      border-bottom: 1px solid var(--sr-row-border, #26313d);
      cursor: default;
      position: relative;
      border-radius: 4px;
      transition: background 0.1s;
    }

    .sr-log-item[data-hoverable="true"] {
      cursor: pointer;
    }

    .sr-log-item[data-hoverable="true"]:hover {
      background: var(--sr-primary-soft, #243a56);
    }

    .sr-log-item::before {
      content: counter(sr-log-counter);
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      color: var(--sr-counter-text, #7d8fa1);
      width: var(--sr-index-width);
      text-align: right;
    }

    .sr-announcement {
      flex: 0 1 auto;
      font-weight: 600;
      line-height: 1.35;
      color: var(--sr-text, #edf3f8);
      word-break: break-word;
      margin-right: 6px;
    }

    .sr-feedback-btn {
      min-height: 28px;
      padding: 4px 12px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: var(--sr-btn-secondary, #2a3441);
      color: var(--sr-btn-secondary-text, #edf3f8);
      transition: background 0.15s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }

    .sr-feedback-btn:hover {
      background: var(--sr-btn-secondary-hover, #364455);
    }

    .sr-role-tag {
      flex-shrink: 0;
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      color: var(--sr-role-tag-text, #10284a);
      background: var(--sr-role-tag-bg, #d7e7ff);
      padding: 1px 5px;
      border-radius: 3px;
      line-height: 1.35;
    }
  `;
  document.head.appendChild(style);
}

// ── Copy helper ───────────────────────────────────────────────────────────────

function copyText(log: ScanLogEntry[]) {
  const text = log.map((e) => e.announcement).join("\n");
  navigator.clipboard?.writeText(text).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    Object.assign(ta.style, { position: "fixed", opacity: "0" });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  });
}

// Inject styles once at module load time.
injectStyles();

export function SRPanel({ active }: { active: boolean }) {
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const { storyId } = useStorybookState();

  // Clear output immediately when navigating to a different story.
  useEffect(() => {
    setLog([]);
  }, [storyId]);

  useEffect(() => {
    if (!active) return;
    const channel = addons.getChannel();
    const onResult = (entries: ScanLogEntry[]) => setLog(entries);
    channel.on(EVENTS.RESULT, onResult);
    return () => {
      channel.off(EVENTS.RESULT, onResult);
    };
  }, [active]);

  const handleCopy = useCallback(() => {
    copyText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [log]);

  const handleRescan = useCallback(() => {
    setLog([]);
    addons.getChannel().emit(EVENTS.RESCAN);
  }, []);

  if (!active) return null;

  return (
    <div className="sr-panel">
      <div className="sr-copy-bar">
        <a className="sr-feedback-btn" href={FEEDBACK_URL} target="_blank" rel="noreferrer">Feedback</a>
        <div className="sr-copy-bar-actions">
          <button className="sr-copy-btn" onClick={handleRescan} type="button">Update</button>
          {log.length > 0 && (
            <button className="sr-copy-btn" onClick={handleCopy} type="button">
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>
      {log.length === 0 && (
        <p className="sr-panel-empty">No output — render a story first.</p>
      )}
      {log.length > 0 && (
      <ol
        className="sr-log-list"
        style={{ "--sr-index-digits": Math.max(2, String(log.length).length) } as React.CSSProperties}
      >
        {log.map((entry) => (
          <li
            key={entry.srId}
            className="sr-log-item"
            data-hoverable={entry.srId ? "true" : undefined}
            onMouseEnter={
              entry.srId
                ? () => addons.getChannel().emit(EVENTS.HIGHLIGHT, entry.srId)
                : undefined
            }
            onMouseLeave={
              entry.srId
                ? () => addons.getChannel().emit(EVENTS.CLEAR_HIGHLIGHT)
                : undefined
            }
          >
            <span className="sr-announcement">{entry.announcement}</span>
            {entry.role && (
              <span className="sr-role-tag">{entry.role}</span>
            )}
          </li>
        ))}
      </ol>
      )}
    </div>
  );
}

