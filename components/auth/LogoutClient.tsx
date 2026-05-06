"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function LogoutClient() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const called = useRef(false);

  useEffect(() => {
    if (!called.current) {
      called.current = true;
      void signOut();
    }
  }, [signOut]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
      <p className="font-bold text-[var(--ink-500)]">Cerrando sesion...</p>
    </main>
  );
}
