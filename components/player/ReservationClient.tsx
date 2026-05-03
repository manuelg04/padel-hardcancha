"use client";

import { Check, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { reservationShareMessage, whatsappUrl } from "@/lib/whatsapp";
import { PlayerShell } from "./PlayerShell";

export function ReservationClient({ slug, code }: { slug: string; code: string }) {
  const result = useQuery(api.bookings.getBookingByCode, { code });

  if (result === undefined) {
    return <PlayerShell>Loading reservation...</PlayerShell>;
  }

  if (result === null) {
    return (
      <PlayerShell>
        <div className="min-h-full bg-[var(--paper)] px-5 py-8">
          <div className="mx-auto max-w-xl rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="mb-4 font-bold">No encontramos esta reserva.</p>
            <Link className="btn btn-primary" href={`/club/${slug}`}>
              Volver al club
            </Link>
          </div>
        </div>
      </PlayerShell>
    );
  }

  const { booking, court, clubName, clubWhatsapp } = result;
  const hour = minutesToRange(booking.startMinutes, booking.endMinutes);
  const message = reservationShareMessage({
    clubName,
    code: booking.code,
    date: formatDateLong(booking.localDate),
    hour,
    court: court.name,
    value: booking.value,
  });

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)] px-4 py-8 sm:px-6 md:px-8 md:py-12 lg:px-10">
        <div className="mx-auto w-full max-w-3xl text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--status-paid-bg)] text-[var(--court-700)]">
            <Check size={42} strokeWidth={2.8} />
          </div>
          <h1 className="text-display mt-6 text-3xl font-black md:text-5xl">
            ¡Reserva confirmada!
          </h1>
          <p className="mt-2 text-[var(--ink-500)]">Te esperamos en {clubName}.</p>

          <div className="my-7 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 text-left shadow-[var(--shadow-sm)] md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
                  Código
                </p>
                <p className="text-mono text-lg font-black">{booking.code}</p>
              </div>
              <span
                className={`pill ${
                  booking.paymentStatus === "paid" ? "pill-paid" : "pill-pending"
                }`}
              >
                <span className="dot" />
                {booking.paymentStatus === "paid" ? "Pagada" : "Pago pendiente"}
              </span>
            </div>
            <Detail label="Cancha" value={court.name} />
            <Detail label="Fecha" value={formatDateLong(booking.localDate)} />
            <Detail label="Hora" value={hour} />
            <Detail label="Cliente" value={booking.customerName ?? "Sin nombre"} />
            <Detail label="Valor" value={formatCOP(booking.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <a
              className="btn btn-primary btn-block"
              href={whatsappUrl(clubWhatsapp, message)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              Compartir por WhatsApp
            </a>
            <a
              className="btn btn-ghost btn-block"
              href={whatsappUrl(clubWhatsapp, `Hola, tengo una reserva ${booking.code}.`)}
              target="_blank"
              rel="noreferrer"
            >
              <Phone size={17} />
              Hablar con el club
            </a>
          </div>
        </div>
      </div>
    </PlayerShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}
