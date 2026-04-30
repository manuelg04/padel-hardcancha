"use client";

import { CalendarDays, Tag } from "lucide-react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP } from "@/lib/format";

export function MyBookingsClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const bookings = useQuery(
    api.bookings.listMyBookings,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading || !isAuthenticated || bookings === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--ink-100)]">
        <p className="font-bold text-[var(--ink-500)]">Cargando reservas...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--ink-100)]">
      <section className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Jugador
            </p>
            <h1 className="text-display text-4xl font-black">Mis reservas</h1>
            <p className="mt-1 text-[var(--ink-500)]">
              Tus reservas online quedan guardadas en tu cuenta.
            </p>
          </div>
          <Link className="btn btn-primary" href="/clubes">
            Ver clubes
          </Link>
        </header>

        {bookings.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
            <h2 className="text-display text-3xl font-black">
              Todavia no tienes reservas.
            </h2>
            <p className="mt-2 text-[var(--ink-500)]">
              Explora clubes y reserva tu proxima cancha.
            </p>
            <Link className="btn btn-primary mt-5" href="/clubes">
              Ver clubes
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {bookings.map(({ booking, clubName, courtName }) => (
              <article
                key={booking._id}
                className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="pill pill-available">
                        <span className="dot" />
                        {booking.bookingStatus === "confirmed"
                          ? "Confirmada"
                          : booking.bookingStatus}
                      </span>
                      <span
                        className={`pill ${
                          booking.paymentStatus === "paid"
                            ? "pill-paid"
                            : "pill-pending"
                        }`}
                      >
                        <span className="dot" />
                        {booking.paymentStatus === "paid"
                          ? "Pagada"
                          : "Pago pendiente"}
                      </span>
                    </div>
                    <h2 className="text-xl font-black">{clubName}</h2>
                    <p className="text-[var(--ink-500)]">{courtName}</p>
                  </div>
                  <div className="grid gap-2 text-sm md:min-w-72">
                    <Detail
                      icon={<CalendarDays size={16} />}
                      value={`${formatDateLong(booking.localDate)} · ${minutesToRange(
                        booking.startMinutes,
                        booking.endMinutes,
                      )}`}
                    />
                    <Detail icon={<Tag size={16} />} value={booking.code} />
                    <p className="text-right text-xl font-black md:text-left">
                      {formatCOP(booking.value)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Detail({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 font-bold text-[var(--ink-600)]">
      {icon}
      <span>{value}</span>
    </div>
  );
}
