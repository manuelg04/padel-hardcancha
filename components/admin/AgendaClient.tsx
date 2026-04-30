"use client";

import {
  Check,
  CircleDollarSign,
  Copy,
  CreditCard,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { calculateBookingValue } from "@/lib/bookingRules";
import {
  formatDateLong,
  getHourRows,
  minutesToInput,
  minutesToRange,
  minutesToTime,
  todayBogota,
} from "@/lib/dates";
import { formatCOP, initials } from "@/lib/format";
import { paymentLinkMessage, whatsappUrl } from "@/lib/whatsapp";
import { AdminLayout } from "./AdminLayout";

type BookingDoc = Doc<"bookings">;
type CourtDoc = Doc<"courts">;
type PaymentStatus = {
  onlinePaymentsEnabled: boolean;
  status: string;
  canManageConnection: boolean;
} | null | undefined;
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
  const mercadoPagoStatus = useQuery(api.payments.getClubMercadoPagoStatus, {});

  const visibleBookingIds = useMemo(() => {
    if (!agenda) return new Set<string>();
    return new Set(
      agenda.bookings
        .filter((booking) => bookingMatchesFilter(booking, filter, search))
        .map((booking) => booking._id),
    );
  }, [agenda, filter, search]);

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
            <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                label="Ingresos esperados"
                value={formatCOP(agenda.metrics.expectedRevenue)}
                hint="Hoy"
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
              onEmptySlot={(defaults) => setModalDefaults(defaults)}
              onBooking={(booking) => setSelectedBookingId(booking._id)}
              localDate={localDate}
            />

            {modalDefaults ? (
              <ManualBookingModal
                defaults={modalDefaults}
                courts={agenda.courts}
                pricing={agenda.club.pricing}
                clubName={agenda.club.name}
                mercadoPagoStatus={mercadoPagoStatus}
                onClose={() => setModalDefaults(null)}
              />
            ) : null}

            {selectedBooking ? (
              <BookingDetailDrawer
                key={selectedBooking._id}
                booking={selectedBooking}
                court={agenda.courts.find((court) => court._id === selectedBooking.courtId)}
                clubName={agenda.club.name}
                mercadoPagoStatus={mercadoPagoStatus}
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
  localDate,
  onEmptySlot,
  onBooking,
}: {
  courts: CourtDoc[];
  bookings: BookingDoc[];
  openMinutes: number;
  closeMinutes: number;
  visibleBookingIds: Set<string>;
  localDate: string;
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
              return (
                <button
                  key={`${court._id}-${hour}`}
                  className={`m-1 rounded-[var(--r-md)] border p-3 text-left transition hover:scale-[1.01] ${
                    startsHere.bookingStatus === "blocked"
                      ? "blocked-pattern border-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)]"
                      : startsHere.paymentStatus === "paid"
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
                      : `${formatCOP(startsHere.value)} · ${
                          startsHere.paymentStatus === "paid" ? "Pagada" : "Pendiente"
                        }`}
                  </p>
                </button>
              );
            }

            return (
              <button
                key={`${court._id}-${hour}`}
                className="m-1 rounded-[var(--r-md)] border border-[var(--ink-100)] bg-[var(--ink-50)] text-left text-xs font-bold text-[var(--ink-400)] hover:border-[var(--court-300)] hover:bg-[var(--court-50)] hover:text-[var(--court-700)]"
                style={{ gridColumn: courtIndex + 2, gridRow: rowIndex + 2 }}
                onClick={() =>
                  onEmptySlot({
                    courtId: court._id,
                    localDate,
                    startMinutes: hour,
                  })
                }
              >
                <span className="px-3">Disponible</span>
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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
              Crea una reserva manual para recepción o WhatsApp.
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

function BookingDetailDrawer({
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
          <Detail
            label="Creada"
            value={formatDateTime(booking.createdAt)}
          />
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

function bookingStatusLabel(status: BookingDoc["bookingStatus"]) {
  const labels: Record<BookingDoc["bookingStatus"], string> = {
    payment_pending: "Pendiente de pago",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    expired: "Expirada",
    blocked: "Bloqueada",
  };
  return labels[status];
}

function paymentStatusLabel(status: BookingDoc["paymentStatus"]) {
  const labels: Record<BookingDoc["paymentStatus"], string> = {
    pending: "Pendiente",
    paid: "Pagada",
    failed: "Fallida",
    expired: "Vencida",
    refunded: "Reembolsada",
    no_payment_required: "No requiere pago",
  };
  return labels[status];
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function bookingMatchesFilter(
  booking: BookingDoc,
  filter: BookingFilter,
  search: string,
) {
  const matchesFilter =
    filter === "all" ||
    (filter === "blocked" && booking.bookingStatus === "blocked") ||
    (filter === "pending" &&
      booking.bookingStatus !== "blocked" &&
      booking.paymentStatus === "pending") ||
    (filter === "paid" &&
      booking.bookingStatus !== "blocked" &&
      booking.paymentStatus === "paid");

  if (!matchesFilter) return false;

  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [booking.code, booking.customerName, booking.customerPhone]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(term));
}
