export type ClassItem = {
  _id: string;
  name: string;
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
  classId?: { _id?: string; name?: string; color?: string };
};

export function partitionAssignments(assignments: AssignmentItem[]) {
  const now = Date.now();
  const done: AssignmentItem[] = [];
  const overdue: AssignmentItem[] = [];
  const upcoming: AssignmentItem[] = [];
  for (const a of assignments) {
    if (a.status === "done") {
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
    classId: api.classId ?? prev.classId
  };
}
