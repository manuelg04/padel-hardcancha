"use client";

import { AlertCircle, CreditCard, Eye, Search, X } from "lucide-react";
import { useQuery } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import { formatCOP } from "@/lib/format";
import { AdminLayout } from "./AdminLayout";

type PaymentTransactionsArgs = FunctionArgs<
  typeof api.payments.listClubPaymentTransactions
>;
type PaymentTransactionsResult = FunctionReturnType<
  typeof api.payments.listClubPaymentTransactions
>;
type PaymentDetailResult = FunctionReturnType<
  typeof api.payments.getPaymentTransactionDetail
>;
type PaymentRow = PaymentTransactionsResult["rows"][number];
type PaymentDetail = NonNullable<PaymentDetailResult>;
type PaymentStatus = NonNullable<PaymentTransactionsArgs["status"]>;
type PaymentType = NonNullable<PaymentTransactionsArgs["type"]>;
type FinancialSnapshotStatus = NonNullable<PaymentRow["financialSnapshotStatus"]>;
type PaymentStatusFilter = "all" | PaymentStatus;
type PaymentTypeFilter = "all" | PaymentType;

const statusOptions: { value: PaymentStatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "approved", label: "Aprobados" },
  { value: "pending", label: "Pendientes" },
  { value: "created", label: "Creados" },
  { value: "rejected", label: "Rechazados" },
  { value: "failed", label: "Fallidos" },
  { value: "refunded", label: "Reembolsados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "superseded", label: "Reemplazados" },
];

const typeOptions: { value: PaymentTypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "deposit", label: "Anticipo" },
  { value: "full_payment", label: "Pago completo" },
];

const statusLabels: Record<PaymentStatus, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  created: "Creado",
  rejected: "Rechazado",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  superseded: "Reemplazado",
};

const typeLabels: Record<PaymentType, string> = {
  deposit: "Anticipo",
  full_payment: "Pago completo",
};

const financialSnapshotLabels: Record<FinancialSnapshotStatus, string> = {
  complete: "Completo",
  partial: "Parcial",
  unavailable: "No disponible",
};

const statusClasses: Record<PaymentStatus, string> = {
  approved: "pill-paid",
  pending: "pill-pending",
  created: "pill-pending",
  rejected: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]",
  failed: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]",
  cancelled: "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)]",
  refunded: "bg-[var(--ink-100)] text-[var(--ink-700)]",
  superseded: "bg-[var(--ink-100)] text-[var(--ink-600)]",
};

export function PaymentsClient() {
  return (
    <AdminLayout>
      <PaymentsErrorBoundary>
        <PaymentsContent />
      </PaymentsErrorBoundary>
    </AdminLayout>
  );
}

class PaymentsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto w-full max-w-[1500px] p-4 md:p-8">
          <section className="rounded-[var(--r-lg)] border border-[var(--status-cancelled-bg)] bg-white p-6 shadow-[var(--shadow-sm)]">
            <div className="flex gap-3 text-[var(--status-cancelled-fg)]">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>
                <h1 className="text-xl font-black">No pudimos cargar pagos</h1>
                <p className="mt-1 text-sm text-[var(--ink-600)]">
                  Intenta actualizar la página. Si el problema continúa, revisa la
                  conexión del club antes de operar pagos online.
                </p>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

function PaymentsContent() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<PaymentStatusFilter>("all");
  const [type, setType] = useState<PaymentTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<PaymentRow["id"] | null>(
    null,
  );
  const rangeError =
    fromDate && toDate && fromDate > toDate
      ? "La fecha desde no puede ser posterior a la fecha hasta."
      : "";
  const queryArgs = useMemo<PaymentTransactionsArgs | "skip">(() => {
    if (rangeError) return "skip";

    const args: PaymentTransactionsArgs = {};
    const cleanSearch = search.trim();

    if (fromDate) args.fromDate = fromDate;
    if (toDate) args.toDate = toDate;
    if (status !== "all") args.status = status;
    if (type !== "all") args.type = type;
    if (cleanSearch) args.search = cleanSearch;

    return args;
  }, [fromDate, rangeError, search, status, toDate, type]);
  const transactions = useQuery(api.payments.listClubPaymentTransactions, queryArgs);

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 md:p-8">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--court-600)]">
            Pagos
          </p>
          <h1 className="text-display mt-1 text-3xl font-black leading-tight md:text-4xl">
            Pagos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-500)] md:text-base">
            Transacciones online de reservas procesadas por Mercado Pago
          </p>
        </div>
      </header>

      <section className="mb-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
            <CreditCard size={19} />
          </span>
          <p className="text-sm leading-6 text-[var(--ink-600)]">
            Los pagos online son procesados directamente en la cuenta Mercado Pago
            del club. Los descuentos mostrados corresponden a cargos y retenciones
            aplicados por Mercado Pago según la configuración de la cuenta del
            club.
          </p>
        </div>
      </section>

      <Filters
        fromDate={fromDate}
        toDate={toDate}
        status={status}
        type={type}
        search={search}
        onFromDate={setFromDate}
        onToDate={setToDate}
        onStatus={setStatus}
        onType={setType}
        onSearch={setSearch}
      />

      {rangeError ? (
        <InlineError message={rangeError} />
      ) : transactions === undefined ? (
        <LoadingState />
      ) : (
        <>
          <KpiGrid kpis={transactions.kpis} />
          <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--ink-200)] p-4">
              <h2 className="text-lg font-black">Transacciones</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">
                El saldo pendiente se calcula con el valor bruto pagado por el
                jugador, no con el neto recibido por el club.
              </p>
            </div>
            {transactions.rows.length === 0 ? (
              <EmptyState />
            ) : (
              <PaymentsTable
                rows={transactions.rows}
                onViewDetail={setSelectedPaymentId}
              />
            )}
          </section>
        </>
      )}

      {selectedPaymentId ? (
        <PaymentDetailErrorBoundary
          key={selectedPaymentId}
          resetKey={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        >
          <PaymentDetailDrawer
            paymentId={selectedPaymentId}
            onClose={() => setSelectedPaymentId(null)}
          />
        </PaymentDetailErrorBoundary>
      ) : null}
    </div>
  );
}

function Filters({
  fromDate,
  toDate,
  status,
  type,
  search,
  onFromDate,
  onToDate,
  onStatus,
  onType,
  onSearch,
}: {
  fromDate: string;
  toDate: string;
  status: PaymentStatusFilter;
  type: PaymentTypeFilter;
  search: string;
  onFromDate: (value: string) => void;
  onToDate: (value: string) => void;
  onStatus: (value: PaymentStatusFilter) => void;
  onType: (value: PaymentTypeFilter) => void;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="mb-5 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(280px,1.4fr)]">
        <div className="field">
          <label htmlFor="payments-from-date">Fecha desde</label>
          <input
            id="payments-from-date"
            type="date"
            value={fromDate}
            onChange={(event) => onFromDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="payments-to-date">Fecha hasta</label>
          <input
            id="payments-to-date"
            type="date"
            value={toDate}
            onChange={(event) => onToDate(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="payments-status">Estado</label>
          <select
            id="payments-status"
            value={status}
            onChange={(event) => onStatus(event.target.value as PaymentStatusFilter)}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="payments-type">Tipo</label>
          <select
            id="payments-type"
            value={type}
            onChange={(event) => onType(event.target.value as PaymentTypeFilter)}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="payments-search">Búsqueda</label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
              size={16}
            />
            <input
              id="payments-search"
              className="pl-9"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cliente, celular, código o ID de pago"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiGrid({ kpis }: { kpis: PaymentTransactionsResult["kpis"] }) {
  const items = [
    {
      label: "Cobrado online bruto",
      value: formatNullableCOP(kpis.grossCollectedAmount),
      hint: "Bruto pagado por jugadores",
    },
    {
      label: "Cargos Mercado Pago",
      value: formatNullableCOP(kpis.gatewayDeductionsAmount),
      hint: "Comisiones, cargos o retenciones",
    },
    {
      label: "Neto recibido",
      value: formatNullableCOP(kpis.netReceivedAmount),
      hint: "Disponible/neto según Mercado Pago",
    },
    {
      label: "Saldo pendiente en recepción",
      value: formatNullableCOP(kpis.pendingReceptionAmount),
      hint: "Por cobrar en club",
    },
    {
      label: "Transacciones",
      value: formatCount(kpis.transactionCount),
      hint: "Pagos online",
    },
    ...(typeof kpis.missingFinancialBreakdownCount === "number"
      ? [
          {
            label: "Sin desglose completo",
            value: formatCount(kpis.missingFinancialBreakdownCount),
            hint: "Falta neto/cargos",
          },
        ]
      : []),
  ];

  return (
    <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink-500)]">
            {item.label}
          </p>
          <p className="text-display mt-2 text-2xl font-black leading-tight">
            {item.value}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-500)]">{item.hint}</p>
        </article>
      ))}
    </section>
  );
}

function PaymentsTable({
  rows,
  onViewDetail,
}: {
  rows: PaymentRow[];
  onViewDetail: (paymentId: PaymentRow["id"]) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
        <thead className="bg-[var(--ink-50)] text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-500)]">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Reserva</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3 text-right">Valor pagado</th>
            <th className="px-4 py-3 text-right">Cargos Mercado Pago</th>
            <th className="px-4 py-3 text-right">Neto recibido</th>
            <th className="px-4 py-3 text-right">Saldo pendiente</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ink-200)]">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-bold text-[var(--ink-900)]">
                  {formatPaymentDate(row)}
                </p>
                <p className="text-xs text-[var(--ink-500)]">
                  {row.dateApproved ? "Aprobado" : "Creado"}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-[var(--ink-900)]">
                  {row.customerName ?? "No disponible"}
                </p>
                <p className="text-xs text-[var(--ink-500)]">
                  {row.customerPhone ?? "Sin celular"}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-[var(--ink-900)]">
                  {row.bookingCode ?? "Sin código"}
                </p>
                <p className="text-xs text-[var(--ink-500)]">
                  {formatReservationSummary(row)}
                </p>
                <p className="text-xs text-[var(--ink-500)]">
                  {row.courtName ?? "Cancha no disponible"}
                </p>
              </td>
              <td className="px-4 py-4 font-bold text-[var(--ink-700)]">
                {typeLabels[row.type]}
              </td>
              <td className="px-4 py-4 text-right font-black">
                {formatNullableCOP(row.grossAmount)}
              </td>
              <td className="px-4 py-4 text-right">
                <p className="font-black">
                  {formatNullableCOP(row.totalDeductionsAmount)}
                </p>
                <FinancialSnapshotBadge row={row} />
              </td>
              <td className="px-4 py-4 text-right font-black">
                {formatNullableCOP(row.netReceivedAmount)}
              </td>
              <td className="px-4 py-4 text-right">
                <p className="font-black">
                  {formatNullableCOP(row.pendingAmountAtReception)}
                </p>
                <p className="text-xs text-[var(--ink-500)]">
                  Total {formatNullableCOP(row.totalReservationAmount)}
                </p>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-[var(--ink-900)]">
                  {providerLabel(row.provider)}
                </p>
                <p
                  className="max-w-[160px] truncate text-xs text-[var(--ink-500)]"
                  title={row.providerPaymentId ?? undefined}
                >
                  {row.providerPaymentId ?? "Sin ID de pago"}
                </p>
              </td>
              <td className="px-4 py-4 text-right">
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-2"
                  onClick={() => onViewDetail(row.id)}
                  aria-label={`Ver detalle de pago ${
                    row.providerPaymentId ?? row.bookingCode ?? row.id
                  }`}
                >
                  <Eye size={15} />
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

class PaymentDetailErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void; resetKey: string | null },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: {
    children: ReactNode;
    onClose: () => void;
    resetKey: string | null;
  }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <PaymentDetailFrame
          title="Detalle de pago"
          subtitle="No pudimos consultar esta transacción."
          onClose={this.props.onClose}
        >
          <DetailNotice
            title="No pudimos cargar el detalle"
            message="Cierra el panel e intenta abrir la transacción de nuevo."
            tone="error"
          />
        </PaymentDetailFrame>
      );
    }

    return this.props.children;
  }
}

function PaymentDetailDrawer({
  paymentId,
  onClose,
}: {
  paymentId: PaymentRow["id"];
  onClose: () => void;
}) {
  const detail = useQuery(api.payments.getPaymentTransactionDetail, { paymentId });

  if (detail === undefined) {
    return (
      <PaymentDetailFrame
        title="Detalle de pago"
        subtitle="Consultando la transacción seleccionada."
        onClose={onClose}
      >
        <DetailNotice
          title="Cargando detalle..."
          message="Estamos consultando la reserva, el cliente y el desglose del pago."
        />
      </PaymentDetailFrame>
    );
  }

  if (detail === null) {
    return (
      <PaymentDetailFrame
        title="Detalle de pago"
        subtitle="La transacción ya no está disponible."
        onClose={onClose}
      >
        <DetailNotice
          title="Detalle no disponible"
          message="No encontramos información para este pago."
        />
      </PaymentDetailFrame>
    );
  }

  return (
    <PaymentDetailFrame
      title={`Pago ${detail.bookingCode ?? detail.providerPaymentId ?? ""}`.trim()}
      subtitle={`${typeLabels[detail.type]} · ${providerLabel(detail.provider)}`}
      onClose={onClose}
    >
      <PaymentDetailSections detail={detail} />
    </PaymentDetailFrame>
  );
}

function PaymentDetailFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-[var(--shadow-pop)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-detail-title"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="payment-detail-title"
              className="text-display text-2xl font-black leading-tight"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-500)]">{subtitle}</p>
          </div>
          <button
            type="button"
            className="btn-icon shrink-0"
            onClick={onClose}
            aria-label="Cerrar detalle de pago"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4">{children}</div>
      </aside>
    </div>
  );
}

function PaymentDetailSections({ detail }: { detail: PaymentDetail }) {
  return (
    <>
      <DetailSection title="Resumen financiero">
        <DetailRow
          label="Valor total de la reserva"
          value={formatNullableCOP(detail.totalReservationAmount)}
        />
        <DetailRow
          label="Pagado por el jugador"
          value={formatNullableCOP(detail.grossAmount)}
        />
        <DetailRow
          label="Cargos Mercado Pago"
          value={formatNullableCOP(detail.totalDeductionsAmount)}
        />
        <DetailRow
          label="Neto recibido por el club"
          value={formatNullableCOP(detail.netReceivedAmount)}
        />
        <DetailRow
          label="Saldo pendiente en recepción"
          value={formatNullableCOP(detail.pendingAmountAtReception)}
        />
        <p className="mt-3 rounded-[var(--r-md)] bg-[var(--ink-50)] p-3 text-sm font-bold text-[var(--ink-600)]">
          El saldo pendiente se calcula con el valor bruto pagado por el jugador,
          no con el neto recibido por el club.
        </p>
      </DetailSection>

      <DetailSection title="Estado del pago">
        <DetailRow label="Estado" value={<StatusBadge status={detail.status} />} />
        <DetailRow label="Tipo" value={typeLabels[detail.type]} />
        <DetailRow label="Proveedor" value={providerLabel(detail.provider)} />
        <DetailRow
          label="Desglose financiero"
          value={financialSnapshotLabel(detail.financialSnapshotStatus)}
        />
        <DetailRow
          label="Observación"
          value={financialWarningLabel(detail.financialSnapshotWarning)}
        />
        <DetailRow
          label="Fecha de aprobación"
          value={formatReadableDate(detail.dateApproved)}
        />
        <DetailRow
          label="Fecha de liberación"
          value={formatReadableDate(detail.moneyReleaseDate)}
        />
      </DetailSection>

      <DetailSection title="Reserva asociada">
        <DetailRow label="Código" value={formatText(detail.bookingCode)} />
        <DetailRow
          label="Fecha"
          value={
            detail.reservationDate
              ? formatLocalDate(detail.reservationDate)
              : "No disponible"
          }
        />
        <DetailRow label="Horario" value={formatDetailSchedule(detail)} />
        <DetailRow label="Cancha" value={formatText(detail.courtName)} />
        <DetailRow
          label="Valor reserva"
          value={formatNullableCOP(detail.totalReservationAmount)}
        />
        <DetailRow label="Estado reserva" value="No disponible" />
      </DetailSection>

      <DetailSection title="Cliente">
        <DetailRow label="Cliente" value={formatText(detail.customerName)} />
        <DetailRow label="Celular" value={formatText(detail.customerPhone)} />
        <DetailRow label="Email" value="No disponible" />
      </DetailSection>

      <DetailSection title="Datos Mercado Pago">
        <DetailRow
          label="ID pago Mercado Pago"
          value={formatText(detail.providerPaymentId)}
          mono
        />
        <DetailRow
          label="ID merchant order"
          value={formatText(detail.providerMerchantOrderId)}
          mono
        />
        <DetailRow
          label="Método de pago"
          value={paymentMethodLabel(detail.paymentMethod)}
        />
        <DetailRow
          label="Medio de pago"
          value={formatText(detail.paymentMethodId)}
          mono
        />
        <DetailRow label="Cuotas" value={formatInstallments(detail.installments)} />
        <DetailRow label="Moneda" value="No disponible" />
        <DetailRow label="Creado" value={formatReadableDate(detail.createdAt)} />
        <DetailRow
          label="Actualizado"
          value={formatReadableDate(detail.updatedAt)}
        />
      </DetailSection>
    </>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] p-4">
      <h3 className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--ink-200)] py-2 last:border-0">
      <span className="text-[var(--ink-500)]">{label}</span>
      <span
        className={`max-w-[60%] text-right font-black text-[var(--ink-900)] ${
          mono ? "text-mono break-all text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DetailNotice({
  title,
  message,
  tone = "neutral",
}: {
  title: string;
  message: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`rounded-[var(--r-lg)] border p-5 ${
        tone === "error"
          ? "border-[var(--status-cancelled-bg)] bg-white text-[var(--status-cancelled-fg)]"
          : "border-[var(--ink-200)] bg-[var(--ink-50)] text-[var(--ink-700)]"
      }`}
    >
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm text-[var(--ink-500)]">{message}</p>
    </div>
  );
}

function FinancialSnapshotBadge({
  row,
}: {
  row: { financialSnapshotStatus: PaymentRow["financialSnapshotStatus"] };
}) {
  if (row.financialSnapshotStatus === "partial") {
    return (
      <span className="mt-2 inline-flex rounded-[var(--r-pill)] bg-[var(--status-pending-bg)] px-2 py-1 text-[11px] font-black text-[var(--status-pending-fg)]">
        Desglose parcial
      </span>
    );
  }

  if (row.financialSnapshotStatus === "unavailable") {
    return (
      <span className="mt-2 inline-flex rounded-[var(--r-pill)] bg-[var(--ink-100)] px-2 py-1 text-[11px] font-black text-[var(--ink-600)]">
        Sin desglose
      </span>
    );
  }

  return null;
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`pill ${statusClasses[status]}`}>
      <span className="dot" />
      {statusLabels[status]}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--court-100)] text-[var(--court-700)]">
          <CreditCard size={22} />
        </span>
        <h2 className="mt-4 text-xl font-black">Aún no hay pagos online</h2>
        <p className="mt-2 text-sm text-[var(--ink-500)]">
          Cuando los jugadores paguen anticipos o reservas online, las
          transacciones aparecerán aquí con el desglose de Mercado Pago.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <>
      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[128px] animate-pulse rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-4 shadow-[var(--shadow-sm)]"
          >
            <div className="h-3 w-24 rounded-full bg-[var(--ink-200)]" />
            <div className="mt-5 h-8 w-28 rounded-full bg-[var(--ink-200)]" />
            <div className="mt-4 h-3 w-32 rounded-full bg-[var(--ink-200)]" />
          </div>
        ))}
      </section>
      <div className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white p-8 text-center font-bold text-[var(--ink-500)] shadow-[var(--shadow-sm)]">
        Cargando pagos...
      </div>
    </>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--status-cancelled-bg)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex gap-3 text-[var(--status-cancelled-fg)]">
        <AlertCircle size={19} className="mt-0.5 shrink-0" />
        <p className="font-bold">{message}</p>
      </div>
    </div>
  );
}

function formatNullableCOP(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No disponible";
  }

  return formatCOP(value);
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No disponible";
  }

  return new Intl.NumberFormat("es-CO").format(value);
}

function formatText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "No disponible";

  const text = String(value).trim();
  return text || "No disponible";
}

function formatPaymentDate(row: PaymentRow) {
  const approved = parseDate(row.dateApproved);
  const created = parseDate(row.createdAt);
  const date = approved ?? created;

  if (!date) return "No disponible";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatReservationSummary(row: PaymentRow) {
  const date = row.reservationDate ? formatLocalDate(row.reservationDate) : null;
  const time =
    row.reservationStartTime && row.reservationEndTime
      ? `${row.reservationStartTime} - ${row.reservationEndTime}`
      : null;

  return [date, time].filter(Boolean).join(" · ") || "Reserva no disponible";
}

function formatLocalDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function formatDetailSchedule(detail: PaymentDetail) {
  if (!detail.reservationStartTime || !detail.reservationEndTime) {
    return "No disponible";
  }

  return `${detail.reservationStartTime} - ${detail.reservationEndTime}`;
}

function formatReadableDate(value: string | number | null | undefined) {
  const date = parseDate(value);

  if (!date) return "No disponible";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseDate(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function financialSnapshotLabel(
  status: PaymentRow["financialSnapshotStatus"],
) {
  return status ? financialSnapshotLabels[status] : "No disponible";
}

function financialWarningLabel(value: string | null | undefined) {
  if (!value) return "No disponible";

  if (value === "Mercado Pago did not return net_received_amount") {
    return "Mercado Pago no entregó el neto recibido para esta transacción.";
  }

  if (value === "Financial fields unavailable in provider payload") {
    return "Mercado Pago no entregó el desglose financiero para esta transacción.";
  }

  if (value === "Mercado Pago net_received_amount was greater than gross amount") {
    return "Mercado Pago entregó un neto recibido mayor al valor bruto.";
  }

  return value;
}

function paymentMethodLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    account_money: "Dinero en cuenta",
    bank_transfer: "Transferencia bancaria",
    credit_card: "Tarjeta de crédito",
    debit_card: "Tarjeta débito",
    ticket: "Efectivo",
  };
  const key = value?.trim();

  if (!key) return "No disponible";

  return labels[key] ?? key;
}

function formatInstallments(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "No disponible";
  }

  return value === 1 ? "1 cuota" : `${value} cuotas`;
}

function providerLabel(provider: PaymentRow["provider"]) {
  if (provider === "mercadopago") return "Mercado Pago";
  return provider;
}
