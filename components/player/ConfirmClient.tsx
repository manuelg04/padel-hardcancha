"use client";

import { ArrowLeft, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP, onlyDigits } from "@/lib/format";
import { PlayerShell } from "./PlayerShell";

export function ConfirmClient({
  slug,
  courtId,
  localDate,
  startMinutes,
  durationMinutes,
}: {
  slug: string;
  courtId: string;
  localDate: string;
  startMinutes: number;
  durationMinutes: number;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "mercadopago" | "club" | "transfer"
  >("club");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
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
  const paymentOptions = useQuery(
    api.payments.getClubMercadoPagoPublicStatus,
    isAuthenticated ? { clubSlug: slug } : "skip",
  );
  const createBooking = useMutation(api.bookings.createOnlineBooking);
  const createCheckout = useAction(api.payments.createOnlineBookingCheckout);

  const selectedSlot = useMemo(
    () =>
      availability?.slots.find(
        (slot) => slot.courtId === courtId && slot.startMinutes === startMinutes,
      ),
    [availability, courtId, startMinutes],
  );

  const effectiveName = name ?? currentUser?.name ?? "";
  const effectivePhone = phone ?? currentUser?.phone ?? "";
  const effectiveEmail = email ?? currentUser?.email ?? "";
  const emailValid =
    !effectiveEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail);
  const phoneValid = onlyDigits(effectivePhone).length >= 10;
  const formValid = effectiveName.trim().length > 2 && phoneValid && emailValid;
  const mercadoPagoAvailable =
    paymentOptions?.onlinePaymentsEnabled && paymentOptions.connected;
  const offlineAllowed = !paymentOptions?.onlinePaymentRequired;
  const selectedPaymentMethod = paymentOptions?.onlinePaymentRequired
    ? "mercadopago"
    : paymentMethod;
  const canSubmit =
    formValid &&
    (selectedPaymentMethod === "mercadopago"
      ? Boolean(mercadoPagoAvailable)
      : offlineAllowed);

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formValid) {
      setError("Revisa nombre, celular y email antes de confirmar.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedPaymentMethod === "mercadopago") {
        const result = await createCheckout({
          clubSlug: slug,
          courtId: courtId as Id<"courts">,
          localDate,
          startMinutes,
          durationMinutes,
          customerName: effectiveName,
          customerPhone: effectivePhone,
          customerEmail: effectiveEmail || undefined,
        });
        window.location.assign(result.checkoutUrl);
        return;
      }

      const result = await createBooking({
        clubSlug: slug,
        courtId: courtId as Id<"courts">,
        localDate,
        startMinutes,
        durationMinutes,
        customerName: effectiveName,
        customerPhone: effectivePhone,
        customerEmail: effectiveEmail || undefined,
        paymentMethod: selectedPaymentMethod,
      });
      router.push(`/club/${slug}/reserva/${result.code}`);
    } catch (bookingError) {
      setError(
        bookingError instanceof Error
          ? bookingError.message
          : "No pudimos crear la reserva.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    isLoading ||
    !isAuthenticated ||
    club === undefined ||
    availability === undefined ||
    paymentOptions === undefined
  ) {
    return <PlayerShell>Loading reservation...</PlayerShell>;
  }

  if (club === null || !selectedSlot) {
    return (
      <PlayerShell>
        <div className="p-6">
          <p className="mb-4 font-bold">No encontramos este horario.</p>
          <Link className="btn btn-primary" href={`/club/${slug}/reservar`}>
            Volver a horarios
          </Link>
        </div>
      </PlayerShell>
    );
  }

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)] px-5 pb-8 pt-6 md:pt-10">
        <header className="mb-5 flex items-center gap-3">
          <Link href={`/club/${slug}/reservar`} className="btn-icon" aria-label="Volver">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
              Paso 2 de 2
            </p>
            <h1 className="text-display text-3xl font-black">Confirma tu reserva</h1>
          </div>
        </header>

        <div className="mb-5 rounded-[var(--r-lg)] bg-[var(--court-800)] p-4 text-white">
          <p className="font-black">{selectedSlot.courtName}</p>
          <p className="text-sm text-white/78">
            {minutesToRange(selectedSlot.startMinutes, selectedSlot.endMinutes)}
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
            <span className="text-xs uppercase tracking-[0.16em] text-white/60">
              Total
            </span>
            <span className="text-xl font-black">{formatCOP(selectedSlot.value)}</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submitBooking}>
          <div className="field">
            <label htmlFor="name">Nombre completo</label>
            <input
              id="name"
              value={effectiveName}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Celular</label>
            <input
              id="phone"
              inputMode="tel"
              value={effectivePhone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email opcional</label>
            <input
              id="email"
              inputMode="email"
              value={effectiveEmail}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
              Método de pago
            </p>
            <div className="grid gap-2">
              {[
                ...(mercadoPagoAvailable
                  ? [
                      [
                        "mercadopago",
                        "Mercado Pago",
                        "Paga online. El dinero llega directamente al club.",
                      ],
                    ]
                  : []),
                ...(offlineAllowed
                  ? [
                      ["club", "Pago en club", "Paga en recepcion al llegar."],
                      ["transfer", "Transferencia", "Coordina el soporte con el club."],
                    ]
                  : []),
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  className={`flex items-center gap-3 rounded-[var(--r-md)] border px-3 py-3 text-left text-sm font-black ${
                    selectedPaymentMethod === value
                      ? "border-[var(--court-500)] bg-[var(--court-50)] text-[var(--court-700)]"
                      : "border-[var(--ink-200)] bg-white"
                  }`}
                  onClick={() =>
                    setPaymentMethod(value as "mercadopago" | "club" | "transfer")
                  }
                >
                  {value === "mercadopago" ? <CreditCard size={18} /> : null}
                  <span>
                    <span className="block">{label}</span>
                    <span className="block text-xs font-bold opacity-70">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {paymentOptions.onlinePaymentRequired && !mercadoPagoAvailable ? (
              <p className="mt-2 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
                Este club requiere pago online, pero Mercado Pago no esta conectado.
              </p>
            ) : null}
          </div>

          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Resumen
            </p>
            <SummaryRow label="Fecha" value={formatDateLong(localDate)} />
            <SummaryRow
              label="Hora"
              value={minutesToRange(selectedSlot.startMinutes, selectedSlot.endMinutes)}
            />
            <SummaryRow label="Duración" value={`${durationMinutes / 60} hora(s)`} />
            <SummaryRow label="Total" value={formatCOP(selectedSlot.value)} />
          </div>

          {error ? (
            <p className="rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!canSubmit || isSubmitting}
          >
            <Check size={17} />
            {isSubmitting
              ? selectedPaymentMethod === "mercadopago"
                ? "Preparando pago..."
                : "Confirmando..."
              : selectedPaymentMethod === "mercadopago"
                ? "Ir a pagar"
                : "Confirmar reserva"}
          </button>
        </form>
      </div>
    </PlayerShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
