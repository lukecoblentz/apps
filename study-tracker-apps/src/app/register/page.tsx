import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

function RegisterFallback() {
  return (
    <div className="auth-page">
      <section className="card auth-card">
        <h1>Create your account</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Loading…
        </p>
      </section>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
