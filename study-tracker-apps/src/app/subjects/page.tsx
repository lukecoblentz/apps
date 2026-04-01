"use client";

import { FormEvent, useEffect, useState } from "react";

type Subject = {
  _id: string;
  name: string;
  color: string;
  sortOrder?: number;
};

export default function SubjectsPage() {
  const [list, setList] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/subjects", { cache: "no-store" });
    setLoading(false);
    if (res.ok) {
      setList(await res.json());
    } else {
      setError("Could not load subjects.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color })
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setMessage("Subject added.");
      await load();
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setError(typeof payload?.error === "string" ? payload.error : "Could not add subject.");
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this subject? Sessions become uncategorized.")) {
      return;
    }
    setError("");
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Subject removed.");
      await load();
      return;
    }
    setError("Could not remove subject.");
  }

  return (
    <>
      <header className="page-header">
        <h1>Subjects</h1>
        <p>
          Color-coded topics for study sessions and analytics. Separate from course
          classes — use these for how you think about your work (e.g. Math, CS).
        </p>
      </header>

      <div className="grid">
        {message ? <p className="banner-success">{message}</p> : null}
        {error ? <p className="alert-error">{error}</p> : null}

        <section className="card card-animate">
          <h2>Add subject</h2>
          <form className="form-stack subjects-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="sub-name">Name</label>
              <input
                id="sub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Linear Algebra"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="sub-color">Color</label>
              <input
                id="sub-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="subjects-color-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add subject"}
            </button>
          </form>
        </section>

        <section className="card card-animate">
          <h2>Your subjects</h2>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : list.length === 0 ? (
            <p className="empty-hint">No subjects yet. Add one to tag timer sessions.</p>
          ) : (
            <ul className="list-plain subjects-list">
              {list.map((s) => (
                <li key={s._id} className="list-item subjects-list-item">
                  <span
                    className="class-swatch"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <div className="list-item-main">
                    <div className="list-item-title">{s.name}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void remove(s._id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
