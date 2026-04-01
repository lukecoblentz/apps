"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ReportBugDialog({ open, onClose }: Props) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError("");
    const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          pageUrl: typeof window !== "undefined" ? window.location.href : ""
        })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not send report.");
        setSending(false);
        return;
      }
      setComment("");
      onClose();
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setSending(false);
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="report-bug-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="report-bug-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={titleId} className="report-bug-title">
          Report a bug
        </h2>
        <p className="report-bug-lead muted">
          What went wrong? Include steps to reproduce if you can — your account email is included
          automatically for follow-up.
        </p>
        <form className="form-stack" onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="report-bug-comment">Details</label>
            <textarea
              ref={textareaRef}
              id="report-bug-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. When I tap Mark done on Canvas assignments, the row jumps…"
              rows={5}
              required
              minLength={10}
              disabled={sending}
            />
          </div>
          {error ? <p className="alert-error">{error}</p> : null}
          <div className="row-actions">
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
