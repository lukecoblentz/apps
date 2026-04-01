"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function InvitePage() {
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/user/invite");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setError(typeof data?.error === "string" ? data.error : "Could not load invite link.");
          }
          return;
        }
        if (!cancelled && typeof data?.inviteUrl === "string") {
          setInviteUrl(data.inviteUrl);
        }
      } catch {
        if (!cancelled) setError("Network error. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the link and copy manually.");
    }
  }, [inviteUrl]);

  return (
    <>
      <header className="page-header">
        <h1>Invite a friend</h1>
        <p>
          Share your personal sign-up link. When someone creates an account with it, we record that
          they joined from your invite (for your own reference).
        </p>
      </header>

      <section className="card card-animate">
        {loading ? (
          <p className="muted" style={{ margin: 0 }}>
            Loading your link…
          </p>
        ) : error ? (
          <p className="alert-error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : (
          <div className="form-stack" style={{ gap: 16 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="invite-url">Invite link</label>
              <input id="invite-url" readOnly value={inviteUrl} className="invite-url-input" />
            </div>
            <div className="row-actions" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={() => void copy()}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <Link href="/assignments" className="btn btn-secondary">
                Back to assignments
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
