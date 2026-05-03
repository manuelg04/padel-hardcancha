"use client";

import {
  Check,
  MessageCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calculateBookingValue, SLOT_MINUTES } from "@/lib/bookingRules";
import {
  formatDateLong,
  getHourRows,
  minutesToInput,
  minutesToRange,
  minutesToTime,
  todayBogota,
} from "@/lib/dates";
import { formatCOP, initials } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";
import { AdminLayout } from "./AdminLayout";
import { BookingSettlementPanel } from "./agenda/BookingSettlementPanel";

type BookingDoc = Doc<"bookings">;
type CourtDoc = Doc<"courts">;
type SettlementDoc = Doc<"bookingSettlements">;
type BookingFilter = "all" | "pending" | "paid" | "blocked";
type ModalDefaults = {
  courtId?: Id<"courts">;
  localDate: string;
  startMinutes?: number;
};

export function AgendaClient() {
  const [localDate, setLocalDate] = useState(todayBogota);
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [search, setSearch] = useState("");
  const [modalDefaults, setModalDefaults] = useState<ModalDefaults | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<Id<"bookings"> | null>(
    null,
  );
  const agenda = useQuery(api.bookings.listAgendaByDate, {
    localDate,
  });

  const settlementsByBookingId = useMemo(() => {
    if (!agenda) return new Map<string, SettlementDoc>();

    return new Map(
      agenda.settlements.map((settlement) => [
        settlement.bookingId,
        settlement,
      ]),
    );
  }, [agenda]);
  const visibleBookingIds = useMemo(() => {
    if (!agenda) return new Set<string>();
    return new Set(
      agenda.bookings
        .filter((booking) =>
          bookingMatchesFilter(
            booking,
            settlementsByBookingId.get(booking._id),
            filter,
            search,
          ),
        )
        .map((booking) => booking._id),
    );
  }, [agenda, settlementsByBookingId, filter, search]);

  const selectedBooking = agenda?.bookings.find(
    (booking) => booking._id === selectedBookingId,
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Agenda
            </p>
            <h1 className="text-display text-4xl font-black">
              {agenda?.club.name ?? "Match Point Padel"}
            </h1>
            <p className="mt-1 text-[var(--ink-500)]">
              {formatDateLong(localDate)} · operación diaria
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="field min-w-44">
              <label htmlFor="agenda-date">Fecha</label>
              <input
                id="agenda-date"
                type="date"
                value={localDate}
                onChange={(event) => setLocalDate(event.target.value)}
              />
            </div>
            <div className="field min-w-64">
              <label htmlFor="agenda-search">Buscar</label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
                  size={16}
                />
                <input
                  id="agenda-search"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cliente, celular o código"
                />
              </div>
            </div>
            <button
              className="btn btn-primary mt-5"
              onClick={() => setModalDefaults({ localDate })}
            >
              <Plus size={17} />
              Nueva reserva
            </button>
          </div>
        </header>

        {agenda === undefined ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)]">
            Cargando agenda...
          </div>
        ) : (
          <>
            <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                label="Reservas hoy"
                value={String(agenda.metrics.reservationsToday)}
                hint={`${agenda.metrics.pending} pendientes`}
              />
              <MetricCard
                label="Ocupación"
                value={`${agenda.metrics.occupancy}%`}
                hint={`${agenda.metrics.occupiedSlots} / ${agenda.metrics.totalSlots} slots`}
              />
              <MetricCard
                label="Valor cancha"
                value={formatCOP(agenda.metrics.expectedRevenue)}
                hint="Reservas del dia"
              />
              <MetricCard
                label="Cobrado real"
                value={formatCOP(agenda.metrics.collectedRevenue)}
                hint="Pagos recibidos"
              />
              <MetricCard
                label="Bloqueos"
                value={String(agenda.metrics.blocks)}
                hint="Mantto + torneo"
              />
              <MetricCard
                label="Canchas"
                value={String(agenda.courts.length)}
                hint="Activas"
              />
            </section>

            <div className="mb-4 flex flex-wrap gap-2">
              {[
                ["all", "Todas"],
                ["pending", "Pendientes"],
                ["paid", "Pagadas"],
                ["blocked", "Bloqueadas"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`rounded-[var(--r-pill)] border px-4 py-2 text-sm font-black ${
                    filter === value
                      ? "border-[var(--court-600)] bg-[var(--court-500)] text-white"
                      : "border-[var(--ink-200)] bg-white text-[var(--ink-700)]"
                  }`}
                  onClick={() => setFilter(value as BookingFilter)}
                >
                  {label}
                </button>
              ))}
            </div>

            <AgendaGrid
              bookings={agenda.bookings}
              courts={agenda.courts}
              openMinutes={agenda.openMinutes}
              closeMinutes={agenda.closeMinutes}
              visibleBookingIds={visibleBookingIds}
              settlementsByBookingId={settlementsByBookingId}
              onEmptySlot={(defaults) => setModalDefaults(defaults)}
              onBooking={(booking) => setSelectedBookingId(booking._id)}
              localDate={localDate}
              pastSlotCutoffMinutes={agenda.pastSlotCutoffMinutes}
            />

            {modalDefaults ? (
              <ManualBookingModal
                defaults={modalDefaults}
                courts={agenda.courts}
                pricing={agenda.club.pricing}
                openMinutes={agenda.openMinutes}
                closeMinutes={agenda.closeMinutes}
                currentLocalDate={agenda.currentLocalDate}
                currentMinutes={agenda.currentMinutes}
                onClose={() => setModalDefaults(null)}
              />
            ) : null}

            {selectedBooking ? (
              <BookingDetailDrawer
                key={selectedBooking._id}
                booking={selectedBooking}
                court={agenda.courts.find((court) => court._id === selectedBooking.courtId)}
                settlement={settlementsByBookingId.get(selectedBooking._id)}
                clubName={agenda.club.name}
                onClose={() => setSelectedBookingId(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
        {label}
      </p>
      <p className="text-display mt-2 text-3xl font-black">{value}</p>
      <p className="text-sm text-[var(--ink-500)]">{hint}</p>
    </div>
  );
}

function AgendaGrid({
  courts,
  bookings,
  openMinutes,
  closeMinutes,
  visibleBookingIds,
  settlementsByBookingId,
  localDate,
  pastSlotCutoffMinutes,
  onEmptySlot,
  onBooking,
}: {
  courts: CourtDoc[];
  bookings: BookingDoc[];
  openMinutes: number;
  closeMinutes: number;
  visibleBookingIds: Set<string>;
  settlementsByBookingId: Map<string, SettlementDoc>;
  localDate: string;
  pastSlotCutoffMinutes: number | null;
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
              const settlement = settlementsByBookingId.get(startsHere._id);
              const isPaid = settlement
                ? settlement.status === "paid"
                : startsHere.paymentStatus === "paid";
              return (
                <button
                  key={`${court._id}-${hour}`}
                  className={`m-1 rounded-[var(--r-md)] border p-3 text-left transition hover:scale-[1.01] ${
                    startsHere.bookingStatus === "blocked"
                      ? "blocked-pattern border-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]"
                      : isPaid
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
                      : settlement
                        ? `${formatCOP(startsHere.value)} cancha · ${formatCOP(
                            settlement.finalTotalCollectedValue,
                          )} ${
                            settlement.status === "paid" ? "cobrado" : "a cobrar"
                          }`
                        : `${formatCOP(startsHere.value)} · ${
                            startsHere.paymentStatus === "paid"
                              ? "Pagada"
                              : "Pendiente"
                          }`}
                  </p>
                </button>
              );
            }

            const isPastEmptySlot =
              pastSlotCutoffMinutes !== null && hour <= pastSlotCutoffMinutes;

            return (
              <button
                key={`${court._id}-${hour}`}
                className={`m-1 rounded-[var(--r-md)] border text-left text-xs font-bold ${
                  isPastEmptySlot
                    ? "cursor-not-allowed border-[var(--ink-100)] bg-[var(--ink-50)] text-[var(--ink-400)] opacity-45"
                    : "border-[var(--ink-100)] bg-[var(--ink-50)] text-[var(--ink-400)] hover:border-[var(--court-300)] hover:bg-[var(--court-50)] hover:text-[var(--court-700)]"
                }`}
                disabled={isPastEmptySlot}
                aria-disabled={isPastEmptySlot}
                style={{ gridColumn: courtIndex + 2, gridRow: rowIndex + 2 }}
                onClick={() =>
                  !isPastEmptySlot &&
                  onEmptySlot({
                    courtId: court._id,
                    localDate,
                    startMinutes: hour,
                  })
                }
              >
                <span className="px-3">
                  {isPastEmptySlot ? "Pasado" : "Disponible"}
                </span>
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}

function ManualBookingModal({
  defaults,
  courts,
  pricing,
  openMinutes,
  closeMinutes,
  currentLocalDate,
  currentMinutes,
  onClose,
}: {
  defaults: ModalDefaults;
  courts: CourtDoc[];
  pricing: Doc<"clubs">["pricing"];
  openMinutes: number;
  closeMinutes: number;
  currentLocalDate: string;
  currentMinutes: number;
  onClose: () => void;
}) {
  const createManualBooking = useMutation(api.bookings.createManualBooking);
  const [courtId, setCourtId] = useState(defaults.courtId ?? courts[0]?._id);
  const [localDate, setLocalDate] = useState(defaults.localDate);
  const [startMinutes, setStartMinutes] = useState(
    getInitialManualStartMinutes({
      defaults,
      openMinutes,
      closeMinutes,
      currentLocalDate,
      currentMinutes,
    }),
  );
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [source, setSource] = useState<"manual" | "whatsapp" | "walk_in" | "phone">("whatsapp");
  const [internalNote, setInternalNote] = useState("");
  const [error, setError] = useState("");
  const value = calculateBookingValue(
    localDate,
    startMinutes,
    durationMinutes,
    pricing,
  );
  const selectedStartIsPast = isPastManualSlot({
    localDate,
    startMinutes,
    closeMinutes,
    currentLocalDate,
    currentMinutes,
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!courtId || customerName.trim().length < 3 || customerPhone.trim().length < 7) {
      setError("Completa cancha, cliente y celular.");
      return;
    }

    if (selectedStartIsPast) {
      setError("Este horario ya empezo o ya paso. Elige un horario mas adelante.");
      return;
    }

    try {
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
              Crea una reserva manual para recepción o WhatsApp.
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

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
            <label>Duración</label>
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
        </div>

        {error ? (
          <p className="mt-4 rounded-[var(--r-md)] bg-[var(--status-cancelled-bg)] p-3 text-sm font-bold text-[var(--status-cancelled-fg)]">
            {error}
          </p>
        ) : null}

        {selectedStartIsPast ? (
          <p className="mt-4 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-500)]">
            Este horario ya empezo o ya paso. Elige un horario mas adelante.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={selectedStartIsPast}
          >
            <Check size={17} />
            Crear reserva
          </button>
        </div>
      </form>
    </div>
  );
}

function getPastSlotCutoffFromServerTime({
  localDate,
  closeMinutes,
  currentLocalDate,
  currentMinutes,
}: {
  localDate: string;
  closeMinutes: number;
  currentLocalDate: string;
  currentMinutes: number;
}) {
  if (localDate < currentLocalDate) {
    return closeMinutes;
  }

  if (localDate === currentLocalDate) {
    return currentMinutes;
  }

  return null;
}

function isPastManualSlot(args: {
  localDate: string;
  startMinutes: number;
  closeMinutes: number;
  currentLocalDate: string;
  currentMinutes: number;
}) {
  const cutoffMinutes = getPastSlotCutoffFromServerTime(args);

  return cutoffMinutes !== null && args.startMinutes <= cutoffMinutes;
}

function getNextManualStartMinutes({
  localDate,
  openMinutes,
  closeMinutes,
  currentLocalDate,
  currentMinutes,
}: {
  localDate: string;
  openMinutes: number;
  closeMinutes: number;
  currentLocalDate: string;
  currentMinutes: number;
}) {
  for (
    let startMinutes = openMinutes;
    startMinutes < closeMinutes;
    startMinutes += SLOT_MINUTES
  ) {
    if (
      !isPastManualSlot({
        localDate,
        startMinutes,
        closeMinutes,
        currentLocalDate,
        currentMinutes,
      })
    ) {
      return startMinutes;
    }
  }

  return null;
}

function getInitialManualStartMinutes({
  defaults,
  openMinutes,
  closeMinutes,
  currentLocalDate,
  currentMinutes,
}: {
  defaults: ModalDefaults;
  openMinutes: number;
  closeMinutes: number;
  currentLocalDate: string;
  currentMinutes: number;
}) {
  if (
    defaults.startMinutes !== undefined &&
    !isPastManualSlot({
      localDate: defaults.localDate,
      startMinutes: defaults.startMinutes,
      closeMinutes,
      currentLocalDate,
      currentMinutes,
    })
  ) {
    return defaults.startMinutes;
  }

  return (
    getNextManualStartMinutes({
      localDate: defaults.localDate,
      openMinutes,
      closeMinutes,
      currentLocalDate,
      currentMinutes,
    }) ??
    defaults.startMinutes ??
    openMinutes ??
    17 * 60
  );
}

function BookingDetailDrawer({
  booking,
  court,
  settlement,
  clubName,
  onClose,
}: {
  booking: BookingDoc;
  court?: CourtDoc;
  settlement?: SettlementDoc;
  clubName: string;
  onClose: () => void;
}) {
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const updateNote = useMutation(api.bookings.updateBookingNote);
  const [note, setNote] = useState(booking.internalNote ?? "");
  const [error, setError] = useState("");

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-[var(--shadow-pop)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-display text-2xl font-black">
              Reserva {booking.code}
            </h2>
            <p className="text-sm text-[var(--ink-500)]">
              {court?.name ?? "Cancha"} ·{" "}
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
              {booking.customerEmail ? ` · ${booking.customerEmail}` : ""}
            </p>
          </div>
          <StatusBadge booking={booking} settlement={settlement} />
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
          <Detail label="Cancha" value={court?.name ?? "Cancha"} />
          <Detail label="Fecha" value={formatDateLong(booking.localDate)} />
          <Detail
            label="Hora"
            value={minutesToRange(booking.startMinutes, booking.endMinutes)}
          />
          <Detail label="Valor cancha" value={formatCOP(booking.value)} />
          <Detail label="Origen" value={sourceLabel(booking.source)} />
          <Detail
            label="Creada"
            value={new Intl.DateTimeFormat("es-CO", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(booking.createdAt))}
          />
        </div>

        <BookingSettlementPanel booking={booking} court={court} />

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
              if (window.confirm("¿Cancelar esta reserva?")) {
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

function StatusBadge({
  booking,
  settlement,
}: {
  booking: BookingDoc;
  settlement?: SettlementDoc;
}) {
  if (booking.bookingStatus === "blocked") {
    return (
      <span className="pill pill-blocked">
        <span className="dot" />
        Bloqueada
      </span>
    );
  }

  if (settlement && settlement.status !== "cancelled") {
    const paid = settlement.status === "paid";
    return (
      <span className={`pill ${paid ? "pill-paid" : "pill-pending"}`}>
        <span className="dot" />
        {paid ? "Liquidacion pagada" : "Liquidacion pendiente"}
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

function sourceLabel(source: BookingDoc["source"]) {
  const labels = {
    online: "Reserva online",
    manual: "Manual",
    whatsapp: "WhatsApp",
    walk_in: "Presencial",
    phone: "Telefono",
  };
  return labels[source];
}

function bookingMatchesFilter(
  booking: BookingDoc,
  settlement: SettlementDoc | undefined,
  filter: BookingFilter,
  search: string,
) {
  const paid = settlement && settlement.status !== "cancelled"
    ? settlement.status === "paid"
    : booking.paymentStatus === "paid";
  const matchesFilter =
    filter === "all" ||
    (filter === "blocked" && booking.bookingStatus === "blocked") ||
    (filter === "pending" &&
      booking.bookingStatus !== "blocked" &&
      !paid) ||
    (filter === "paid" &&
      booking.bookingStatus !== "blocked" &&
      paid);

  if (!matchesFilter) return false;

  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [booking.code, booking.customerName, booking.customerPhone]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(term));
}
