"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <h2>Something went wrong</h2>
      <p className="muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button className="btn btn-primary" type="button" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
