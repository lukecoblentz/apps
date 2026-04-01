"use client";

import { SessionProvider } from "next-auth/react";
import { useCanvasAutoSync } from "@/hooks/useCanvasAutoSync";

function CanvasAutoSyncEffect() {
  useCanvasAutoSync();
  return null;
}

export default function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <CanvasAutoSyncEffect />
      {children}
    </SessionProvider>
  );
}
