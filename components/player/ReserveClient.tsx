"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  MessageCircle,
  PhoneOff,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import {
  addDays,
  formatDateLong,
  formatDateShort,
  minutesToRange,
  todayBogota,
} from "@/lib/dates";
import { formatCOP } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";
import { PlayerShell } from "./PlayerShell";

export function ReserveClient({
  slug,
  initialLocalDate,
  initialDurationMinutes = 60,
}: {
  slug: string;
  initialLocalDate?: string;
  initialDurationMinutes?: number;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [localDate, setLocalDate] = useState(
    () => initialLocalDate ?? todayBogota(),
  );
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
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
          ...getDateOptionCopy(date, offset),
        };
      }),
    [],
  );

  if (isLoading || !isAuthenticated || club === undefined || availability === undefined) {
    return (
      <PlayerShell>
        <div className="grid min-h-screen place-items-center bg-[var(--paper)] px-6 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--court-50)] text-[var(--court-700)]">
              <CalendarDays size={22} />
            </div>
            <p className="font-black">Cargando disponibilidad...</p>
          </div>
        </div>
      </PlayerShell>
    );
  }

  if (club === null) {
    return (
      <PlayerShell>
        <div className="grid min-h-screen place-items-center bg-[var(--paper)] px-6 text-center">
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <p className="font-black">Club no encontrado.</p>
            <Link className="btn btn-primary mt-4" href="/">
              Volver al inicio
            </Link>
          </div>
        </div>
      </PlayerShell>
    );
  }

  const slotsByCourt = availability.courts.map((court) => ({
    court,
    slots: availability.slots.filter((slot) => slot.courtId === court._id),
  }));
  const hasVisibleSlots = availability.slots.length > 0;
  const selectedSlot = selectedSlotKey
    ? availability.slots.find(
        (slot) =>
          getSlotKey(localDate, durationMinutes, slot.courtId, slot.startMinutes) ===
          selectedSlotKey,
      )
    : undefined;
  const selectedHref =
    selectedSlot && selectedSlot.isAvailable
      ? `/club/${slug}/confirmar?courtId=${selectedSlot.courtId}&date=${localDate}&startMinutes=${selectedSlot.startMinutes}&durationMinutes=${durationMinutes}`
      : undefined;
  const selectedRange = selectedSlot
    ? minutesToRange(selectedSlot.startMinutes, selectedSlot.endMinutes)
    : undefined;
  const durationCopy = getDurationCopy(durationMinutes);
  const formattedDate = formatDateLong(localDate);
  const whatsappMessage = `Hola, necesito ayuda para reservar en ${club.name}.`;
  const helpHref = whatsappUrl(club.whatsapp, whatsappMessage);

  function handleDateChange(nextDate: string) {
    setLocalDate(nextDate);
    setSelectedSlotKey(null);
  }

  function handleDurationChange(nextDuration: number) {
    setDurationMinutes(nextDuration);
    setSelectedSlotKey(null);
  }

  return (
    <PlayerShell>
      <div className="min-h-screen bg-[var(--paper)] pb-56 lg:pb-10">
        <header className="border-b border-[var(--ink-200)] bg-white">
          <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
            <Link
              href={`/club/${slug}`}
              className="group inline-flex min-w-0 items-center gap-3 text-[var(--ink-900)]"
              aria-label={`Volver a ${club.name}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-md)] text-[var(--ink-800)] transition group-hover:bg-[var(--ink-50)]">
                <ArrowLeft size={20} strokeWidth={2.4} />
              </span>
              <span className="truncate text-sm font-black sm:text-base">
                {club.name}
              </span>
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink-700)]">
                <HelpCircle size={17} />
                Necesitas ayuda?
              </span>
              <a
                href={helpHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[var(--status-available-border)] bg-[var(--status-available-bg)] px-3 py-2 text-sm font-black text-[var(--court-700)] transition hover:border-[var(--court-400)] hover:bg-[var(--court-50)]"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] px-5 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <section className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--court-600)]">
                Paso 1 de 2
              </p>
              <h1 className="[font-family:var(--font-display)] text-4xl font-black leading-[0.95] [letter-spacing:0] sm:text-5xl lg:text-6xl">
                Elige fecha, duración y cancha
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--ink-600)] sm:text-lg">
                Selecciona el día, la duración y el horario que más te guste.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-3 shadow-[var(--shadow-sm)]">
              <Benefit icon={<CalendarDays size={23} />} label="Reserva en pocos pasos" />
              <Benefit icon={<PhoneOff size={23} />} label="Sin llamadas" />
              <Benefit icon={<CreditCard size={23} />} label="Pago en el club" />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)] sm:p-5">
                <div className="mb-5">
                  <h2 className="text-lg font-black text-[var(--ink-950)]">
                    1. Selecciona el día
                  </h2>
                  <div className="mt-4 grid grid-cols-4 gap-2 lg:grid-cols-2">
                    {dateOptions.map((option) => (
                      <button
                        key={option.date}
                        type="button"
                        aria-pressed={option.date === localDate}
                        className={`min-h-16 rounded-[var(--r-md)] border px-2 py-3 text-center transition ${
                          option.date === localDate
                            ? "border-[var(--court-600)] bg-[var(--court-500)] text-white shadow-[var(--shadow-md)]"
                            : "border-[var(--ink-200)] bg-white text-[var(--ink-800)] hover:border-[var(--court-200)] hover:bg-[var(--court-50)]"
                        }`}
                        onClick={() => handleDateChange(option.date)}
                      >
                        <span className="block text-sm font-black">
                          {option.title}
                        </span>
                        <span
                          className={`mt-1 block text-xs font-bold ${
                            option.date === localDate
                              ? "text-white/82"
                              : "text-[var(--ink-500)]"
                          }`}
                        >
                          {option.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--ink-100)] pt-5">
                  <h2 className="text-lg font-black text-[var(--ink-950)]">
                    2. Duración
                  </h2>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[60, 120].map((duration) => {
                      const isActive = durationMinutes === duration;

                      return (
                        <button
                          key={duration}
                          type="button"
                          aria-pressed={isActive}
                          className={`min-h-16 rounded-[var(--r-md)] border px-4 py-3 text-center transition ${
                            isActive
                              ? "border-[var(--court-500)] bg-[var(--court-50)] text-[var(--court-700)] shadow-[inset_0_0_0_1px_var(--court-500)]"
                              : "border-[var(--ink-200)] bg-white text-[var(--ink-700)] hover:border-[var(--court-200)] hover:bg-[var(--court-50)]"
                          }`}
                          onClick={() => handleDurationChange(duration)}
                        >
                          <span className="block text-base font-black">
                            {duration / 60} hora{duration > 60 ? "s" : ""}
                          </span>
                          <span className="mt-1 block text-xs font-bold text-[var(--ink-500)]">
                            {duration} min
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex gap-3 rounded-[var(--r-md)] border border-[var(--court-100)] bg-[var(--court-50)] p-3 text-[var(--court-800)]">
                  <Clock3 size={18} className="mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">
                    La cancha se reserva por el tiempo completo seleccionado.
                  </p>
                </div>
              </section>

              <SelectionSummary
                className="hidden lg:block"
                date={formattedDate}
                duration={durationCopy}
                selectedSlot={selectedSlot}
                selectedRange={selectedRange}
                selectedHref={selectedHref}
              />

              <section className="hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 lg:block">
                <h2 className="mb-4 font-black text-[var(--ink-950)]">
                  Información importante
                </h2>
                <div className="space-y-3">
                  <InfoLine
                    icon={<CreditCard size={16} />}
                    text="Las reservas se pueden pagar en el club."
                  />
                  <InfoLine
                    icon={<CheckCircle2 size={16} />}
                    text="La disponibilidad se confirma al pasar al siguiente paso."
                  />
                  <InfoLine
                    icon={<Clock3 size={16} />}
                    text="El valor se calcula con la duración elegida."
                  />
                </div>
              </section>
            </aside>

            <section className="min-w-0">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[var(--ink-950)]">
                    3. Elige cancha y horario
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-600)]">
                    {availability.isOpen
                      ? `${availability.courts.length} cancha${
                          availability.courts.length === 1 ? "" : "s"
                        } disponible${
                          availability.courts.length === 1 ? "" : "s"
                        } para ${formatDateShort(localDate)}`
                      : "El club no abre esta fecha"}
                  </p>
                </div>
                <span className="rounded-[var(--r-pill)] bg-[var(--ink-50)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-600)]">
                  {durationCopy}
                </span>
              </div>

              {!availability.isOpen ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--ink-50)] text-[var(--ink-500)]">
                    <CalendarDays size={22} />
                  </div>
                  <p className="font-black">El club no abre esta fecha.</p>
                  <p className="mt-1 text-sm text-[var(--ink-600)]">
                    Prueba con otro día para ver horarios disponibles.
                  </p>
                </div>
              ) : !hasVisibleSlots ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[var(--r-lg)] bg-[var(--ink-50)] text-[var(--ink-500)]">
                    <Clock3 size={22} />
                  </div>
                  <p className="font-black">
                    No quedan horarios disponibles para esta fecha.
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-600)]">
                    Prueba con otro día o cambia la duración.
                  </p>
                </div>
              ) : (
                <div
                  className={`grid gap-4 ${
                    slotsByCourt.length > 1 ? "xl:grid-cols-2" : ""
                  }`}
                >
                  {slotsByCourt.map(({ court, slots }) => {
                    const availableSlots = slots.filter((slot) => slot.isAvailable);

                    return (
                      <article
                        key={court._id}
                        className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]"
                      >
                        <div className="flex items-start justify-between gap-4 border-b border-[var(--ink-100)] p-4 sm:p-5">
                          <div className="flex min-w-0 gap-3">
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--court-50)] text-[var(--court-700)]">
                              <LayoutGrid size={23} />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-xl font-black text-[var(--ink-950)]">
                                {court.name}
                              </h3>
                              <p className="mt-0.5 text-sm text-[var(--ink-600)]">
                                {court.description}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-[var(--r-pill)] bg-[var(--ink-50)] px-2.5 py-1 text-xs font-bold text-[var(--ink-600)]">
                                  {court.isCovered ? "Techada" : "Aire libre"}
                                </span>
                                <span className="rounded-[var(--r-pill)] bg-[var(--court-50)] px-2.5 py-1 text-xs font-bold text-[var(--court-700)]">
                                  {availableSlots.length} horario
                                  {availableSlots.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="pill pill-available mt-1">
                            <span className="dot" />
                            Activa
                          </span>
                        </div>

                        <div>
                          {slots.map((slot) => {
                            const range = minutesToRange(
                              slot.startMinutes,
                              slot.endMinutes,
                            );
                            const key = getSlotKey(
                              localDate,
                              durationMinutes,
                              slot.courtId,
                              slot.startMinutes,
                            );
                            const isSelected = selectedSlotKey === key;
                            const unavailableLabel =
                              slot.bookingStatus === "blocked"
                                ? "Bloqueada"
                                : "Ocupada";

                            return (
                              <button
                                key={`${slot.courtId}-${slot.startMinutes}`}
                                type="button"
                                disabled={!slot.isAvailable}
                                aria-pressed={isSelected}
                                aria-label={
                                  slot.isAvailable
                                    ? `Elegir ${range} en ${court.name}`
                                    : `${range} no disponible`
                                }
                                className={`group flex min-h-14 w-full items-center justify-between gap-4 border-b border-[var(--ink-100)] px-4 py-3 text-left transition last:border-0 sm:px-5 ${
                                  isSelected
                                    ? "bg-[var(--court-50)] shadow-[inset_4px_0_0_var(--court-500)]"
                                    : slot.isAvailable
                                      ? "bg-white hover:bg-[var(--court-50)]"
                                      : "cursor-not-allowed bg-[var(--ink-50)] text-[var(--ink-400)]"
                                }`}
                                onClick={() => setSelectedSlotKey(key)}
                              >
                                <span className="min-w-0">
                                  <span
                                    className={`block text-base font-black sm:text-lg ${
                                      isSelected
                                        ? "text-[var(--court-800)]"
                                        : "text-[var(--ink-950)]"
                                    } ${
                                      !slot.isAvailable ? "text-[var(--ink-400)]" : ""
                                    }`}
                                  >
                                    {range}
                                  </span>
                                  {isSelected ? (
                                    <span className="mt-0.5 block text-xs font-black uppercase tracking-[0.12em] text-[var(--court-600)]">
                                      Seleccionado
                                    </span>
                                  ) : null}
                                </span>

                                <span className="flex shrink-0 items-center gap-3">
                                  {slot.isAvailable ? (
                                    <span
                                      className={`text-base font-black ${
                                        isSelected
                                          ? "text-[var(--court-800)]"
                                          : "text-[var(--ink-950)]"
                                      }`}
                                    >
                                      {formatCOP(slot.value)}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-black text-[var(--ink-500)]">
                                      {unavailableLabel}
                                    </span>
                                  )}
                                  {slot.isAvailable ? (
                                    <ChevronRight
                                      size={19}
                                      className={`transition ${
                                        isSelected
                                          ? "text-[var(--court-700)]"
                                          : "text-[var(--ink-500)] group-hover:text-[var(--court-700)]"
                                      }`}
                                    />
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>

        <SelectionSummary
          mobile
          className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] rounded-t-[var(--r-xl)] border border-[var(--ink-200)] bg-white/95 p-4 shadow-[0_-18px_40px_rgba(15,19,17,0.12)] backdrop-blur lg:hidden"
          date={formattedDate}
          duration={durationCopy}
          selectedSlot={selectedSlot}
          selectedRange={selectedRange}
          selectedHref={selectedHref}
          helpHref={helpHref}
        />
      </div>
    </PlayerShell>
  );
}

function Benefit({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-md)] px-1 py-2 text-[var(--ink-900)] sm:flex-row sm:items-center sm:px-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--court-50)] text-[var(--court-700)] sm:h-10 sm:w-10">
        {icon}
      </span>
      <span className="text-xs font-black leading-snug sm:text-sm">{label}</span>
    </div>
  );
}

function InfoLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex gap-3 text-sm text-[var(--ink-700)]">
      <span className="mt-0.5 text-[var(--court-700)]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function SelectionSummary({
  className = "",
  mobile = false,
  date,
  duration,
  selectedSlot,
  selectedRange,
  selectedHref,
  helpHref,
}: {
  className?: string;
  mobile?: boolean;
  date: string;
  duration: string;
  selectedSlot?: {
    courtName: string;
    value: number;
    isAvailable: boolean;
  };
  selectedRange?: string;
  selectedHref?: string;
  helpHref?: string;
}) {
  const hasSelection = Boolean(selectedSlot && selectedRange);
  const title = hasSelection ? "Tu selección" : "Aún no has seleccionado";
  const subtitle = hasSelection
    ? `${selectedSlot?.courtName} · ${selectedRange}`
    : "Elige día, duración, cancha y horario";

  return (
    <section className={className}>
      <div
        className={
          mobile
            ? ""
            : "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]"
        }
      >
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--r-md)] bg-[var(--court-50)] text-[var(--court-700)]">
            {hasSelection ? <CheckCircle2 size={22} /> : <CalendarDays size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[var(--ink-950)]">{title}</p>
            <p className="mt-0.5 truncate text-sm text-[var(--ink-600)]">
              {subtitle}
            </p>
          </div>
        </div>

        {!mobile ? (
          <div className="mt-4 divide-y divide-[var(--ink-100)] rounded-[var(--r-md)] border border-[var(--ink-100)] bg-[var(--ink-50)] px-3">
            <SummaryRow label="Fecha" value={date} />
            <SummaryRow label="Duración" value={duration} />
            <SummaryRow
              label="Cancha"
              value={selectedSlot?.courtName ?? "Por elegir"}
            />
            <SummaryRow label="Horario" value={selectedRange ?? "Por elegir"} />
            <SummaryRow
              label="Total"
              value={selectedSlot ? formatCOP(selectedSlot.value) : "Por calcular"}
              strong
            />
          </div>
        ) : null}

        <ContinueAction href={selectedHref} disabled={!selectedHref} />

        {helpHref ? (
          <a
            href={helpHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-[var(--r-md)] px-2 py-2 text-sm font-bold text-[var(--ink-700)]"
          >
            <MessageCircle size={18} className="text-[var(--court-700)]" />
            Necesitas ayuda? Escríbenos por{" "}
            <span className="font-black text-[var(--court-700)]">WhatsApp</span>
            <ChevronRight size={18} className="text-[var(--ink-700)]" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

function ContinueAction({
  href,
  disabled,
}: {
  href?: string;
  disabled: boolean;
}) {
  const className = `mt-4 inline-flex h-14 w-full items-center justify-center gap-3 rounded-[var(--r-md)] border px-5 text-sm font-black transition ${
    disabled
      ? "cursor-not-allowed border-[var(--ink-200)] bg-[var(--ink-100)] text-[var(--ink-500)]"
      : "border-[var(--court-600)] bg-[var(--court-500)] text-white shadow-[var(--shadow-md)] hover:bg-[var(--court-600)]"
  }`;

  if (disabled || !href) {
    return (
      <button type="button" className={className} disabled>
        Continuar con la reserva
        <ArrowRight size={19} />
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      Continuar con la reserva
      <ArrowRight size={19} />
    </Link>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span
        className={`text-right ${
          strong
            ? "text-base font-black text-[var(--ink-950)]"
            : "font-bold text-[var(--ink-800)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function getDateOptionCopy(localDate: string, offset: number) {
  const shortDate = formatDateShort(localDate)
    .replace(".", "")
    .replace(",", "");
  const [weekday = shortDate, day = ""] = shortDate.split(" ");
  const readableWeekday = capitalize(weekday);

  if (offset === 0) {
    return {
      title: "Hoy",
      subtitle: `${readableWeekday} ${day}`.trim(),
    };
  }

  if (offset === 1) {
    return {
      title: "Mañana",
      subtitle: `${readableWeekday} ${day}`.trim(),
    };
  }

  return {
    title: readableWeekday,
    subtitle: day || shortDate,
  };
}

function getDurationCopy(durationMinutes: number) {
  return `${durationMinutes / 60} hora${durationMinutes > 60 ? "s" : ""}`;
}

function getSlotKey(
  localDate: string,
  durationMinutes: number,
  courtId: string,
  startMinutes: number,
) {
  return `${localDate}-${durationMinutes}-${courtId}-${startMinutes}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
