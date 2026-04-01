"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { inferPriorityFromTitle } from "@/lib/assignment-priority";
import { formatDueShort, toDatetimeLocalValue } from "@/lib/assignments-datetime";
import { scrollFirstMarkDoneIntoView } from "@/lib/assignments-scroll";
import {
  type AssignmentItem,
  type ClassItem,
  type Priority,
  filterAssignments,
  mergeAssignmentFromApi,
  partitionAssignments
} from "@/lib/assignments-list";

export default function AssignmentsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("normal");
  const [filterClassId, setFilterClassId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [googleLoadingId, setGoogleLoadingId] = useState<string | null>(null);
  const [googlePushAllLoading, setGooglePushAllLoading] = useState(false);
  const [msLoadingId, setMsLoadingId] = useState<string | null>(null);
  const [msPushAllLoading, setMsPushAllLoading] = useState(false);
  const [enteringDoneIds, setEnteringDoneIds] = useState(() => new Set<string>());
  const priorityTouchedRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const [canvasLastSyncAt, setCanvasLastSyncAt] = useState<string | null>(null);
  const [canvasSyncError, setCanvasSyncError] = useState("");
  const [hasCanvasConfigured, setHasCanvasConfigured] = useState(false);

  async function loadData() {
    const showSkeleton = !hasLoadedOnceRef.current;
    if (showSkeleton) setDataLoading(true);
    try {
      const [cRes, aRes, setRes] = await Promise.all([
        fetch("/api/classes", { cache: "no-store" }),
        fetch("/api/assignments", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" })
      ]);
      if (setRes.ok) {
        const s = (await setRes.json()) as {
          hasCanvasToken?: boolean;
          canvasBaseUrl?: string;
          canvasLastSyncAt?: string | null;
          canvasLastSyncError?: string;
        };
        setHasCanvasConfigured(
          Boolean(s.hasCanvasToken && (s.canvasBaseUrl || "").trim())
        );
        setCanvasLastSyncAt(
          typeof s.canvasLastSyncAt === "string" ? s.canvasLastSyncAt : null
        );
        setCanvasSyncError(
          typeof s.canvasLastSyncError === "string" ? s.canvasLastSyncError : ""
        );
      }
      if (cRes.ok) {
        const classData: ClassItem[] = await cRes.json();
        setClasses(classData);
        if (!classId && classData[0]?._id) {
          setClassId(classData[0]._id);
        }
      }
      if (aRes.ok) {
        setAssignments(await aRes.json());
      }
    } finally {
      hasLoadedOnceRef.current = true;
      setDataLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#assignment-")) return;
    const el = document.querySelector(hash);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [assignments]);

  const filteredAssignments = useMemo(
    () => filterAssignments(assignments, filterClassId, searchQuery),
    [assignments, filterClassId, searchQuery]
  );

  const { overdue, upcoming, done } = useMemo(
    () => partitionAssignments(filteredAssignments),
    [filteredAssignments]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setActionMessage("");
    if (!classId) {
      setCreateError("Create a class first, then assign work to it.");
      return;
    }
    const parsedDue = new Date(dueAt);
    if (Number.isNaN(parsedDue.getTime())) {
      setCreateError("Pick a valid due date/time.");
      return;
    }
    setCreateLoading(true);
    const iso = parsedDue.toISOString();
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        classId,
        dueAt: iso,
        description,
        status: "todo",
        priority
      })
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setDueAt("");
      priorityTouchedRef.current = false;
      setPriority("normal");
      setCreateSuccess("Assignment added.");
      window.setTimeout(() => setCreateSuccess(""), 5000);
      await loadData();
      setCreateLoading(false);
      return;
    }
    const payload = await res.json().catch(() => ({}));
    if (typeof payload?.error === "string") {
      setCreateError(payload.error);
    } else {
      setCreateError("Could not add assignment. Check your session and try again.");
    }
    setCreateLoading(false);
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
    setEditPriority(a.priority ?? "normal");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setActionMessage("");
    const iso = new Date(editDue).toISOString();
    const res = await fetch(`/api/assignments/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        classId: editClassId,
        dueAt: iso,
        description: editDescription,
        priority: editPriority
      })
    });
    if (res.ok) {
      try {
        const data = (await res.json()) as AssignmentItem;
        setEditingId(null);
        setAssignments((curr) =>
          curr.map((x) => (x._id === editingId ? mergeAssignmentFromApi(x, data) : x))
        );
      } catch {
        setEditingId(null);
        await loadData();
      }
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setActionError(payload?.error || "Could not save assignment changes.");
  }

  async function toggleStatus(item: AssignmentItem) {
    setActionError("");
    setActionMessage("");
    const nextStatus = item.status === "todo" ? "done" : "todo";
    const snapshot = assignments;

    setAssignments((curr) =>
      curr.map((x) => (x._id === item._id ? { ...x, status: nextStatus } : x))
    );

    if (nextStatus === "done") {
      setEnteringDoneIds((prev) => new Set(prev).add(item._id));
      window.setTimeout(() => {
        setEnteringDoneIds((prev) => {
          const next = new Set(prev);
          next.delete(item._id);
          return next;
        });
      }, 260);
      scrollFirstMarkDoneIntoView();
    }

    const res = await fetch(`/api/assignments/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    if (res.ok) {
      try {
        const data = (await res.json()) as AssignmentItem;
        setAssignments((curr) =>
          curr.map((x) => (x._id === item._id ? mergeAssignmentFromApi(x, data) : x))
        );
      } catch {
        await loadData();
      }
      return;
    }

    setAssignments(snapshot);
    setEnteringDoneIds((prev) => {
      const next = new Set(prev);
      next.delete(item._id);
      return next;
    });
    const payload = await res.json().catch(() => ({}));
    setActionError(
      typeof payload?.error === "string"
        ? payload.error
        : "Could not update assignment status."
    );
  }

  async function onDelete(id: string) {
    setActionError("");
    setActionMessage("");
    const snapshot = assignments;
    const wasEditing = editingId === id;
    setAssignments((curr) => curr.filter((x) => x._id !== id));
    if (wasEditing) setEditingId(null);
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    if (res.ok) {
      return;
    }
    setAssignments(snapshot);
    if (wasEditing) setEditingId(id);
    const payload = await res.json().catch(() => ({}));
    setActionError(payload?.error || "Could not delete assignment.");
  }

  async function pushGoogle(assignmentId: string) {
    setActionError("");
    setActionMessage("");
    setGoogleLoadingId(assignmentId);
    const res = await fetch("/api/google/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId })
    });
    setGoogleLoadingId(null);
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      const gid =
        typeof payload?.googleEventId === "string" ? payload.googleEventId : undefined;
      if (gid) {
        setAssignments((curr) =>
          curr.map((x) => (x._id === assignmentId ? { ...x, googleEventId: gid } : x))
        );
      }
      setActionMessage("Assignment synced to Google Calendar.");
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setActionError(payload?.error || "Could not push to Google Calendar.");
  }

  async function pushAllGoogle() {
    setActionError("");
    setActionMessage("");
    setGooglePushAllLoading(true);
    const res = await fetch("/api/google/push-all", { method: "POST" });
    setGooglePushAllLoading(false);
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      await loadData();
      const synced = Number(payload?.synced || 0);
      const total = Number(payload?.total || 0);
      const failed = Number(payload?.failed || 0);
      const failures = Array.isArray(payload?.failures) ? (payload.failures as string[]) : [];
      const first = failures[0];
      const firstDetail =
        typeof first === "string" && first.includes(":")
          ? first.slice(first.indexOf(":") + 1).trim()
          : first;
      if (failed > 0) {
        setActionError(
          firstDetail
            ? firstDetail
            : `${failed} assignment(s) could not be synced. Check Google connection in Settings.`
        );
      } else {
        setActionError("");
      }
      setActionMessage(
        `Google sync finished: ${synced}/${total} assignments synced${failed ? `, ${failed} failed` : ""}.`
      );
      return;
    }
    setActionError(payload?.error || "Could not push all assignments to Google.");
  }

  async function pushMicrosoft(assignmentId: string) {
    setActionError("");
    setActionMessage("");
    setMsLoadingId(assignmentId);
    const res = await fetch("/api/microsoft/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId })
    });
    setMsLoadingId(null);
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      const mid = typeof payload?.msEventId === "string" ? payload.msEventId : undefined;
      if (mid) {
        setAssignments((curr) =>
          curr.map((x) => (x._id === assignmentId ? { ...x, msEventId: mid } : x))
        );
      }
      setActionMessage("Assignment synced to Outlook Calendar.");
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setActionError(payload?.error || "Could not push to Outlook Calendar.");
  }

  async function pushAllMicrosoft() {
    setActionError("");
    setActionMessage("");
    setMsPushAllLoading(true);
    const res = await fetch("/api/microsoft/push-all", { method: "POST" });
    setMsPushAllLoading(false);
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      await loadData();
      const synced = Number(payload?.synced || 0);
      const total = Number(payload?.total || 0);
      const failed = Number(payload?.failed || 0);
      setActionMessage(
        `Outlook sync finished: ${synced}/${total} assignments synced${failed ? `, ${failed} failed` : ""}.`
      );
      return;
    }
    setActionError(payload?.error || "Could not push all assignments to Outlook.");
  }

  function renderAssignmentRow(
    a: AssignmentItem,
    opts: { overdue?: boolean; completed?: boolean }
  ) {
    if (editingId === a._id) {
      return (
        <li
          key={a._id}
          id={`assignment-${a._id}`}
          className="list-item"
          style={{ flexWrap: "wrap" }}
        >
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
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="edit-priority">Priority</label>
              <select
                id="edit-priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
              >
                <option value="low">Low</option>
                <option value="normal">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </li>
      );
    }

    const enterDone =
      a.status === "done" && enteringDoneIds.has(a._id) ? " assignment-row-enter-done" : "";
    const completedClass = opts.completed ? " assignment-row-completed" : "";
    const rowClass =
      `list-item assignment-row${opts.overdue ? " list-item-overdue" : ""}${enterDone}${completedClass}`.trim();

    return (
      <li key={a._id} id={`assignment-${a._id}`} className={rowClass}>
        <div className="list-item-main assignment-main" style={{ minWidth: 0 }}>
          {a.classId?.color ? (
            <span className="class-swatch" style={{ background: a.classId.color }} aria-hidden />
          ) : (
            <span className="class-swatch" style={{ background: "var(--text-faint)" }} aria-hidden />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="list-item-title-row">
              <span className="list-item-title">{a.title}</span>
              {a.priority === "high" ? (
                <span className="badge badge-priority-high">High</span>
              ) : null}
              {a.priority === "low" ? (
                <span className="badge badge-priority-low">Low</span>
              ) : null}
            </div>
            <div className="list-item-meta assignment-meta-line">
              <span>
                {a.classId?.name ?? "Class"} · {formatDueShort(a.dueAt)}
                {opts.overdue ? " · Overdue" : ""}
              </span>
              {a.source === "canvas" ? (
                <span className="badge badge-canvas" title="Synced from Canvas">
                  Canvas
                </span>
              ) : (
                <span className="badge badge-manual" title="Created in Study Tracker">
                  Manual
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="row-actions assignment-actions">
          <span
            className={a.status === "done" ? "badge badge-done" : "badge badge-todo"}
          >
            {a.status === "done" ? "Done" : "To do"}
          </span>
          {a.status === "todo" ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => toggleStatus(a)}
            >
              Mark done
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => toggleStatus(a)}
            >
              Reopen
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(a)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => pushGoogle(a._id)}
            disabled={googleLoadingId === a._id}
          >
            {googleLoadingId === a._id
              ? "Pushing..."
              : a.googleEventId
                ? "Update Google"
                : "Push Google"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => pushMicrosoft(a._id)}
            disabled={msLoadingId === a._id}
          >
            {msLoadingId === a._id
              ? "Pushing..."
              : a.msEventId
                ? "Update Outlook"
                : "Push Outlook"}
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(a._id)}>
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1>Assignments</h1>
        <p>
          Add tasks by class, set priority and due dates, then mark done or sync to Google /
          Outlook (one-way from Study Tracker).
        </p>
      </header>

      {hasCanvasConfigured ? (
        <div className="assignments-canvas-strip">
          <span>
            <strong>Canvas</strong>
            {canvasLastSyncAt
              ? ` · Last sync ${new Date(canvasLastSyncAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}`
              : " · Run Sync now in Settings to fetch planner items."}
            {" · "}Auto refresh about every 4 hours.
          </span>
        </div>
      ) : null}
      {canvasSyncError ? (
        <p className="canvas-sync-error" role="status">
          Canvas: {canvasSyncError}
        </p>
      ) : null}

      {!dataLoading && (classes.length === 0 || assignments.length === 0) ? (
        <section className="card setup-checklist-card" aria-label="Getting started">
          <h2 className="setup-checklist-title">Getting started</h2>
          <ol className="setup-steps">
            <li className={classes.length ? "setup-step setup-step-done" : "setup-step"}>
              <span className="setup-step-marker" aria-hidden>
                {classes.length ? "✓" : "1"}
              </span>
              <div>
                <strong>Create a class</strong>
                <p className="setup-step-desc muted">
                  Classes group your courses so every assignment has a home.
                </p>
                {!classes.length ? (
                  <Link href="/classes" className="btn btn-primary btn-sm">
                    Create your first class
                  </Link>
                ) : null}
              </div>
            </li>
            <li className={assignments.length ? "setup-step setup-step-done" : "setup-step"}>
              <span className="setup-step-marker" aria-hidden>
                {assignments.length ? "✓" : "2"}
              </span>
              <div>
                <strong>Add an assignment</strong>
                <p className="setup-step-desc muted">
                  Use the form below with a title, class, and due time. Priority defaults from the
                  title (e.g. exam → high, lab → medium) until you change it.
                </p>
                {!assignments.length && classes.length ? (
                  <a href="#new-assignment" className="btn btn-secondary btn-sm">
                    Jump to form
                  </a>
                ) : null}
              </div>
            </li>
            <li className="setup-step">
              <span className="setup-step-marker" aria-hidden>
                3
              </span>
              <div>
                <strong>Sync to your calendar (optional)</strong>
                <p className="setup-step-desc muted">
                  Connect Google or Outlook in Settings, then push assignments from each row or
                  use &quot;Push all&quot; on the right.
                </p>
                <Link href="/settings" className="btn btn-ghost btn-sm">
                  Open Settings
                </Link>
              </div>
            </li>
          </ol>
        </section>
      ) : null}

      <div className="grid two">
        <section className="card card-animate" id="new-assignment">
          <div className="card-header">
            <div>
              <h2>New assignment</h2>
              <p className="card-subtitle">Shows on your dashboard by due date</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="asgn-title">Title</label>
            <input
              id="asgn-title"
              value={title}
              onChange={(e) => {
                const v = e.target.value;
                setTitle(v);
                if (!priorityTouchedRef.current) {
                  setPriority(inferPriorityFromTitle(v));
                }
              }}
              placeholder="Reading, problem set, exam…"
                required
                minLength={1}
              />
            </div>
            <div className="field">
              <label htmlFor="asgn-class">Class</label>
              <select
                id="asgn-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                disabled={classes.length === 0}
              >
                <option value="">{classes.length ? "Select class" : "Create a class first"}</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="asgn-priority">Priority</label>
              <select
                id="asgn-priority"
                value={priority}
                onChange={(e) => {
                  priorityTouchedRef.current = true;
                  setPriority(e.target.value as Priority);
                }}
              >
                <option value="low">Low</option>
                <option value="normal">Medium</option>
                <option value="high">High</option>
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
            <button
              className="btn btn-primary"
              type="submit"
              disabled={createLoading || classes.length === 0}
            >
              {createLoading ? "Adding..." : "Add assignment"}
            </button>
            {classes.length === 0 ? (
              <div className="form-callout">
                <p className="alert-error" style={{ marginBottom: 10 }}>
                  You need at least one class before you can add assignments.
                </p>
                <Link href="/classes" className="btn btn-primary">
                  Create your first class
                </Link>
              </div>
            ) : null}
            {createSuccess ? <p className="banner-success">{createSuccess}</p> : null}
            {createError ? <p className="alert-error">{createError}</p> : null}
            {actionError ? <p className="alert-error">{actionError}</p> : null}
          </form>
        </section>

        <section className="card assignments-board card-animate">
          <div className="card-header assignments-board-header">
            <div>
              <h2>Your assignments</h2>
              <p className="card-subtitle">
                Overdue, upcoming, and completed — same buckets as the dashboard.
              </p>
            </div>
            <div className="assignments-board-sync-btns">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={googlePushAllLoading || assignments.length === 0}
                onClick={() => void pushAllGoogle()}
              >
                {googlePushAllLoading ? "Pushing all..." : "Push all to Google"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={msPushAllLoading || assignments.length === 0}
                onClick={() => void pushAllMicrosoft()}
              >
                {msPushAllLoading ? "Pushing all..." : "Push all to Outlook"}
              </button>
            </div>
          </div>
          <p className="sync-explainer muted">
            <strong>Calendar sync is one-way:</strong> Study Tracker → Google or Outlook. Each
            assignment becomes (or updates) one calendar event using its due time. Connect accounts
            in Settings first. After you run a push, a success message appears here; &quot;Update&quot;
            refreshes the same event if the due time or title changed.
          </p>
          <div className="assignments-toolbar">
            <div className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
              <label htmlFor="asgn-search" className="sr-only">
                Search assignments
              </label>
              <input
                id="asgn-search"
                type="search"
                placeholder="Search title, notes, class…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="field" style={{ marginBottom: 0, flex: "0 1 200px" }}>
              <label htmlFor="asgn-filter-class" className="sr-only">
                Filter by class
              </label>
              <select
                id="asgn-filter-class"
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {actionMessage ? <p className="banner-success board-message">{actionMessage}</p> : null}
          {dataLoading ? (
            <ul className="skeleton-list" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="skeleton-row">
                  <div className="skeleton-line skeleton-line-lg" />
                  <div className="skeleton-line skeleton-line-sm" />
                </li>
              ))}
            </ul>
          ) : assignments.length === 0 ? (
            <div className="empty-assignments">
              <div className="empty-assignments-icon" aria-hidden />
              <p className="empty-hint" style={{ marginTop: 16, border: "none", background: "none" }}>
                No assignments yet. Add one in the form — or create a class first if you haven&apos;t.
              </p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="assignments-section-hint-wrap">
              <p className="assignments-section-hint" style={{ marginBottom: 12 }}>
                No assignments match your search or class filter.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFilterClassId("");
                  setSearchQuery("");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="assignments-section">
                <h3 className="assignments-section-title">Overdue</h3>
                {overdue.length ? (
                  <ul className="list-plain assignments-list">
                    {overdue.map((a) => renderAssignmentRow(a, { overdue: true }))}
                  </ul>
                ) : (
                  <p className="assignments-section-hint">No overdue assignments.</p>
                )}
              </div>

              <div className="assignments-section">
                <h3 className="assignments-section-title">Upcoming assignments</h3>
                {upcoming.length ? (
                  <ul className="list-plain assignments-list">
                    {upcoming.map((a) => renderAssignmentRow(a, {}))}
                  </ul>
                ) : (
                  <p className="assignments-section-hint">
                    Nothing due in the future. You&apos;re caught up on upcoming work.
                  </p>
                )}
              </div>

              <div className="assignments-section">
                <h3 className="assignments-section-title">Completed assignments</h3>
                {done.length ? (
                  <ul className="list-plain assignments-list assignments-list-done">
                    {done.map((a) => renderAssignmentRow(a, { completed: true }))}
                  </ul>
                ) : (
                  <p className="assignments-section-hint">
                    No completed assignments yet. Mark items done to move them here.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
