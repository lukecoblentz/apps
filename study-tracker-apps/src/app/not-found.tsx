import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card" style={{ maxWidth: 480 }}>
      <h2>Page not found</h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        That URL does not exist or may have moved.
      </p>
      <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
        Back to dashboard
      </Link>
    </section>
  );
}
