import { BadgeCheck } from "lucide-react";

import type { Doc } from "@/convex/_generated/dataModel";

export function ClubCourtsList({ courts }: { courts: Doc<"courts">[] }) {
  if (courts.length === 0) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 text-[var(--ink-500)]">
        Este club todavia no tiene canchas activas publicadas.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {courts.map((court) => (
        <article
          key={court._id}
          className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-black">{court.name}</h3>
            <span className="pill pill-available">
              <span className="dot" />
              Activa
            </span>
          </div>
          <p className="text-sm font-bold text-[var(--ink-700)]">
            {court.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[var(--ink-600)]">
            <span className="inline-flex items-center gap-1 rounded-[var(--r-pill)] bg-[var(--ink-50)] px-3 py-1">
              <BadgeCheck size={14} />
              {court.courtType}
            </span>
            <span className="rounded-[var(--r-pill)] bg-[var(--ink-50)] px-3 py-1">
              {court.isCovered ? "Techada" : "No techada"}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
