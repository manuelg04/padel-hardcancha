"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { addDays, formatDateShort, minutesToRange, todayBogota } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { PlayerShell } from "./PlayerShell";

export function ReserveClient({ slug }: { slug: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [localDate, setLocalDate] = useState(todayBogota);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const club = useQuery(api.clubs.getClubBySlug, isAuthenticated ? { slug } : "skip");
  const availability = useQuery(
    api.bookings.getAvailability,
    isAuthenticated
      ? {
          clubSlug: slug,
          localDate,
          durationMinutes,
        }
      : "skip",
  );

  const dateOptions = useMemo(
    () =>
      [0, 1, 2, 3].map((offset) => {
        const date = addDays(todayBogota(), offset);
        return {
          date,
          label: offset === 0 ? "Hoy" : offset === 1 ? "Mañana" : formatDateShort(date),
        };
      }),
    [],
  );

  if (isLoading || !isAuthenticated || club === undefined || availability === undefined) {
    return <PlayerShell>Loading availability...</PlayerShell>;
  }

  if (club === null) {
    return <PlayerShell>Club no encontrado.</PlayerShell>;
  }

  const slotsByCourt = availability.courts.map((court) => ({
    court,
    slots: availability.slots.filter((slot) => slot.courtId === court._id),
  }));

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)] px-5 pb-8 pt-6 md:pt-10">
        <header className="mb-6 flex items-center gap-3">
          <Link href={`/club/${slug}`} className="btn-icon" aria-label="Volver">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
              Paso 1 de 2
            </p>
            <h1 className="text-display text-3xl font-black">Elige fecha y hora</h1>
          </div>
        </header>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {dateOptions.map((option) => (
            <button
              key={option.date}
              className={`rounded-[var(--r-pill)] border px-3 py-2 text-xs font-black ${
                option.date === localDate
                  ? "border-[var(--court-600)] bg-[var(--court-500)] text-white"
                  : "border-[var(--ink-200)] bg-white text-[var(--ink-700)]"
              }`}
              onClick={() => setLocalDate(option.date)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mb-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-2">
          <p className="mb-2 px-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
            Duración
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[60, 120].map((duration) => (
              <button
                key={duration}
                className={`rounded-[var(--r-md)] px-3 py-2 text-sm font-black ${
                  durationMinutes === duration
                    ? "bg-white text-[var(--court-700)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--ink-600)]"
                }`}
                onClick={() => setDurationMinutes(duration)}
              >
                {duration / 60} hora{duration > 60 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>

        {!availability.isOpen ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] p-5 text-center">
            <p className="font-bold">El club no abre esta fecha.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {slotsByCourt.map(({ court, slots }) => (
              <section key={court._id}>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <h2 className="font-black">{court.name}</h2>
                    <p className="text-xs text-[var(--ink-500)]">{court.description}</p>
                  </div>
                  <span className="pill pill-available">
                    <span className="dot" />
                    Activa
                  </span>
                </div>
                <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white">
                  {slots.map((slot) => (
                    <Link
                      key={`${slot.courtId}-${slot.startMinutes}`}
                      aria-disabled={!slot.isAvailable}
                      className={`flex items-center justify-between border-b border-[var(--ink-100)] px-4 py-3 last:border-0 ${
                        slot.isAvailable
                          ? "hover:bg-[var(--court-50)]"
                          : "pointer-events-none bg-[var(--ink-50)] text-[var(--ink-400)]"
                      }`}
                      href={
                        slot.isAvailable
                          ? `/club/${slug}/confirmar?courtId=${slot.courtId}&date=${localDate}&startMinutes=${slot.startMinutes}&durationMinutes=${durationMinutes}`
                          : "#"
                      }
                    >
                      <div>
                        <p className="font-black">
                          {minutesToRange(slot.startMinutes, slot.endMinutes)}
                        </p>
                        {!slot.isAvailable ? (
                          <p className="text-xs font-bold">
                            {slot.bookingStatus === "blocked"
                              ? "Bloqueada"
                              : "Ocupada"}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black">{formatCOP(slot.value)}</span>
                        {slot.isAvailable ? <ChevronRight size={18} /> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PlayerShell>
  );
}
