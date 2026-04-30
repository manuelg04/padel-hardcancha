import { formatCOP } from "@/lib/format";

type AgendaMetricsValue = {
  reservationsToday: number;
  pending: number;
  occupancy: number;
  occupiedSlots: number;
  totalSlots: number;
  expectedRevenue: number;
  blocks: number;
};

export function AgendaMetrics({
  metrics,
  courtCount,
}: {
  metrics: AgendaMetricsValue;
  courtCount: number;
}) {
  return (
    <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        label="Reservas hoy"
        value={String(metrics.reservationsToday)}
        hint={`${metrics.pending} pendientes`}
      />
      <MetricCard
        label="OcupaciÃ³n"
        value={`${metrics.occupancy}%`}
        hint={`${metrics.occupiedSlots} / ${metrics.totalSlots} slots`}
      />
      <MetricCard
        label="Ingresos esperados"
        value={formatCOP(metrics.expectedRevenue)}
        hint="Hoy"
      />
      <MetricCard
        label="Bloqueos"
        value={String(metrics.blocks)}
        hint="Mantto + torneo"
      />
      <MetricCard label="Canchas" value={String(courtCount)} hint="Activas" />
    </section>
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
