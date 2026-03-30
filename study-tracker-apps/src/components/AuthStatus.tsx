"use client";

import { useSession } from "next-auth/react";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="pill-status">Checking session…</span>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <span className="pill-status" title={session.user.email ?? undefined}>
      {session.user.email || session.user.name || "Signed in"}
    </span>
  );
}
