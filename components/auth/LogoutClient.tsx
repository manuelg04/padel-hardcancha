"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LogoutClient() {
  const router = useRouter();
  const { signOut } = useAuthActions();

  useEffect(() => {
    void signOut().finally(() => router.replace("/login"));
  }, [router, signOut]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
      <p className="font-bold text-[var(--ink-500)]">Cerrando sesion...</p>
    </main>
  );
}
