"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          padding: 32,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#f4f6fb",
          color: "#0f172a"
        }}
      >
        <div
          style={{
            maxWidth: 440,
            margin: "10vh auto 0",
            padding: 28,
            borderRadius: 16,
            background: "#fff",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)"
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 15 }}>
            {error.message || "Unexpected error in the app shell."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              font: "inherit",
              fontWeight: 600,
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "#4338ca",
              color: "#fff"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
