"use client";

import {
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  ClipboardCheck,
  CircleAlert,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import { todayBogota } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { AdminLayout } from "./AdminLayout";
import { AcademyClassesPanel } from "./academy/AcademyClassesPanel";
import { AcademyPackagesPanel } from "./academy/AcademyPackagesPanel";
import { AcademyProfessorsPanel } from "./academy/AcademyProfessorsPanel";
import { AcademyReportsPanel } from "./academy/AcademyReportsPanel";

const tabs = [
  { key: "resumen", label: "Resumen", icon: GraduationCap },
  { key: "clases", label: "Clases", icon: BookOpenCheck },
  { key: "profesores", label: "Profesores", icon: BadgeCheck },
  { key: "paquetes", label: "Paquetes", icon: Boxes },
  { key: "reportes", label: "Reportes", icon: ClipboardCheck },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function AcademyClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const today = useMemo(() => todayBogota(), []);
  const club = useQuery(api.clubs.getCurrentUserClubForAdmin, {});
  const reports = useQuery(
    api.academy.getReports,
    club ? { clubId: club._id, startDate: today, endDate: today } : "skip",
  );

  return (
    <AdminLayout>
      <div className="mx-auto min-w-0 w-full max-w-[1500px] px-4 py-5 md:px-8 md:py-8">
        {club === undefined || reports === undefined ? (
          <AcademyLoadingState />
        ) : club === null ? (
          <AcademyEmptyAccess />
        ) : (
          <>
            <header className="mb-6 overflow-hidden rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-md)]">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pill pill-available">
                      <span className="dot" />
                      Academia
                    </span>
                    <span className="pill border border-[var(--ink-200)] bg-[var(--ink-50)] text-[var(--ink-700)]">
                      {club.name}
                    </span>
                  </div>
                  <h1 className="text-display mt-5 max-w-3xl text-3xl font-black leading-tight text-[var(--ink-950)] md:text-5xl">
                    Clases, profesores y paquetes en un solo tablero.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-600)] md:text-base">
                    Administra la operacion diaria de academia sin mezclarla con reservas de cancha.
                  </p>
                </div>
                <div className="border-t border-[var(--ink-200)] bg-[var(--ink-950)] p-5 text-white lg:border-l lg:border-t-0 md:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                        Estado de hoy
                      </p>
                      <p className="text-display mt-2 text-3xl font-black">
                        {reports.pendingValidations.length === 0 ? "Al dia" : "Por validar"}
                      </p>
                    </div>
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-[var(--court-200)]">
                      <Sparkles size={22} />
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[var(--r-lg)] border border-white/10 bg-white/5 p-4">
                      <p className="text-white/50">Clases</p>
                      <p className="mt-1 text-2xl font-black">{reports.dailyClasses.length}</p>
                    </div>
                    <div className="rounded-[var(--r-lg)] border border-white/10 bg-white/5 p-4">
                      <p className="text-white/50">Pendientes</p>
                      <p className="mt-1 text-2xl font-black">{reports.pendingValidations.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={BookOpenCheck} label="Clases hoy" value={reports.dailyClasses.length} detail="Sesiones registradas" />
              <MetricCard icon={ClipboardCheck} label="Por validar" value={reports.pendingValidations.length} detail="Clases con pendiente" urgent={reports.pendingValidations.length > 0} />
              <MetricCard
                icon={Boxes}
                label="Paquetes activos"
                value={reports.packages.filter((item) => item.packagePurchase.status === "active").length}
                detail="Con saldo disponible"
              />
              <MetricCard icon={BadgeCheck} label="Recibido hoy" value={formatCOP(reports.revenue.totalReceived)} detail="Clases y paquetes" wide />
            </section>

            <nav className="sticky top-0 z-10 mb-5 -mx-4 min-w-0 border-y border-[var(--ink-200)] bg-[var(--ink-100)]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8 lg:top-0">
              <div className="overflow-x-auto">
                <div className="inline-flex min-w-full gap-2 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-1.5 shadow-[var(--shadow-sm)] sm:min-w-0">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[var(--r-md)] px-4 py-2 text-sm font-black transition duration-150 active:scale-[0.98] sm:flex-none ${
                          isActive
                            ? "bg-[var(--ink-950)] text-white shadow-[var(--shadow-sm)]"
                            : "text-[var(--ink-600)] hover:bg-[var(--ink-50)] hover:text-[var(--ink-950)]"
                        }`}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                      >
                        <Icon size={16} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {activeTab === "resumen" ? (
              <AcademyReportsPanel clubId={club._id} compact />
            ) : null}
            {activeTab === "clases" ? <AcademyClassesPanel clubId={club._id} /> : null}
            {activeTab === "profesores" ? (
              <AcademyProfessorsPanel clubId={club._id} />
            ) : null}
            {activeTab === "paquetes" ? <AcademyPackagesPanel clubId={club._id} /> : null}
            {activeTab === "reportes" ? (
              <AcademyReportsPanel clubId={club._id} compact={false} />
            ) : null}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  urgent = false,
  wide = false,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail: string;
  urgent?: boolean;
  wide?: boolean;
}) {
  return (
    <article className={`group rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${wide ? "sm:col-span-2 xl:col-span-1" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--ink-500)]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[var(--ink-950)] md:text-3xl">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-400)]">{detail}</p>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${urgent ? "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]" : "bg-[var(--court-100)] text-[var(--court-700)]"}`}>
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function AcademyLoadingState() {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)] md:p-7">
      <div className="max-w-2xl">
        <div className="h-4 w-28 rounded-full bg-[var(--court-100)]" />
        <div className="mt-5 h-10 w-3/4 rounded-[var(--r-md)] bg-[var(--ink-100)]" />
        <div className="mt-3 h-4 w-full rounded-full bg-[var(--ink-100)]" />
        <div className="mt-2 h-4 w-2/3 rounded-full bg-[var(--ink-100)]" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)]" />
        ))}
      </div>
    </section>
  );
}

function AcademyEmptyAccess() {
  return (
    <section className="rounded-[var(--r-xl)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]">
        <CircleAlert size={22} />
      </span>
      <h1 className="text-display mt-4 text-3xl font-black">No encontramos el club</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-500)]">
        La vista de academia necesita un club activo para mostrar clases, profesores y paquetes.
      </p>
    </section>
  );
}
