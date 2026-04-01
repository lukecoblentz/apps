import { Suspense } from "react";
import AssignmentsPageClient from "./AssignmentsPageClient";

export default function AssignmentsPage() {
  return (
    <Suspense
      fallback={
        <p className="muted" style={{ marginTop: 24 }}>
          Loading assignments…
        </p>
      }
    >
      <AssignmentsPageClient />
    </Suspense>
  );
}
