"use client";

import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  LogOut,
  Settings,
  Users,
  ClipboardList,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

const navItems = [
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, active: true },
  { href: "#reservas", label: "Reservas", icon: ClipboardList, active: false },
  { href: "/admin/academia", label: "Academia", icon: GraduationCap, active: true },
  { href: "/admin/metricas", label: "Métricas", icon: BarChart3, active: true },
  { href: "/admin/membresias", label: "Membresias", icon: Users, active: true },
  { href: "/admin/config", label: "Configuración", icon: Settings, active: true },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const access = useQuery(
    api.users.getCurrentUserAccess,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || access === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
        <p className="font-bold text-[var(--ink-500)]">Validando acceso...</p>
      </main>
    );
  }

  const club = access.clubAccess[0];

  if (!club) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)] p-6">
        <div className="max-w-md rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-6 text-center shadow-[var(--shadow-sm)]">
          <h1 className="text-display text-3xl font-black">Sin acceso</h1>
          <p className="mt-2 text-[var(--ink-500)]">
            No tienes acceso a ningun club.
          </p>
          <button
            className="btn btn-primary mt-5"
            onClick={() => void signOut().then(() => router.replace("/admin/login"))}
          >
            Salir
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[var(--ink-100)]">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col bg-[var(--ink-950)] p-4 text-white lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--court-500)] font-black">
            ◐
          </span>
          <div>
            <p className="font-black">CanchaBGA</p>
            <p className="text-xs text-white/55">{club.clubName}</p>
          </div>
        </div>
        <p className="mb-2 px-3 text-xs font-black uppercase tracking-[0.18em] text-white/40">
          Operación
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            if (!item.active) {
              return (
                <span
                  key={item.label}
                  className="flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2 text-sm text-white/35"
                >
                  <Icon size={16} />
                  {item.label}
                  <span className="ml-auto text-[10px]">Pronto</span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2 text-sm font-bold ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-[var(--r-lg)] border border-white/10 p-3">
          <p className="text-xs font-bold text-white/65">{access.user?.email}</p>
          <p className="mt-1 text-xs text-white/45">{club.role}</p>
        </div>
        <button
          className="mt-3 flex items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-sm font-bold text-white/65 hover:bg-white/5 hover:text-white"
          onClick={() => {
            void signOut().then(() => router.replace("/admin/login"));
          }}
        >
          <LogOut size={16} />
          Salir
        </button>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </main>
  );
}
