"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const access = useQuery(
    api.users.getCurrentUserAccess,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/super-admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || access === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
        <p className="font-bold text-[var(--ink-500)]">Validando acceso...</p>
      </main>
    );
  }

  if (!access.isSuperAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)] p-6">
        <div className="max-w-md rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-6 text-center shadow-[var(--shadow-sm)]">
          <h1 className="text-display text-3xl font-black">Sin permisos</h1>
          <p className="mt-2 text-[var(--ink-500)]">
            No tienes permisos de super admin.
          </p>
          <button
            className="btn btn-primary mt-5"
            onClick={() =>
              void signOut()
            }
          >
            Salir
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
