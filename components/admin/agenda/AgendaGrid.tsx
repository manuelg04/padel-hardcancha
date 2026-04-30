import { getHourRows, minutesToTime } from "@/lib/dates";
import { formatCOP } from "@/lib/format";

import type { BookingDoc, CourtDoc, ModalDefaults } from "./types";

export function AgendaGrid({
  courts,
  bookings,
  openMinutes,
  closeMinutes,
  visibleBookingIds,
  localDate,
  onEmptySlot,
  onBooking,
}: {
  courts: CourtDoc[];
  bookings: BookingDoc[];
  openMinutes: number;
  closeMinutes: number;
  visibleBookingIds: Set<string>;
  localDate: string;
  onEmptySlot: (defaults: ModalDefaults) => void;
  onBooking: (booking: BookingDoc) => void;
}) {
  const rows = getHourRows(openMinutes, closeMinutes);

  return (
    <section className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
      <div
        className="grid min-w-[860px]"
        style={{
          gridTemplateColumns: `84px repeat(${courts.length}, minmax(160px, 1fr))`,
          gridAutoRows: "76px",
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-[var(--ink-200)] bg-[var(--ink-50)] p-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)]">
          Hora
        </div>
        {courts.map((court) => (
          <div
            key={court._id}
            className="border-b border-r border-[var(--ink-200)] bg-[var(--ink-50)] p-3"
          >
            <p className="font-black">{court.name}</p>
            <p className="text-xs text-[var(--ink-500)]">{court.description}</p>
          </div>
        ))}

        {rows.map((hour, rowIndex) => (
          <div
            key={hour}
            className="sticky left-0 z-10 border-b border-r border-[var(--ink-200)] bg-white p-3 text-sm font-black text-[var(--ink-500)]"
            style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
          >
            {minutesToTime(hour)}
          </div>
        ))}

        {courts.flatMap((court, courtIndex) =>
          rows.map((hour, rowIndex) => {
            const startsHere = bookings.find(
              (booking) =>
                booking.courtId === court._id && booking.startMinutes === hour,
            );
            const continuation = bookings.some(
              (booking) =>
                booking.courtId === court._id &&
                booking.startMinutes < hour &&
                booking.endMinutes > hour,
            );

            if (continuation) return null;

            if (startsHere) {
              const span = Math.max(1, startsHere.durationMinutes / 60);
              const visible = visibleBookingIds.has(startsHere._id);
              return (
                <button
                  key={`${court._id}-${hour}`}
                  className={`m-1 rounded-[var(--r-md)] border p-3 text-left transition hover:scale-[1.01] ${
                    startsHere.bookingStatus === "blocked"
                      ? "blocked-pattern border-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]"
                      : startsHere.paymentStatus === "paid"
                        ? "border-[var(--court-600)] bg-[var(--court-500)] text-white"
                        : "border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]"
                  } ${visible ? "" : "opacity-30"}`}
                  style={{
                    gridColumn: courtIndex + 2,
                    gridRow: `${rowIndex + 2} / span ${span}`,
                  }}
                  onClick={() => onBooking(startsHere)}
                >
                  <p className="truncate font-black">
                    {startsHere.bookingStatus === "blocked"
                      ? startsHere.internalNote || "Bloqueada"
                      : startsHere.customerName}
                  </p>
                  <p className="mt-1 text-xs font-bold opacity-80">
                    {startsHere.bookingStatus === "blocked"
                      ? "Bloqueo"
                      : `${formatCOP(startsHere.value)} Â· ${
                          startsHere.paymentStatus === "paid" ? "Pagada" : "Pendiente"
                        }`}
                  </p>
                </button>
              );
            }

            return (
              <button
                key={`${court._id}-${hour}`}
                className="m-1 rounded-[var(--r-md)] border border-[var(--ink-100)] bg-[var(--ink-50)] text-left text-xs font-bold text-[var(--ink-400)] hover:border-[var(--court-300)] hover:bg-[var(--court-50)] hover:text-[var(--court-700)]"
                style={{ gridColumn: courtIndex + 2, gridRow: rowIndex + 2 }}
                onClick={() =>
                  onEmptySlot({
                    courtId: court._id,
                    localDate,
                    startMinutes: hour,
                  })
                }
              >
                <span className="px-3">Disponible</span>
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
