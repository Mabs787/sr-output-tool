// ──────────────────────────────────────────────
// Event Tracker
//
// Collects SREvent objects during a recording
// session and exposes helpers for building the
// final report.
// ──────────────────────────────────────────────

import { SREvent, SRRecording, Viewport } from "./types";

export class EventTracker {
  private events: SREvent[] = [];
  private startTime: number = Date.now();
  private _url = "";
  private _viewport: Viewport = { width: 1280, height: 800 };
  private _title?: string;

  /** Reset the tracker for a new recording session. */
  start(options?: { url?: string; viewport?: Viewport; title?: string }): void {
    this.events = [];
    this.startTime = Date.now();
    this._url = options?.url ?? "";
    this._viewport = options?.viewport ?? { width: 1280, height: 800 };
    this._title = options?.title;
  }

  /** Add an event. Timestamp is computed relative to `start()`. */
  push(event: Omit<SREvent, "timestamp"> & { timestamp?: number }): void {
    const ts = event.timestamp ?? Date.now() - this.startTime;
    this.events.push({ ...event, timestamp: ts });
  }

  /** Return the number of recorded events. */
  get length(): number {
    return this.events.length;
  }

  /** Build and return the recording object. */
  toRecording(): SRRecording {
    return {
      url: this._url,
      viewport: this._viewport,
      title: this._title,
      createdAt: new Date().toISOString(),
      events: [...this.events].sort((a, b) => a.timestamp - b.timestamp),
    };
  }
}
