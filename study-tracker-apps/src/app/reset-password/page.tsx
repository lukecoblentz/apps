"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "Could not reset password."
        );
        setLoading(false);
        return;
      }

      router.push("/login?reset=success");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <p className="alert-error">
          Missing reset token. Open the link from your email, or request a new reset.
        </p>
        <p className="muted" style={{ marginTop: 16 }}>
          <Link href="/forgot-password" className="text-link">
            Request a new link
          </Link>
        </p>
      </>
    );
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="field">
        <label htmlFor="reset-confirm">Confirm password</label>
        <input
          id="reset-confirm"
          type="password"
          placeholder="Repeat password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Saving…" : "Set new password"}
      </button>
      {error ? <p className="alert-error">{error}</p> : null}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Set new password</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Choose a new password for your account.
        </p>
        <Suspense
          fallback={<p className="muted">Loading…</p>}
        >
          <ResetPasswordForm />
        </Suspense>
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
