"use client";

import { AlertCircle, ArrowLeft, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDateLong, minutesToRange } from "@/lib/dates";
import { formatCOP, onlyDigits } from "@/lib/format";
import { getPlayerBookingError } from "@/lib/playerBookingErrors";
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
  const [paymentMethod, setPaymentMethod] = useState<"club" | "transfer">("club");
  const [error, setError] = useState("");
  const [canReturnToAvailability, setCanReturnToAvailability] = useState(false);
  const [submittingOption, setSubmittingOption] = useState<
    "pay_at_club" | "deposit_online" | null
  >(null);
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
  const createBooking = useMutation(api.bookings.createOnlineBooking);
  const createDepositBooking = useAction(api.payments.createOnlineDepositBooking);

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
  const selectedSlotUnavailable = selectedSlot ? !selectedSlot.isAvailable : false;
  const availabilityHref = `/club/${slug}/reservar?date=${localDate}&durationMinutes=${durationMinutes}`;
  const showAvailabilityAction = selectedSlotUnavailable || canReturnToAvailability;
  const durationLabel = `${durationMinutes / 60} hora${
    durationMinutes > 60 ? "s" : ""
  }`;
  const depositPreview = useQuery(
    api.payments.getOnlineDepositPreview,
    isAuthenticated && courtId && localDate
      ? {
          clubSlug: slug,
          courtId: courtId as Id<"courts">,
          localDate,
          startMinutes,
          durationMinutes,
          customerPhone: effectivePhone || undefined,
        }
      : "skip",
  );
  const hasDepositWaiver = Boolean(
    depositPreview?.onlineDepositsEnabled && depositPreview.playerHasDepositWaiver,
  );
  const showDepositChoice = Boolean(
    depositPreview?.onlineDepositsEnabled &&
      !depositPreview.playerHasDepositWaiver &&
      depositPreview.depositSuggestedAmount > 0,
  );
  const depositBalanceDue =
    depositPreview && depositPreview.depositSuggestedAmount > 0
      ? Math.max(
          depositPreview.estimatedTotal - depositPreview.depositSuggestedAmount,
          0,
        )
      : 0;

  async function submitBooking(option: "pay_at_club" | "deposit_online") {
    setError("");
    setCanReturnToAvailability(false);

    if (selectedSlotUnavailable) {
      const bookingFailure = getPlayerBookingError({
        data: { code: "SLOT_TAKEN" },
      });
      setError(bookingFailure.message);
      setCanReturnToAvailability(true);
      return;
    }

    if (!formValid) {
      setError("Revisa nombre, celular y email antes de confirmar.");
      return;
    }

    try {
      setSubmittingOption(option);
      if (option === "deposit_online") {
        const result = await createDepositBooking({
          clubSlug: slug,
          courtId: courtId as Id<"courts">,
          localDate,
          startMinutes,
          durationMinutes,
          customerName: effectiveName,
          customerPhone: effectivePhone,
          customerEmail: effectiveEmail || undefined,
        });

        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
          return;
        }

        router.push(`/club/${slug}/reserva/${result.code}?payment=failure`);
        return;
      } else {
        const result = await createBooking({
          clubSlug: slug,
          courtId: courtId as Id<"courts">,
          localDate,
          startMinutes,
          durationMinutes,
          customerName: effectiveName,
          customerPhone: effectivePhone,
          customerEmail: effectiveEmail || undefined,
          paymentMethod,
        });
        router.push(`/club/${slug}/reserva/${result.code}`);
      }
    } catch (bookingError) {
      const bookingFailure = getPlayerBookingError(bookingError);
      setError(bookingFailure.message);
      setCanReturnToAvailability(bookingFailure.canReturnToAvailability);
    } finally {
      setSubmittingOption(null);
    }
  }

  function submitPayAtClub(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitBooking("pay_at_club");
  }

  if (isLoading || !isAuthenticated || club === undefined || availability === undefined) {
    return <PlayerShell>Loading reservation...</PlayerShell>;
  }

  if (club === null || !selectedSlot) {
    return (
      <PlayerShell>
        <div className="min-h-full bg-[var(--paper)] px-5 py-8">
          <div className="mx-auto max-w-xl rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="mb-4 font-bold">No encontramos este horario.</p>
            <Link className="btn btn-primary" href={availabilityHref}>
              Volver a horarios
            </Link>
          </div>
        </div>
      </PlayerShell>
    );
  }

  return (
    <PlayerShell>
      <div className="min-h-full bg-[var(--paper)] px-4 pb-8 pt-5 sm:px-6 md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6 flex items-center gap-3 md:mb-8">
            <Link href={availabilityHref} className="btn-icon" aria-label="Volver">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
                Paso 2 de 2
              </p>
              <h1 className="text-display text-3xl font-black md:text-5xl">
                Confirma tu reserva
              </h1>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1fr)] lg:items-start">
            <aside className="space-y-4 lg:sticky lg:top-8">
              <div className="rounded-[var(--r-lg)] bg-[var(--court-800)] p-4 text-white shadow-[var(--shadow-sm)] md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{selectedSlot.courtName}</p>
                    <p className="text-sm text-white/78">
                      {minutesToRange(
                        selectedSlot.startMinutes,
                        selectedSlot.endMinutes,
                      )}
                    </p>
                  </div>
                  {selectedSlotUnavailable ? (
                    <span className="pill bg-white/15 text-white">
                      <span className="dot bg-white" />
                      Ocupada
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                  <span className="text-xs uppercase tracking-[0.16em] text-white/60">
                    Total
                  </span>
                  <span className="text-xl font-black">
                    {formatCOP(selectedSlot.value)}
                  </span>
                </div>
              </div>

              <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--ink-500)]">
                  Resumen
                </p>
                <SummaryRow label="Fecha" value={formatDateLong(localDate)} />
                <SummaryRow
                  label="Hora"
                  value={minutesToRange(
                    selectedSlot.startMinutes,
                    selectedSlot.endMinutes,
                  )}
                />
                <SummaryRow
                  label="Duración"
                  value={durationLabel}
                />
                <SummaryRow label="Total" value={formatCOP(selectedSlot.value)} />
              </div>

              {selectedSlotUnavailable ? (
                <AvailabilityRecovery href={availabilityHref} />
              ) : null}
            </aside>

            <form
              className="space-y-4 md:rounded-[var(--r-lg)] md:border md:border-[var(--ink-200)] md:bg-white md:p-5 md:shadow-[var(--shadow-sm)]"
              onSubmit={submitPayAtClub}
            >
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
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["club", "Pago en club"],
                    ["transfer", "Transferencia"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-[var(--r-md)] border px-3 py-3 text-sm font-black ${
                        paymentMethod === value
                          ? "border-[var(--court-500)] bg-[var(--court-50)] text-[var(--court-700)]"
                          : "border-[var(--ink-200)] bg-white"
                      }`}
                      onClick={() => setPaymentMethod(value as "club" | "transfer")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {showDepositChoice ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--court-200)] bg-[var(--court-50)] p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--court-700)]">
                    Anticipo opcional
                  </p>
                  <SummaryRow
                    label="Total estimado"
                    value={formatCOP(depositPreview!.estimatedTotal)}
                  />
                  {depositPreview!.estimatedMembershipDiscount > 0 ? (
                    <SummaryRow
                      label="Descuento membresia"
                      value={`-${formatCOP(
                        depositPreview!.estimatedMembershipDiscount,
                      )}`}
                    />
                  ) : null}
                  <SummaryRow
                    label="Anticipo sugerido"
                    value={formatCOP(depositPreview!.depositSuggestedAmount)}
                  />
                  <SummaryRow
                    label="Saldo estimado en club"
                    value={formatCOP(depositBalanceDue)}
                  />
                  <p className="mt-3 text-sm font-bold text-[var(--court-700)]">
                    El anticipo se descuenta del total de la reserva. El saldo
                    final se confirma en recepcion.
                  </p>
                </div>
              ) : hasDepositWaiver ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--court-200)] bg-[var(--court-50)] p-4 text-sm font-bold text-[var(--court-700)]">
                  <p>Tu membresia te permite reservar sin anticipo.</p>
                  <p>El saldo final se liquida en recepcion.</p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
                  <div className="flex gap-2">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                  {showAvailabilityAction ? (
                    <Link className="btn btn-ghost mt-3" href={availabilityHref}>
                      Elegir otro horario
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={
                  !formValid ||
                  selectedSlotUnavailable ||
                  submittingOption !== null
                }
              >
                <Check size={17} />
                {submittingOption === "pay_at_club"
                  ? "Confirmando..."
                  : showDepositChoice || hasDepositWaiver
                    ? "Reservar sin anticipo"
                    : "Confirmar reserva"}
              </button>
              {showDepositChoice ? (
                <button
                  type="button"
                  className="btn btn-dark btn-block"
                  disabled={
                    !formValid ||
                    selectedSlotUnavailable ||
                    submittingOption !== null
                  }
                  onClick={() => void submitBooking("deposit_online")}
                >
                  <CreditCard size={17} />
                  {submittingOption === "deposit_online"
                    ? "Abriendo Mercado Pago..."
                    : "Reservar y pagar anticipo"}
                </button>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </PlayerShell>
  );
}

function AvailabilityRecovery({ href }: { href: string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] p-4 text-[var(--status-pending-fg)]">
      <div className="flex gap-2">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm font-bold">
          Este horario ya no está disponible. Es posible que ya haya sido reservado.
          Por favor elige otro horario.
        </p>
      </div>
      <Link className="btn btn-ghost mt-3" href={href}>
        Volver a horarios
      </Link>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span className="text-right font-black">{value}</span>
    </div>
  );
}
