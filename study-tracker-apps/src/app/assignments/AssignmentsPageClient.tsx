"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AssignmentTaskCard from "@/components/assignments/AssignmentTaskCard";
import AssignmentsInsightsStrip from "@/components/assignments/AssignmentsInsightsStrip";
import AssignmentsWeekStrip from "@/components/assignments/AssignmentsWeekStrip";
import { inferPriorityFromTitle } from "@/lib/assignment-priority";
import {
  computeAssignmentCompletionStreak,
  computeAssignmentInsights,
  getBrowserTimeZone,
  insightSummaryLines
} from "@/lib/assignment-insights";
import { fireTaskCompleteConfetti } from "@/lib/fire-confetti";
import { toDatetimeLocalValue } from "@/lib/assignments-datetime";
import { scrollFirstMarkDoneIntoView } from "@/lib/assignments-scroll";
import {
  type AssignmentItem,
  type ClassItem,
  type Priority,
  type SortMode,
  type StatusFilter,
  applyStatusFilter,
  filterAssignments,
  getDueUrgency,
  mergeAssignmentFromApi,
  normalizeAssignmentStatus,
  parseAssignmentFilterFromSearchParams,
  partitionForFilter,
  sortAssignments
} from "@/lib/assignments-list";

export default function AssignmentsPageClient() {
  const searchParams = useSearchParams();
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
  const [sortMode, setSortMode] = useState<SortMode>("deadline_asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set<string>());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [googleLoadingId, setGoogleLoadingId] = useState<string | null>(null);
  const [googlePushAllLoading, setGooglePushAllLoading] = useState(false);
  const [msLoadingId, setMsLoadingId] = useState<string | null>(null);
  const [msPushAllLoading, setMsPushAllLoading] = useState(false);
  const [enteringDoneIds, setEnteringDoneIds] = useState(() => new Set<string>());
  const priorityTouchedRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [canvasLastSyncAt, setCanvasLastSyncAt] = useState<string | null>(null);
  const [canvasSyncError, setCanvasSyncError] = useState("");
  const [hasCanvasConfigured, setHasCanvasConfigured] = useState(false);

  const timeZone = useMemo(() => getBrowserTimeZone(), []);

  const insightsBundle = useMemo(() => {
    const tick = new Date();
    const ins = computeAssignmentInsights(assignments, tick, timeZone);
    const streak = computeAssignmentCompletionStreak(assignments, tick, timeZone);
    const lines = insightSummaryLines(ins, streak);
    return { ins, streak, lines };
  }, [assignments, timeZone]);

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
        const raw = (await aRes.json()) as AssignmentItem[];
        setAssignments(
          Array.isArray(raw)
            ? raw.map((a) => ({
                ...a,
                status: normalizeAssignmentStatus(a.status),
                updatedAt:
                  typeof (a as { updatedAt?: unknown }).updatedAt === "string"
                    ? (a as { updatedAt: string }).updatedAt
                    : (a as { updatedAt?: string }).updatedAt
              }))
            : []
        );
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
    const f = parseAssignmentFilterFromSearchParams(searchParams);
    if (f) setStatusFilter(f);
  }, [searchParams]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#assignment-")) return;
    const el = document.querySelector(hash);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [assignments]);

  const nowMs = Date.now();

  const filteredAssignments = useMemo(
    () => filterAssignments(assignments, filterClassId, searchQuery),
    [assignments, filterClassId, searchQuery]
  );

  const statusFiltered = useMemo(
    () => applyStatusFilter(filteredAssignments, statusFilter, nowMs, timeZone),
    [filteredAssignments, statusFilter, nowMs, timeZone]
  );

  const isNarrowDashboardFilter =
    statusFilter === "due_today" || statusFilter === "due_this_week";

  const narrowFilteredSorted = useMemo(
    () => sortAssignments(statusFiltered, sortMode),
    [statusFiltered, sortMode]
  );

  const { overdue, upcoming, done } = useMemo(
    () => partitionForFilter(statusFiltered, statusFilter),
    [statusFiltered, statusFilter]
  );

  const overdueSorted = useMemo(() => sortAssignments(overdue, sortMode), [overdue, sortMode]);
  const upcomingSorted = useMemo(
    () => sortAssignments(upcoming, sortMode),
    [upcoming, sortMode]
  );
  const doneSorted = useMemo(() => sortAssignments(done, sortMode), [done, sortMode]);

  const scrollToNewAssignment = useCallback(() => {
    document.getElementById("new-assignment")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    window.setTimeout(() => titleInputRef.current?.focus(), 320);
  }, []);

  const toggleBulkSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearBulk = useCallback(() => {
    setSelectedIds(new Set());
    setBulkMode(false);
  }, []);

  const selectedTodoCount = useMemo(() => {
    let n = 0;
    for (const id of selectedIds) {
      const a = assignments.find((x) => String(x._id) === id);
      if (a && normalizeAssignmentStatus(a.status) === "todo") n += 1;
    }
    return n;
  }, [assignments, selectedIds]);

  async function bulkMarkDone() {
    const ids = [...selectedIds].filter((id) => {
      const a = assignments.find((x) => String(x._id) === id);
      return a && normalizeAssignmentStatus(a.status) === "todo";
    });
    if (ids.length === 0) return;
    setBulkWorking(true);
    setActionError("");
    const snapshot = assignments;
    setAssignments((curr) =>
      curr.map((x) =>
        ids.includes(String(x._id)) ? { ...x, status: "done" as const } : x
      )
    );
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/assignments/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
          cache: "no-store"
        })
      )
    );
    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
      setAssignments(snapshot);
      setActionError("Some items could not be updated. Try again.");
      setBulkWorking(false);
      return;
    }
    fireTaskCompleteConfetti();
    await loadData();
    setSelectedIds(new Set());
    setBulkMode(false);
    setBulkWorking(false);
  }

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
    const current = normalizeAssignmentStatus(item.status);
    const nextStatus = current === "done" ? "todo" : "done";
    const snapshot = assignments;
    const itemKey = String(item._id);

    setAssignments((curr) =>
      curr.map((x) => (String(x._id) === itemKey ? { ...x, status: nextStatus } : x))
    );

    if (nextStatus === "done") {
      fireTaskCompleteConfetti();
      setEnteringDoneIds((prev) => new Set(prev).add(itemKey));
      window.setTimeout(() => {
        setEnteringDoneIds((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }, 260);
      scrollFirstMarkDoneIntoView();
    }

    const res = await fetch(`/api/assignments/${encodeURIComponent(itemKey)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
      cache: "no-store"
    });

    if (res.ok) {
      try {
        const data = (await res.json()) as AssignmentItem;
        setAssignments((curr) =>
          curr.map((x) =>
            String(x._id) === itemKey ? mergeAssignmentFromApi(x, data) : x
          )
        );
      } catch {
        await loadData();
      }
      return;
    }

    setAssignments(snapshot);
    setEnteringDoneIds((prev) => {
      const next = new Set(prev);
      next.delete(itemKey);
      return next;
    });
    const payload = await res.json().catch(() => ({})) as {
      error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    };
    const err = payload?.error;
    let message = "Could not update assignment status.";
    if (typeof err === "string") {
      message = err;
    } else if (err && typeof err === "object" && Array.isArray(err.formErrors) && err.formErrors.length) {
      message = err.formErrors.join("; ");
    }
    setActionError(message);
  }

  async function onDelete(id: string) {
    setActionError("");
    setActionMessage("");
    const snapshot = assignments;
    const wasEditing = editingId === id;
    setAssignments((curr) => curr.filter((x) => x._id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
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

  function renderCard(
    a: AssignmentItem,
    opts: { overdue?: boolean; completed?: boolean }
  ) {
    const urgency = getDueUrgency(a, nowMs);
    return (
      <AssignmentTaskCard
        key={a._id}
        assignment={a}
        classes={classes}
        urgency={urgency}
        completed={opts.completed}
        enteringDone={enteringDoneIds.has(String(a._id))}
        editingId={editingId}
        editTitle={editTitle}
        editClassId={editClassId}
        editDue={editDue}
        editDescription={editDescription}
        editPriority={editPriority}
        onEditTitle={setEditTitle}
        onEditClassId={setEditClassId}
        onEditDue={setEditDue}
        onEditDescription={setEditDescription}
        onEditPriority={setEditPriority}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onToggleStatus={toggleStatus}
        onStartEdit={startEdit}
        onDelete={onDelete}
        onPushGoogle={pushGoogle}
        onPushMicrosoft={pushMicrosoft}
        googleLoadingId={googleLoadingId}
        msLoadingId={msLoadingId}
        bulkMode={bulkMode}
        bulkSelected={selectedIds.has(String(a._id))}
        onToggleBulkSelect={toggleBulkSelect}
      />
    );
  }

  return (
    <>
      <header className="page-header assignments-page-header">
        <div>
          <h1>Assignments</h1>
          <p>Stay on track with priorities, streaks, and a clear week view — then sync to Google or
            Outlook when you need calendar backup.</p>
          <p className="assignments-page-subnav muted">
            <Link href="/analytics">Analytics</Link>
            <span aria-hidden> · </span>
            <Link href="/#focus-timer">Focus timer</Link>
            <span aria-hidden> · </span>
            <Link href="/calendar">Calendar</Link>
          </p>
        </div>
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
            {" · "}
            While this tab is open, sync runs about every 4 hours; the server also syncs daily.
          </span>
        </div>
      ) : null}
      {canvasSyncError ? (
        <p className="canvas-sync-error" role="status">
          Canvas: {canvasSyncError}
        </p>
      ) : null}

      {!dataLoading && assignments.length > 0 ? (
        <div className="assignments-motivation-row">
          <AssignmentsInsightsStrip
            completionStreak={insightsBundle.streak}
            todayPercent={insightsBundle.ins.todayProgress.percent}
            todayTotal={insightsBundle.ins.todayProgress.total}
            todayCompleted={insightsBundle.ins.todayProgress.completed}
            insightLines={insightsBundle.lines}
          />
          <AssignmentsWeekStrip assignments={assignments} now={new Date()} />
        </div>
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
                  <button type="button" className="btn btn-secondary btn-sm" onClick={scrollToNewAssignment}>
                    Jump to form
                  </button>
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

      <div className="grid two assignments-main-grid">
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
                ref={titleInputRef}
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
          <div className="assignments-toolbar assignments-toolbar-extended">
            <div className="field" style={{ marginBottom: 0, flex: "1 1 160px" }}>
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
            <div className="field" style={{ marginBottom: 0, flex: "0 1 200px" }}>
              <label htmlFor="asgn-filter-status" className="sr-only">
                Status
              </label>
              <select
                id="asgn-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="todo">To do only</option>
                <option value="done">Done only</option>
                <option value="overdue">Overdue</option>
                <option value="due_soon">Due soon (72h)</option>
                <option value="due_today">Due today</option>
                <option value="due_this_week">Due this week</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0, flex: "0 1 200px" }}>
              <label htmlFor="asgn-sort" className="sr-only">
                Sort
              </label>
              <select
                id="asgn-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
              >
                <option value="deadline_asc">Due soonest first</option>
                <option value="deadline_desc">Due latest first</option>
                <option value="priority_desc">Priority (high first)</option>
              </select>
            </div>
            <button
              type="button"
              className={`btn btn-secondary btn-sm${bulkMode ? " btn-active" : ""}`}
              onClick={() => {
                setBulkMode((v) => !v);
                if (bulkMode) setSelectedIds(new Set());
              }}
            >
              {bulkMode ? "Cancel select" : "Select"}
            </button>
          </div>
          {actionMessage ? <p className="banner-success board-message">{actionMessage}</p> : null}
          {dataLoading ? (
            <ul className="skeleton-list" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="skeleton-row assignment-card-skeleton">
                  <div className="skeleton-line skeleton-line-lg" />
                  <div className="skeleton-line skeleton-line-sm" />
                </li>
              ))}
            </ul>
          ) : assignments.length === 0 ? (
            <div className="empty-assignments">
              <div className="empty-assignments-icon" aria-hidden />
              <p className="empty-hint empty-assignments-copy">
                No assignments yet. Add one in the form — or create a class first if you haven&apos;t.
              </p>
            </div>
          ) : assignments.length > 0 && statusFiltered.length === 0 ? (
            <div className="assignments-section-hint-wrap">
              <p className="assignments-section-hint" style={{ marginBottom: 12 }}>
                No assignments match your search, class, or status filter.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFilterClassId("");
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : isNarrowDashboardFilter ? (
            <div className="assignments-section">
              <h3 className="assignments-section-title">
                {statusFilter === "due_today" ? "Due today" : "Due this week"}
              </h3>
              {narrowFilteredSorted.length ? (
                <ul className="list-plain assignments-card-list">
                  {narrowFilteredSorted.map((a) => renderCard(a, {}))}
                </ul>
              ) : (
                <p className="assignments-section-hint">
                  {statusFilter === "due_today"
                    ? "Nothing due today for this filter."
                    : "Nothing else due this week after today — you're in good shape."}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="assignments-section">
                <h3 className="assignments-section-title">Overdue</h3>
                {overdueSorted.length ? (
                  <ul className="list-plain assignments-card-list">
                    {overdueSorted.map((a) => renderCard(a, { overdue: true }))}
                  </ul>
                ) : (
                  <p className="assignments-section-hint">No overdue assignments.</p>
                )}
              </div>

              <div className="assignments-section">
                <h3 className="assignments-section-title">Upcoming assignments</h3>
                {upcomingSorted.length ? (
                  <ul className="list-plain assignments-card-list">
                    {upcomingSorted.map((a) => renderCard(a, {}))}
                  </ul>
                ) : (
                  <p className="assignments-section-hint">
                    Nothing due in the future. You&apos;re caught up on upcoming work.
                  </p>
                )}
              </div>

              <div className="assignments-section">
                <h3 className="assignments-section-title">Completed assignments</h3>
                {doneSorted.length ? (
                  <ul className="list-plain assignments-card-list assignments-list-done">
                    {doneSorted.map((a) => renderCard(a, { completed: true }))}
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

      {classes.length > 0 ? (
        <button
          type="button"
          className="assignments-fab"
          onClick={scrollToNewAssignment}
          aria-label="Add assignment"
        >
          +
        </button>
      ) : null}

      {bulkMode && selectedTodoCount > 0 ? (
        <div className="assignments-bulk-bar" role="region" aria-label="Bulk actions">
          <span className="assignments-bulk-count">{selectedTodoCount} selected</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={bulkWorking}
            onClick={() => void bulkMarkDone()}
          >
            {bulkWorking ? "Marking…" : "Mark done"}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearBulk}>
            Clear
          </button>
        </div>
      ) : null}
    </>
  );
}
