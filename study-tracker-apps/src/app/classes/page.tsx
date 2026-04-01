"use client";

import { FormEvent, useEffect, useState } from "react";

type ClassItem = {
  _id: string;
  name: string;
  color: string;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#4f46e5");

  async function loadClasses() {
    const res = await fetch("/api/classes", { cache: "no-store" });
    if (res.ok) {
      setClasses(await res.json());
      setError("");
      return;
    }

    const payload = await res.json().catch(() => ({}));
    setError(
      typeof payload?.error === "string"
        ? payload.error
        : "Could not load classes."
    );
  }

  useEffect(() => {
    void loadClasses();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color })
    });

    if (res.ok) {
      setName("");
      await loadClasses();
      setLoading(false);
      return;
    }

    const payload = await res.json().catch(() => ({}));
    setError(
      typeof payload?.error === "string"
        ? payload.error
        : "Could not create class."
    );
    setLoading(false);
  }

  function startEdit(c: ClassItem) {
    setEditingId(c._id);
    setEditName(c.name);
    setEditColor(c.color);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = await fetch(`/api/classes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor })
    });
    if (res.ok) {
      setEditingId(null);
      await loadClasses();
    }
  }

  async function onDelete(id: string) {
    if (
      !window.confirm(
        "Delete this class? All assignments in this class will be removed permanently."
      )
    ) {
      return;
    }
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) setEditingId(null);
      await loadClasses();
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Classes</h1>
        <p>Group work by course and pick a color for quick scanning.</p>
      </header>

      <div className="grid two">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Add class</h2>
              <p className="card-subtitle">Used when creating assignments</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="class-name">Name</label>
              <input
                id="class-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CS 101"
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="class-color">Color</label>
              <input
                id="class-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Class color"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add class"}
            </button>
            {error ? <p className="alert-error">{String(error)}</p> : null}
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Your classes</h2>
              <p className="card-subtitle">{classes.length} total</p>
            </div>
          </div>
          {classes.length ? (
            <ul className="list-plain">
              {classes.map((c) =>
                editingId === c._id ? (
                  <li key={c._id} className="list-item" style={{ flexWrap: "wrap" }}>
                    <form
                      className="form-stack"
                      style={{ flex: 1, minWidth: 200 }}
                      onSubmit={saveEdit}
                    >
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        aria-label="Class color"
                      />
                      <div className="row-actions">
                        <button type="submit" className="btn btn-primary btn-sm">
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={c._id} className="list-item">
                    <div className="list-item-main">
                      <span
                        className="class-swatch"
                        style={{ background: c.color }}
                        aria-hidden
                      />
                      <span className="list-item-title">{c.name}</span>
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(c._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="empty-hint">No classes yet. Add your first one.</p>
          )}
        </section>
      </div>
    </>
  );
}
