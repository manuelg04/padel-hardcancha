import { BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";

export function ClubCourtsList({ courts }: { courts: Doc<"courts">[] }) {
  if (courts.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] p-5 text-[var(--ink-500)]">
        Este club todavia no tiene canchas activas publicadas.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {courts.map((court) => (
        <article
          key={court._id}
          className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]"
        >
          <div className="h-2 bg-[linear-gradient(90deg,var(--court-600),var(--court-300))]" />
          <div className="p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[var(--ink-950)]">
                  {court.name}
                </h3>
                <p className="mt-1 text-sm font-bold text-[var(--ink-600)]">
                  {court.description}
                </p>
              </div>
              <span className="pill pill-available shrink-0">
                <span className="dot" />
                Activa
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--ink-700)]">
              <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-[var(--ink-50)] px-3 py-1.5 ring-1 ring-[var(--ink-200)]">
                <BadgeCheck size={14} className="text-[var(--court-600)]" />
                {court.courtType}
              </span>
              <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-[var(--ink-50)] px-3 py-1.5 ring-1 ring-[var(--ink-200)]">
                {court.isCovered ? (
                  <ShieldCheck size={14} className="text-[var(--court-600)]" />
                ) : (
                  <CheckCircle2 size={14} className="text-[var(--court-600)]" />
                )}
                {court.isCovered ? "Techada" : "Aire libre"}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
