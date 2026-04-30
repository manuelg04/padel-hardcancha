"use client";

import {
  CircleDollarSign,
  Copy,
  MessageCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP, initials } from "@/lib/format";
import { paymentLinkMessage, whatsappUrl } from "@/lib/whatsapp";

import {
  bookingStatusLabel,
  paymentStatusLabel,
  sourceLabel,
} from "../agendaRules";
import type { BookingDoc, CourtDoc, PaymentStatus } from "./types";

export function BookingDetailDrawer({
  booking,
  court,
  clubName,
  mercadoPagoStatus,
  onClose,
}: {
  booking: BookingDoc;
  court?: CourtDoc;
  clubName: string;
  mercadoPagoStatus: PaymentStatus;
  onClose: () => void;
}) {
  const markPaid = useMutation(api.bookings.markBookingPaid);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const updateNote = useMutation(api.bookings.updateBookingNote);
  const payment = useQuery(api.payments.getBookingPaymentDetails, {
    bookingId: booking._id,
  });
  const retryPayment = useAction(api.payments.retryBookingPayment);
  const [note, setNote] = useState(booking.internalNote ?? "");
  const [freshPaymentLink, setFreshPaymentLink] = useState("");
  const [error, setError] = useState("");
  const checkoutUrl =
    freshPaymentLink || payment?.checkoutUrl || booking.paymentCheckoutUrl || "";
  const canGeneratePaymentLink =
    mercadoPagoStatus?.onlinePaymentsEnabled &&
    mercadoPagoStatus.status === "connected";

  async function runAction(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "No pudimos actualizar.",
      );
    }
  }

  async function regeneratePaymentLink() {
    if (!canGeneratePaymentLink) {
      setError("Conecta y activa Mercado Pago antes de generar links de pago.");
      return;
    }

    await runAction(async () => {
      const result = await retryPayment({ bookingId: booking._id });
      setFreshPaymentLink(result.checkoutUrl);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-[var(--shadow-pop)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-display text-2xl font-black">
              Reserva {booking.code}
            </h2>
            <p className="text-sm text-[var(--ink-500)]">
              {court?.name ?? "Cancha"} Â·{" "}
              {minutesToRange(booking.startMinutes, booking.endMinutes)}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-[var(--r-lg)] bg-[var(--ink-50)] p-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--court-100)] font-black text-[var(--court-800)]">
            {initials(booking.customerName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">
              {booking.customerName ?? booking.internalNote ?? "Bloqueo"}
            </p>
            <p className="truncate text-sm text-[var(--ink-500)]">
              {booking.customerPhone ?? "Sin celular"}
              {booking.customerEmail ? ` Â· ${booking.customerEmail}` : ""}
            </p>
          </div>
          <StatusBadge booking={booking} />
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
          <Detail label="Cancha" value={court?.name ?? "Cancha"} />
          <Detail label="Fecha" value={formatDateLong(booking.localDate)} />
          <Detail
            label="Hora"
            value={minutesToRange(booking.startMinutes, booking.endMinutes)}
          />
          <Detail label="Valor" value={formatCOP(booking.value)} />
          <Detail label="Origen" value={sourceLabel(booking.source)} />
          <Detail label="Reserva" value={bookingStatusLabel(booking.bookingStatus)} />
          <Detail label="Pago" value={paymentStatusLabel(booking.paymentStatus)} />
          <Detail
            label="Proveedor"
            value={booking.paymentProvider === "mercadopago" ? "Mercado Pago" : "Manual"}
          />
          <Detail
            label="ID Mercado Pago"
            value={payment?.providerPaymentId ?? "No disponible"}
          />
          <Detail
            label="Fecha de pago"
            value={booking.paidAt ? formatDateTime(booking.paidAt) : "No disponible"}
          />
          <Detail label="Creada" value={formatDateTime(booking.createdAt)} />
        </div>

        {checkoutUrl ? (
          <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
            <p className="text-sm font-black">Link de pago</p>
            <p className="text-mono mt-1 truncate text-xs text-[var(--ink-500)]">
              {checkoutUrl}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => void navigator.clipboard.writeText(checkoutUrl)}
              >
                <Copy size={16} />
                Copiar
              </button>
              {booking.customerPhone ? (
                <a
                  className="btn btn-ghost"
                  href={whatsappUrl(
                    booking.customerPhone,
                    paymentLinkMessage({
                      clubName,
                      customerName: booking.customerName ?? "",
                      code: booking.code,
                      date: formatDateLong(booking.localDate),
                      hour: minutesToRange(booking.startMinutes, booking.endMinutes),
                      court: court?.name ?? "Cancha",
                      value: booking.value,
                      checkoutUrl,
                    }),
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={16} />
                  Enviar
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="field mt-5">
          <label>Nota interna</label>
          <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        {error ? (
          <p className="mt-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2">
          {booking.bookingStatus !== "blocked" ? (
            <button
              className="btn btn-primary btn-block"
              disabled={
                booking.paymentStatus === "paid" ||
                booking.paymentProvider === "mercadopago"
              }
              onClick={() => runAction(() => markPaid({ bookingId: booking._id }))}
            >
              <CircleDollarSign size={17} />
              Marcar pagada
            </button>
          ) : null}
          {canGeneratePaymentLink &&
          booking.bookingStatus !== "blocked" &&
          booking.paymentStatus !== "paid" ? (
            <button
              className="btn btn-ghost btn-block"
              onClick={() => void regeneratePaymentLink()}
            >
              <RotateCcw size={17} />
              {checkoutUrl ? "Reintentar pago" : "Generar link de pago"}
            </button>
          ) : null}
          <button
            className="btn btn-ghost btn-block"
            onClick={() =>
              runAction(() =>
                updateNote({ bookingId: booking._id, internalNote: note }),
              )
            }
          >
            Guardar nota
          </button>
          {booking.customerPhone ? (
            <a
              className="btn btn-ghost btn-block"
              href={whatsappUrl(
                booking.customerPhone,
                `Hola ${booking.customerName ?? ""}, te escribimos de ${clubName} sobre tu reserva ${booking.code}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={17} />
              WhatsApp
            </a>
          ) : null}
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              if (window.confirm("Â¿Cancelar esta reserva?")) {
                runAction(() =>
                  cancelBooking({
                    bookingId: booking._id,
                    cancelReason: "Cancelada desde agenda",
                  }),
                );
                onClose();
              }
            }}
          >
            Cancelar
          </button>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}

function StatusBadge({ booking }: { booking: BookingDoc }) {
  if (booking.bookingStatus === "blocked") {
    return (
      <span className="pill pill-blocked">
        <span className="dot" />
        Bloqueada
      </span>
    );
  }

  return (
    <span className={`pill ${booking.paymentStatus === "paid" ? "pill-paid" : "pill-pending"}`}>
      <span className="dot" />
      {booking.paymentStatus === "paid" ? "Pagada" : "Pendiente"}
    </span>
  );
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
