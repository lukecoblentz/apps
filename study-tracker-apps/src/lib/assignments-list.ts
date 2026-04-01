export type ClassItem = {
  _id: string;
  name: string;
  color?: string;
};

export type Priority = "low" | "normal" | "high";

export type AssignmentItem = {
  _id: string;
  title: string;
  dueAt: string;
  status: "todo" | "done";
  priority?: Priority;
  description?: string;
  source?: string;
  googleEventId?: string;
  msEventId?: string;
  updatedAt?: string;
  classId?: { _id?: string; name?: string; color?: string };
};

export type SortMode = "deadline_asc" | "deadline_desc" | "priority_desc";

/** Subset of statuses for toolbar filter */
export type StatusFilter = "all" | "todo" | "done" | "overdue" | "due_soon";

export type DueUrgency = "done" | "overdue" | "due_soon" | "upcoming";

const PRIORITY_RANK: Record<Priority, number> = {
  high: 3,
  normal: 2,
  low: 1
};

export function getDueUrgency(
  a: AssignmentItem,
  nowMs: number,
  dueSoonMs = 72 * 3600000
): DueUrgency {
  if (normalizeAssignmentStatus(a.status) === "done") return "done";
  const t = new Date(a.dueAt).getTime();
  if (Number.isNaN(t)) return "upcoming";
  if (t < nowMs) return "overdue";
  if (t <= nowMs + dueSoonMs) return "due_soon";
  return "upcoming";
}

export function applyStatusFilter(
  list: AssignmentItem[],
  filter: StatusFilter,
  nowMs: number
): AssignmentItem[] {
  if (filter === "all") return list;
  if (filter === "done") {
    return list.filter((a) => normalizeAssignmentStatus(a.status) === "done");
  }
  if (filter === "todo") {
    return list.filter((a) => normalizeAssignmentStatus(a.status) === "todo");
  }
  if (filter === "overdue") {
    return list.filter((a) => {
      if (normalizeAssignmentStatus(a.status) === "done") return false;
      const t = new Date(a.dueAt).getTime();
      return !Number.isNaN(t) && t < nowMs;
    });
  }
  if (filter === "due_soon") {
    return list.filter((a) => {
      if (normalizeAssignmentStatus(a.status) === "done") return false;
      const t = new Date(a.dueAt).getTime();
      return !Number.isNaN(t) && t >= nowMs && t <= nowMs + 72 * 3600000;
    });
  }
  return list;
}

export function sortAssignments(list: AssignmentItem[], mode: SortMode): AssignmentItem[] {
  const copy = [...list];
  if (mode === "deadline_asc") {
    copy.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  } else if (mode === "deadline_desc") {
    copy.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  } else {
    copy.sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority ?? "normal"];
      const pb = PRIORITY_RANK[b.priority ?? "normal"];
      if (pb !== pa) return pb - pa;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }
  return copy;
}

/** Coerce API / DB values so UI toggles never get stuck (missing status breaks Mark done / Reopen). */
export function normalizeAssignmentStatus(
  s: AssignmentItem["status"] | undefined | null
): "todo" | "done" {
  return s === "done" ? "done" : "todo";
}

export function partitionAssignments(assignments: AssignmentItem[]) {
  const now = Date.now();
  const done: AssignmentItem[] = [];
  const overdue: AssignmentItem[] = [];
  const upcoming: AssignmentItem[] = [];
  for (const a of assignments) {
    if (normalizeAssignmentStatus(a.status) === "done") {
      done.push(a);
      continue;
    }
    const t = new Date(a.dueAt).getTime();
    if (Number.isNaN(t)) upcoming.push(a);
    else if (t < now) overdue.push(a);
    else upcoming.push(a);
  }
  done.sort((x, y) => new Date(y.dueAt).getTime() - new Date(x.dueAt).getTime());
  overdue.sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
  upcoming.sort((x, y) => new Date(x.dueAt).getTime() - new Date(y.dueAt).getTime());
  return { overdue, upcoming, done };
}

/** After status-specific filters, only some buckets apply; still sort inside each. */
export function partitionForFilter(
  filtered: AssignmentItem[],
  statusFilter: StatusFilter
): { overdue: AssignmentItem[]; upcoming: AssignmentItem[]; done: AssignmentItem[] } {
  if (statusFilter === "done") {
    return {
      overdue: [],
      upcoming: [],
      done: filtered
    };
  }
  if (statusFilter === "todo") {
    return partitionAssignments(filtered);
  }
  if (statusFilter === "overdue" || statusFilter === "due_soon") {
    const { overdue, upcoming } = partitionAssignments(filtered);
    if (statusFilter === "overdue") {
      return { overdue, upcoming: [], done: [] };
    }
    return { overdue: [], upcoming, done: [] };
  }
  return partitionAssignments(filtered);
}

export function filterAssignments(
  list: AssignmentItem[],
  classFilter: string,
  search: string
) {
  let out = list;
  if (classFilter) {
    out = out.filter((a) => String(a.classId?._id ?? "") === classFilter);
  }
  const q = search.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.classId?.name ?? "").toLowerCase().includes(q)
    );
  }
  return out;
}

export function mergeAssignmentFromApi(
  prev: AssignmentItem,
  api: AssignmentItem
): AssignmentItem {
  return {
    ...prev,
    ...api,
    status: normalizeAssignmentStatus(api.status ?? prev.status),
    classId: api.classId ?? prev.classId
  };
}
