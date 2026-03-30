import { ClassModel } from "@/models/Class";
import { AssignmentModel } from "@/models/Assignment";

const PALETTE = [
  "#4f46e5",
  "#0d9488",
  "#ca8a04",
  "#dc2626",
  "#7c3aed",
  "#2563eb",
  "#db2777",
  "#059669"
];

function colorForCourse(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = id.charCodeAt(i) + ((h << 5) - h);
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function normalizeBase(url: string) {
  return url.replace(/\/+$/, "");
}

async function canvasGet(
  baseUrl: string,
  token: string,
  path: string,
  searchParams?: Record<string, string>
) {
  const u = new URL(`${normalizeBase(baseUrl)}/api/v1${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      u.searchParams.set(k, v)
    );
  }
  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Canvas ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

type CourseRow = { id?: number; name?: string; course_code?: string };

type PlannerRow = {
  course_id?: number;
  plannable_type?: string;
  plannable_id?: number;
  plannable?: {
    title?: string;
    due_at?: string | null;
  } | null;
};

export async function syncCanvasForUser(
  userId: string,
  baseUrl: string,
  token: string
) {
  const courses = (await canvasGet(baseUrl, token, "/courses", {
    enrollment_state: "active",
    per_page: "100"
  })) as CourseRow[];

  const courseMap = new Map<string, string>();
  for (const c of Array.isArray(courses) ? courses : []) {
    if (c?.id != null) {
      courseMap.set(
        String(c.id),
        c.name || c.course_code || `Course ${c.id}`
      );
    }
  }

  const start = new Date();
  start.setDate(start.getDate() - 14);
  const end = new Date();
  end.setDate(end.getDate() + 120);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const planner = (await canvasGet(baseUrl, token, "/planner/items", {
    start_date: startStr,
    end_date: endStr,
    per_page: "100"
  })) as PlannerRow[];

  let classesCreated = 0;
  let assignmentsTouched = 0;

  async function ensureClass(canvasCourseId: string) {
    const name = courseMap.get(canvasCourseId) || `Course ${canvasCourseId}`;
    let doc = await ClassModel.findOne({ userId, canvasCourseId });
    if (!doc) {
      doc = await ClassModel.create({
        userId,
        canvasCourseId,
        name,
        color: colorForCourse(canvasCourseId)
      });
      classesCreated += 1;
      return doc;
    }
    if (doc.name !== name) {
      doc.name = name;
      await doc.save();
    }
    return doc;
  }

  const rows = Array.isArray(planner) ? planner : [];

  for (const item of rows) {
    if (item.plannable_type !== "assignment" || item.plannable_id == null) {
      continue;
    }
    const cid = item.course_id;
    if (cid == null) continue;

    const due = item.plannable?.due_at;
    if (!due) continue;

    const title = item.plannable?.title?.trim() || "Assignment";
    const canvasCourseId = String(cid);
    const extId = String(item.plannable_id);

    const klass = await ensureClass(canvasCourseId);

    const dueAt = new Date(due);
    const existing = await AssignmentModel.findOne({ userId, externalId: extId });
    if (existing) {
      existing.title = title;
      existing.dueAt = dueAt;
      existing.classId = klass._id;
      existing.source = "canvas";
      await existing.save();
    } else {
      await AssignmentModel.create({
        userId,
        classId: klass._id,
        title,
        dueAt,
        description: "",
        status: "todo",
        source: "canvas",
        externalId: extId
      });
    }
    assignmentsTouched += 1;
  }

  return {
    classesCreated,
    assignmentsTouched,
    plannerItemsSeen: rows.length
  };
}
