"use client";

import {
  AlertCircle,
  Check,
  Clock,
  MessageCircle,
  Phone,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { reservationShareMessage, whatsappUrl } from "@/lib/whatsapp";
import { PlayerShell } from "./PlayerShell";

export function ReservationClient({ slug, code }: { slug: string; code: string }) {
  const result = useQuery(api.bookings.getBookingByCode, { code });
  const retryPayment = useAction(api.payments.retryBookingPayment);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  if (result === undefined) {
    return <PlayerShell>Loading reservation...</PlayerShell>;
  }

  if (result === null) {
    return (
      <PlayerShell>
        <div className="p-6">
          <p className="mb-4 font-bold">No encontramos esta reserva.</p>
          <Link className="btn btn-primary" href={`/club/${slug}`}>
            Volver al club
          </Link>
        </div>
      </PlayerShell>
    );
  }

  const { booking, court, clubName, clubWhatsapp } = result;
  const hour = minutesToRange(booking.startMinutes, booking.endMinutes);
  const status = reservationStatus(booking);
  const message = reservationShareMessage({
    clubName,
    code: booking.code,
    date: formatDateLong(booking.localDate),
    hour,
    court: court.name,
    value: booking.value,
  });

  async function retry() {
    setRetryError("");
    setRetrying(true);

    try {
      const payment = await retryPayment({ bookingId: booking._id });
      window.location.assign(payment.checkoutUrl);
    } catch (error) {
      setRetryError(
        error instanceof Error
          ? error.message
          : "No pudimos generar un nuevo link de pago.",
      );
      setRetrying(false);
    }
  }

  return (
    <PlayerShell>
      <div className="flex min-h-full flex-col bg-[var(--paper)] px-5 pb-8 pt-10 text-center md:pt-16">
        <div
          className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${status.iconBg} ${status.iconFg}`}
        >
          {status.kind === "paid" ? (
            <Check size={42} strokeWidth={2.8} />
          ) : status.kind === "pending" ? (
            <Clock size={40} strokeWidth={2.6} />
          ) : (
            <AlertCircle size={40} strokeWidth={2.6} />
          )}
        </div>
        <h1 className="text-display mt-6 text-3xl font-black">{status.title}</h1>
        <p className="mt-1 text-[var(--ink-500)]">{status.description}</p>

        <div className="my-6 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 text-left">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Codigo
              </p>
              <p className="text-mono text-lg font-black">{booking.code}</p>
            </div>
            <span className={`pill ${status.pillClass}`}>
              <span className="dot" />
              {status.badge}
            </span>
          </div>
          <Detail label="Cancha" value={court.name} />
          <Detail label="Fecha" value={formatDateLong(booking.localDate)} />
          <Detail label="Hora" value={hour} />
          <Detail label="Cliente" value={booking.customerName ?? "Sin nombre"} />
          <Detail label="Valor" value={formatCOP(booking.value)} />
        </div>

        {retryError ? (
          <p className="mb-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
            {retryError}
          </p>
        ) : null}

        <div className="mt-auto space-y-3">
          {status.canRetry ? (
            <button
              className="btn btn-primary btn-block"
              type="button"
              disabled={retrying}
              onClick={() => void retry()}
            >
              <RotateCcw size={17} />
              {retrying ? "Preparando pago..." : "Reintentar pago"}
            </button>
          ) : null}
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
    </PlayerShell>
  );
}

function reservationStatus(booking: {
  paymentStatus: string;
  bookingStatus: string;
  paymentProvider?: string;
}) {
  if (booking.paymentStatus === "paid") {
    return {
      kind: "paid",
      title: "Reserva confirmada y pagada",
      description: "Te esperamos en la cancha.",
      badge: "Pagada",
      pillClass: "pill-paid",
      iconBg: "bg-[var(--status-paid-bg)]",
      iconFg: "text-[var(--court-700)]",
      canRetry: false,
    };
  }

  if (booking.bookingStatus === "expired" || booking.paymentStatus === "expired") {
    return {
      kind: "failed",
      title: "Pago vencido",
      description: "El tiempo para pagar vencio y el horario fue liberado.",
      badge: "Vencida",
      pillClass: "pill-cancelled",
      iconBg: "bg-[var(--status-cancelled-bg)]",
      iconFg: "text-[var(--status-cancelled-fg)]",
      canRetry: booking.paymentProvider === "mercadopago",
    };
  }

  if (booking.paymentStatus === "failed") {
    return {
      kind: "failed",
      title: "Pago rechazado",
      description: "El pago no fue aprobado. Puedes intentar nuevamente.",
      badge: "Rechazada",
      pillClass: "pill-cancelled",
      iconBg: "bg-[var(--status-cancelled-bg)]",
      iconFg: "text-[var(--status-cancelled-fg)]",
      canRetry: booking.paymentProvider === "mercadopago",
    };
  }

  return {
    kind: "pending",
    title:
      booking.paymentProvider === "mercadopago"
        ? "Estamos confirmando tu pago"
        : "Reserva confirmada",
    description:
      booking.paymentProvider === "mercadopago"
        ? "Mercado Pago nos avisara cuando el pago quede aprobado."
        : "Te esperamos en el club para completar el pago.",
    badge: "Pago pendiente",
    pillClass: "pill-pending",
    iconBg: "bg-[var(--status-pending-bg)]",
    iconFg: "text-[var(--status-pending-fg)]",
    canRetry: booking.paymentProvider === "mercadopago",
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
