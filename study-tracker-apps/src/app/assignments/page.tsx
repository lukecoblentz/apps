"use client";

import { FormEvent, useEffect, useState } from "react";

type ClassItem = {
  _id: string;
  name: string;
};

type AssignmentItem = {
  _id: string;
  title: string;
  dueAt: string;
  status: "todo" | "done";
  description?: string;
  source?: string;
  classId?: { _id?: string; name?: string; color?: string };
};

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDue(d: string) {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function AssignmentsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function loadData() {
    const [cRes, aRes] = await Promise.all([
      fetch("/api/classes", { cache: "no-store" }),
      fetch("/api/assignments", { cache: "no-store" })
    ]);
    if (cRes.ok) {
      const classData = await cRes.json();
      setClasses(classData);
      if (!classId && classData[0]?._id) {
        setClassId(classData[0]._id);
      }
    }
    if (aRes.ok) {
      setAssignments(await aRes.json());
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const iso = new Date(dueAt).toISOString();
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, classId, dueAt: iso, description, status: "todo" })
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setDueAt("");
      await loadData();
    }
  }

  function startEdit(a: AssignmentItem) {
    const cid =
      a.classId?._id != null
        ? String(a.classId._id)
        : classes[0]?._id ?? "";
    setEditingId(a._id);
    setEditTitle(a.title);
    setEditClassId(cid);
    setEditDue(toDatetimeLocalValue(a.dueAt));
    setEditDescription(a.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const iso = new Date(editDue).toISOString();
    const res = await fetch(`/api/assignments/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        classId: editClassId,
        dueAt: iso,
        description: editDescription
      })
    });
    if (res.ok) {
      setEditingId(null);
      await loadData();
    }
  }

  async function toggleStatus(item: AssignmentItem) {
    const nextStatus = item.status === "todo" ? "done" : "todo";
    const res = await fetch(`/api/assignments/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (res.ok) {
      await loadData();
    }
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingId === id) setEditingId(null);
      await loadData();
    }
  }

  return (
    <>
      <header className="page-header">
        <h1>Assignments</h1>
        <p>Add tasks, attach them to a class, and track status at a glance.</p>
      </header>

      <div className="grid two">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>New assignment</h2>
              <p className="card-subtitle">Due dates sync with your dashboard</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="asgn-title">Title</label>
              <input
                id="asgn-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reading, problem set, exam…"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="asgn-class">Class</label>
              <select
                id="asgn-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="asgn-due">Due</label>
              <input
                id="asgn-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="asgn-desc">Notes (optional)</label>
              <textarea
                id="asgn-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Links, requirements, or reminders"
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Add assignment
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>All assignments</h2>
              <p className="card-subtitle">Sorted by due date</p>
            </div>
          </div>
          {assignments.length ? (
            <ul className="list-plain">
              {assignments.map((a) =>
                editingId === a._id ? (
                  <li key={a._id} className="list-item" style={{ flexWrap: "wrap" }}>
                    <form
                      className="form-stack"
                      style={{ flex: 1, minWidth: 260 }}
                      onSubmit={saveEdit}
                    >
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                      <select
                        value={editClassId}
                        onChange={(e) => setEditClassId(e.target.value)}
                        required
                      >
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        required
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Notes"
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
                  <li key={a._id} className="list-item">
                    <div className="list-item-main" style={{ minWidth: 0 }}>
                      {a.classId?.color ? (
                        <span
                          className="class-swatch"
                          style={{ background: a.classId.color }}
                          aria-hidden
                        />
                      ) : (
                        <span
                          className="class-swatch"
                          style={{ background: "var(--text-faint)" }}
                          aria-hidden
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="list-item-title">{a.title}</div>
                        <div className="list-item-meta">
                          {a.classId?.name ?? "Class"} · {formatDue(a.dueAt)}
                          {a.source === "canvas" ? " · Canvas" : ""}
                        </div>
                      </div>
                    </div>
                    <div
                      className="row-actions"
                      style={{
                        flexShrink: 0,
                        alignItems: "center"
                      }}
                    >
                      <span
                        className={
                          a.status === "done" ? "badge badge-done" : "badge badge-todo"
                        }
                      >
                        {a.status === "done" ? "Done" : "To do"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEdit(a)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleStatus(a)}
                      >
                        {a.status === "todo" ? "Mark done" : "Reopen"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(a._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p className="empty-hint">No assignments yet. Create one on the left.</p>
          )}
        </section>
      </div>
    </>
  );
}
