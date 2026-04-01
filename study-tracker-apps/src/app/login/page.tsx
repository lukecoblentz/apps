"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setMessage("Password updated. Sign in with your new password.");
    }
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Could not sign in. Check connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Welcome back</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Sign in to sync your classes and assignments.
        </p>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6
              }}
            >
              <label htmlFor="login-password" style={{ marginBottom: 0 }}>
                Password
              </label>
              <Link href="/forgot-password" className="text-link" style={{ fontSize: "0.8125rem" }}>
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {message ? <p className="banner-success">{message}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {error ? <p className="alert-error">{error}</p> : null}
        </form>
        <div className="auth-footer">
          <p className="muted" style={{ margin: 0 }}>
            Need an account?{" "}
            <Link href="/register" className="text-link">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
