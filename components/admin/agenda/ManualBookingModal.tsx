"use client";

import { Check, Copy, CreditCard, MessageCircle, X } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { useState, type FormEvent } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calculateBookingValue } from "@/lib/bookingRules";
import { formatDateLong, minutesToInput, minutesToRange } from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { paymentLinkMessage, whatsappUrl } from "@/lib/whatsapp";

import type { CourtDoc, ModalDefaults, PaymentStatus } from "./types";

export function ManualBookingModal({
  defaults,
  courts,
  pricing,
  clubName,
  mercadoPagoStatus,
  onClose,
}: {
  defaults: ModalDefaults;
  courts: CourtDoc[];
  pricing: Doc<"clubs">["pricing"];
  clubName: string;
  mercadoPagoStatus: PaymentStatus;
  onClose: () => void;
}) {
  const createManualBooking = useMutation(api.bookings.createManualBooking);
  const createPaymentLink = useAction(api.payments.createManualBookingPaymentLink);
  const [courtId, setCourtId] = useState(defaults.courtId ?? courts[0]?._id);
  const [localDate, setLocalDate] = useState(defaults.localDate);
  const [startMinutes, setStartMinutes] = useState(defaults.startMinutes ?? 17 * 60);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [source, setSource] = useState<"manual" | "whatsapp" | "walk_in" | "phone">("whatsapp");
  const [internalNote, setInternalNote] = useState("");
  const [generatePaymentLink, setGeneratePaymentLink] = useState(false);
  const [generatedPayment, setGeneratedPayment] = useState<{
    checkoutUrl: string;
    bookingCode: string;
  } | null>(null);
  const [error, setError] = useState("");
  const value = calculateBookingValue(
    localDate,
    startMinutes,
    durationMinutes,
    pricing,
  );
  const selectedCourt = courts.find((court) => court._id === courtId);
  const canGeneratePaymentLink =
    mercadoPagoStatus?.onlinePaymentsEnabled &&
    mercadoPagoStatus.status === "connected";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!courtId || customerName.trim().length < 3 || customerPhone.trim().length < 7) {
      setError("Completa cancha, cliente y celular.");
      return;
    }

    try {
      if (generatePaymentLink) {
        if (!canGeneratePaymentLink) {
          setError("Conecta y activa Mercado Pago antes de generar el link.");
          return;
        }

        const payment = await createPaymentLink({
          courtId,
          localDate,
          startMinutes,
          durationMinutes,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          source,
          internalNote: internalNote || undefined,
        });
        setGeneratedPayment({
          checkoutUrl: payment.checkoutUrl,
          bookingCode: payment.bookingCode,
        });
        return;
      }

      await createManualBooking({
        courtId,
        localDate,
        startMinutes,
        durationMinutes,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        source,
        paymentMethod: paymentStatus === "paid" ? "cash" : "club",
        paymentStatus,
        internalNote: internalNote || undefined,
      });
      onClose();
    } catch (bookingError) {
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : "No pudimos crear la reserva.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <form
        className="w-full max-w-2xl rounded-[var(--r-lg)] bg-white p-5 shadow-[var(--shadow-pop)]"
        onSubmit={submit}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-display text-2xl font-black">Nueva reserva</h2>
            <p className="text-sm text-[var(--ink-500)]">
              Crea una reserva manual para recepciÃ³n o WhatsApp.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        {generatedPayment ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
            <p className="text-lg font-black">Link de pago listo</p>
            <p className="mt-1 text-sm text-[var(--ink-500)]">
              Reserva {generatedPayment.bookingCode}. Puedes copiarlo o enviarlo por
              WhatsApp.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                className="btn btn-ghost btn-block"
                type="button"
                onClick={() => void navigator.clipboard.writeText(generatedPayment.checkoutUrl)}
              >
                <Copy size={17} />
                Copiar link
              </button>
              <a
                className="btn btn-primary btn-block"
                href={whatsappUrl(
                  customerPhone,
                  paymentLinkMessage({
                    clubName,
                    customerName,
                    code: generatedPayment.bookingCode,
                    date: formatDateLong(localDate),
                    hour: minutesToRange(startMinutes, startMinutes + durationMinutes),
                    court: selectedCourt?.name ?? "Cancha",
                    value,
                    checkoutUrl: generatedPayment.checkoutUrl,
                  }),
                )}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} />
                Enviar por WhatsApp
              </a>
              <button className="btn btn-ghost btn-block" type="button" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="field">
              <label>Cancha</label>
              <select
                value={courtId}
                onChange={(event) => setCourtId(event.target.value as Id<"courts">)}
              >
                {courts.map((court) => (
                  <option key={court._id} value={court._id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha</label>
              <input
                type="date"
                value={localDate}
                onChange={(event) => setLocalDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Hora inicio</label>
              <input
                type="time"
                step={3600}
                value={minutesToInput(startMinutes)}
                onChange={(event) => {
                  const [hour, minute] = event.target.value.split(":").map(Number);
                  setStartMinutes(hour * 60 + minute);
                }}
              />
            </div>
            <div className="field">
              <label>DuraciÃ³n</label>
              <select
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
              >
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
            <div className="field">
              <label>Nombre del cliente</label>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Celular</label>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Email opcional</label>
              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Origen</label>
              <select
                value={source}
                onChange={(event) =>
                  setSource(
                    event.target.value as "manual" | "whatsapp" | "walk_in" | "phone",
                  )
                }
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
                <option value="walk_in">Presencial</option>
                <option value="phone">Telefono</option>
              </select>
            </div>
            <div className="field">
              <label>Valor</label>
              <input value={formatCOP(value)} readOnly />
            </div>
            <div className="field">
              <label>Estado de pago</label>
              <select
                value={paymentStatus}
                onChange={(event) =>
                  setPaymentStatus(event.target.value as "pending" | "paid")
                }
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
              </select>
            </div>
            <div className="field md:col-span-2">
              <label>Notas internas</label>
              <textarea
                rows={3}
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
              />
            </div>
            {canGeneratePaymentLink ? (
              <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--ink-200)] p-4 md:col-span-2">
                <input
                  type="checkbox"
                  checked={generatePaymentLink}
                  onChange={(event) => setGeneratePaymentLink(event.target.checked)}
                />
                <span>
                  <span className="block font-black">Generar link Mercado Pago</span>
                  <span className="text-sm text-[var(--ink-500)]">
                    La reserva queda confirmada y el pago queda pendiente.
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
            {error}
          </p>
        ) : null}

        {!generatedPayment ? (
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {generatePaymentLink ? <CreditCard size={17} /> : <Check size={17} />}
              {generatePaymentLink ? "Crear y generar link" : "Crear reserva"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
