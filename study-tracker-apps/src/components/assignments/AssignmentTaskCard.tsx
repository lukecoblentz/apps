"use client";

import { FormEvent } from "react";
import { formatDueShort } from "@/lib/assignments-datetime";
import {
  type AssignmentItem,
  type ClassItem,
  type DueUrgency,
  type Priority,
  normalizeAssignmentStatus
} from "@/lib/assignments-list";

type Props = {
  assignment: AssignmentItem;
  classes: ClassItem[];
  urgency: DueUrgency;
  completed?: boolean;
  enteringDone: boolean;
  editingId: string | null;
  editTitle: string;
  editClassId: string;
  editDue: string;
  editDescription: string;
  editPriority: Priority;
  onEditTitle: (v: string) => void;
  onEditClassId: (v: string) => void;
  onEditDue: (v: string) => void;
  onEditDescription: (v: string) => void;
  onEditPriority: (v: Priority) => void;
  onSaveEdit: (e: FormEvent) => void;
  onCancelEdit: () => void;
  onToggleStatus: (a: AssignmentItem) => void;
  onStartEdit: (a: AssignmentItem) => void;
  onDelete: (id: string) => void;
  onPushGoogle: (id: string) => void;
  onPushMicrosoft: (id: string) => void;
  googleLoadingId: string | null;
  msLoadingId: string | null;
  bulkMode: boolean;
  bulkSelected: boolean;
  onToggleBulkSelect: (id: string) => void;
};

function urgencyClass(u: DueUrgency, completed?: boolean): string {
  if (completed || u === "done") return "assignment-card--done";
  if (u === "overdue") return "assignment-card--overdue";
  if (u === "due_soon") return "assignment-card--soon";
  return "";
}

export default function AssignmentTaskCard({
  assignment: a,
  classes,
  urgency,
  completed,
  enteringDone,
  editingId,
  editTitle,
  editClassId,
  editDue,
  editDescription,
  editPriority,
  onEditTitle,
  onEditClassId,
  onEditDue,
  onEditDescription,
  onEditPriority,
  onSaveEdit,
  onCancelEdit,
  onToggleStatus,
  onStartEdit,
  onDelete,
  onPushGoogle,
  onPushMicrosoft,
  googleLoadingId,
  msLoadingId,
  bulkMode,
  bulkSelected,
  onToggleBulkSelect
}: Props) {
  if (editingId === a._id) {
    return (
      <li
        id={`assignment-${a._id}`}
        className="assignment-card assignment-card--editing"
      >
        <form className="form-stack assignment-card-edit" onSubmit={onSaveEdit}>
          <input value={editTitle} onChange={(e) => onEditTitle(e.target.value)} required />
          <select
            value={editClassId}
            onChange={(e) => onEditClassId(e.target.value)}
            required
          >
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`edit-priority-${a._id}`}>Priority</label>
            <select
              id={`edit-priority-${a._id}`}
              value={editPriority}
              onChange={(e) => onEditPriority(e.target.value as Priority)}
            >
              <option value="low">Low</option>
              <option value="normal">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <input
            type="datetime-local"
            value={editDue}
            onChange={(e) => onEditDue(e.target.value)}
            required
          />
          <textarea
            value={editDescription}
            onChange={(e) => onEditDescription(e.target.value)}
            placeholder="Notes"
          />
          <div className="row-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              Save
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  const isDone = normalizeAssignmentStatus(a.status) === "done";
  const enterDone = isDone && enteringDone ? " assignment-card--enter-done" : "";
  const uClass = urgencyClass(urgency, completed);
  const overdueFlag = urgency === "overdue" && !completed;

  return (
    <li
      id={`assignment-${a._id}`}
      className={`assignment-card ${uClass}${enterDone}${completed ? " assignment-card--completed-row" : ""}`.trim()}
    >
      <div className="assignment-card-top">
        {bulkMode ? (
          <label className="assignment-bulk-check">
            <input
              type="checkbox"
              checked={bulkSelected}
              onChange={() => onToggleBulkSelect(a._id)}
              disabled={isDone}
              aria-label={isDone ? "Already completed" : `Select ${a.title}`}
            />
          </label>
        ) : null}
        <div className="assignment-card-main">
          {a.classId?.color ? (
            <span className="class-swatch" style={{ background: a.classId.color }} aria-hidden />
          ) : (
            <span className="class-swatch" style={{ background: "var(--text-faint)" }} aria-hidden />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="assignment-card-title-row">
              <span className="assignment-card-title">{a.title}</span>
              {a.priority === "high" ? (
                <span className="badge badge-priority-high">High</span>
              ) : null}
              {a.priority === "low" ? (
                <span className="badge badge-priority-low">Low</span>
              ) : null}
            </div>
            <div className="assignment-card-meta">
              <span>
                {a.classId?.name ?? "Class"} · {formatDueShort(a.dueAt)}
                {overdueFlag ? " · Overdue" : ""}
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
      </div>
      <div className="assignment-card-actions">
        <span className={isDone ? "badge badge-done" : "badge badge-todo"}>
          {isDone ? "Done" : "To do"}
        </span>
        {isDone ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onToggleStatus(a)}
          >
            Reopen
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onToggleStatus(a)}
          >
            Mark done
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onStartEdit(a)}>
          Edit
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPushGoogle(a._id)}
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
          onClick={() => onPushMicrosoft(a._id)}
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
