"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "Something went wrong. Try again."
        );
        setLoading(false);
        return;
      }

      setMessage(
        typeof payload?.message === "string"
          ? payload.message
          : "If an account exists for that email, we sent a reset link."
      );
    } catch {
      setError("Could not reach the server. Check your connection.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Forgot password</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Enter your account email. If it exists, we will send a one-time link to choose a new
          password (valid for 1 hour).
        </p>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
          {error ? <p className="alert-error">{error}</p> : null}
          {message ? <p className="banner-success">{message}</p> : null}
        </form>
        <div className="auth-footer">
          <p className="muted" style={{ margin: 0 }}>
            <Link href="/login" className="text-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
