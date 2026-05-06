"use client";

import { Building2, LogOut, Plus } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { SuperAdminGuard } from "./SuperAdminGuard";

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuthActions();

  return (
    <SuperAdminGuard>
      <main className="min-h-screen bg-[var(--ink-100)]">
        <header className="sticky top-0 z-30 border-b border-[var(--ink-200)] bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/super-admin/clubes" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] bg-[var(--ink-950)] text-white">
                <Building2 size={18} />
              </span>
              <div>
                <p className="font-black">CanchaBGA</p>
                <p className="text-xs font-bold text-[var(--ink-500)]">
                  Super admin
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <Link
                className={`btn ${
                  pathname === "/super-admin/clubes" ? "btn-dark" : "btn-ghost"
                }`}
                href="/super-admin/clubes"
              >
                Clubes
              </Link>
              <Link className="btn btn-primary" href="/super-admin/clubes/nuevo">
                <Plus size={16} />
                Nuevo club
              </Link>
            </nav>

            <button
              className="btn btn-ghost"
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>
        <section className="mx-auto max-w-7xl px-4 py-6 md:py-8">{children}</section>
      </main>
    </SuperAdminGuard>
  );
}
