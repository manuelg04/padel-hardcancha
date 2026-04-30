import { formatCOP } from "@/lib/format";

export function ClubPriceSummary({
  normalPricePerHour,
  peakPricePerHour,
  weekendPricePerHour,
  compact = false,
}: {
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  compact?: boolean;
}) {
  const items = [
    ["Normal", normalPricePerHour],
    ["Hora pico", peakPricePerHour],
    ["Fin de semana", weekendPricePerHour],
  ] as const;

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[var(--r-md)] border border-[var(--ink-200)] bg-white p-3"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-500)]">
            {label}
          </p>
          <p className="mt-1 font-black text-[var(--ink-950)]">{formatCOP(value)}</p>
        </div>
      ))}
    </div>
  );
}
