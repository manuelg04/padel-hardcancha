"use client";

import { AlertCircle, Check, Home, List, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { normalizePublicBookingReceiptResponse } from "@/lib/securityRules";
import { reservationShareMessage, whatsappUrl } from "@/lib/whatsapp";
import { PlayerShell } from "./PlayerShell";

export function ReservationClient({
  slug,
  code,
  paymentStatusHint,
}: {
  slug: string;
  code: string;
  paymentStatusHint?: string;
}) {
  const result = useQuery(api.bookings.getBookingByCode, { code });

  if (result === undefined) {
    return <PlayerShell>Loading reservation...</PlayerShell>;
  }

  const receipt = normalizePublicBookingReceiptResponse(result);

  if (result === null || !receipt) {
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

  const hour = minutesToRange(receipt.startMinutes, receipt.endMinutes);
  const paymentMessage = getPaymentMessage(
    paymentStatusHint,
    receipt.depositStatus,
    receipt.bookingStatus,
  );
  const reservationStatusView = getReservationStatusView(
    receipt.bookingStatus,
    receipt.paymentStatus,
  );
  const showDepositDetails =
    (receipt.depositSuggestedAmount ?? 0) > 0 ||
    (receipt.depositPaidAmount ?? 0) > 0 ||
    receipt.paymentOptionSelected === "deposit_online" ||
    hasDepositWaiverSnapshot(receipt.membershipSnapshot);
  const message = reservationShareMessage({
    clubName: receipt.clubName,
    code: receipt.code,
    date: formatDateLong(receipt.localDate),
    hour,
    court: receipt.courtName,
    value: receipt.value,
  });

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)] px-4 py-8 sm:px-6 md:px-8 md:py-12 lg:px-10">
        <div className="mx-auto w-full max-w-3xl text-center">
          <div
            className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${reservationStatusView.iconClassName}`}
          >
            {reservationStatusView.icon === "check" ? (
              <Check size={42} strokeWidth={2.8} />
            ) : (
              <AlertCircle size={42} strokeWidth={2.8} />
            )}
          </div>
          <h1 className="text-display mt-6 text-3xl font-black md:text-5xl">
            {reservationStatusView.title}
          </h1>
          <p className="mt-2 text-[var(--ink-500)]">
            {reservationStatusView.description(receipt.clubName)}
          </p>

          {paymentMessage ? (
            <div className="mx-auto mt-5 max-w-xl rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 text-sm font-bold text-[var(--ink-700)] shadow-[var(--shadow-sm)]">
              {paymentMessage}
            </div>
          ) : null}

          <div className="my-7 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 text-left shadow-[var(--shadow-sm)] md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
                  Código
                </p>
                <p className="text-mono text-lg font-black">{receipt.code}</p>
              </div>
              <span className={`pill ${reservationStatusView.badgeClassName}`}>
                <span className="dot" />
                {reservationStatusView.badge}
              </span>
            </div>
            <Detail label="Cancha" value={receipt.courtName} />
            <Detail label="Fecha" value={formatDateLong(receipt.localDate)} />
            <Detail label="Hora" value={hour} />
            <Detail label="Valor" value={formatCOP(receipt.value)} />
            {showDepositDetails ? (
              <>
                {receipt.estimatedMembershipDiscount ? (
                  <Detail
                    label="Descuento estimado"
                    value={`-${formatCOP(receipt.estimatedMembershipDiscount)}`}
                  />
                ) : null}
                <Detail
                  label="Anticipo sugerido"
                  value={formatCOP(receipt.depositSuggestedAmount ?? 0)}
                />
                <Detail
                  label="Anticipo pagado"
                  value={formatCOP(receipt.depositPaidAmount ?? 0)}
                />
                <Detail
                  label="Saldo estimado"
                  value={formatCOP(
                    receipt.estimatedBalanceDue ??
                      receipt.estimatedTotal ??
                      receipt.value,
                  )}
                />
                <Detail
                  label="Estado anticipo"
                  value={depositStatusLabel(
                    receipt.depositStatus,
                    hasDepositWaiverSnapshot(receipt.membershipSnapshot),
                  )}
                />
              </>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="btn btn-primary btn-block" href={`/club/${slug}`}>
              <Home size={17} />
              Volver al club
            </Link>
            <Link className="btn btn-ghost btn-block" href="/clubes">
              <List size={17} />
              Ver todos los clubes
            </Link>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              className="btn btn-ghost btn-block"
              href={whatsappUrl(receipt.clubWhatsapp, message)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              Compartir por WhatsApp
            </a>
            <a
              className="btn btn-ghost btn-block"
              href={whatsappUrl(
                receipt.clubWhatsapp,
                `Hola, tengo una reserva ${receipt.code}.`,
              )}
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

function getReservationStatusView(bookingStatus?: string, paymentStatus?: string) {
  if (bookingStatus === "confirmed") {
    return {
      icon: "check" as const,
      iconClassName: "bg-[var(--status-paid-bg)] text-[var(--court-700)]",
      title: "¡Reserva confirmada!",
      description: (clubName: string) => `Te esperamos en ${clubName}.`,
      badge: "Confirmada",
      badgeClassName: "pill-paid",
    };
  }

  if (
    bookingStatus === "expired" ||
    paymentStatus === "failed" ||
    paymentStatus === "expired"
  ) {
    return {
      icon: "alert" as const,
      iconClassName:
        "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]",
      title: "Pago no confirmado",
      description: () => "La reserva no queda confirmada sin pago aprobado.",
      badge: "No confirmada",
      badgeClassName:
        "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]",
    };
  }

  return {
    icon: "alert" as const,
    iconClassName: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
    title: "Pago en proceso",
    description: () =>
      "La reserva se confirma cuando Mercado Pago apruebe el pago.",
    badge: "Pago pendiente",
    badgeClassName: "bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]",
  };
}

function getPaymentMessage(
  payment: string | undefined,
  depositStatus?: string,
  bookingStatus?: string,
) {
  if (payment === "success") {
    return depositStatus === "paid" || bookingStatus === "confirmed"
      ? "Pago online recibido."
      : "Estamos confirmando tu pago online.";
  }

  if (payment === "pending") {
    return "Tu pago esta pendiente. La reserva se confirmara cuando Mercado Pago lo apruebe.";
  }

  if (payment === "failure") {
    return "El pago online no se completo. La reserva no queda confirmada.";
  }

  return "";
}

function depositStatusLabel(status: string | undefined, waived: boolean) {
  if (waived) return "Membresia: sin anticipo";
  if (status === "paid") return "Pagado";
  if (status === "pending") return "Pendiente";
  if (status === "failed") return "Fallido";
  if (status === "refunded") return "Reintegrado";

  return "Sin anticipo";
}

function hasDepositWaiverSnapshot(snapshot: unknown) {
  if (snapshot === null || typeof snapshot !== "object") return false;

  return (
    "waivesDeposit" in snapshot &&
    Boolean((snapshot as { waivesDeposit?: unknown }).waivesDeposit)
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
