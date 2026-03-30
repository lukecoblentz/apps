"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error || "Registration failed.");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (signInResult?.error) {
        setError("Account created, but auto-login failed. Please log in manually.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Registration failed due to a network or server error.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Create your account</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          One place for courses, due dates, and what is next.
        </p>
        <form className="form-stack" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reg-name">Name</label>
            <input
              id="reg-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
          {error ? <p className="alert-error">{error}</p> : null}
        </form>
        <div className="auth-footer">
          <p className="muted" style={{ margin: 0 }}>
            Already have an account?{" "}
            <Link href="/login" className="text-link">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
