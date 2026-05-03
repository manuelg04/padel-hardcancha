import { CalendarDays, Clock3, Flame } from "lucide-react";

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
    {
      label: "Normal",
      value: normalPricePerHour,
      hint: "Tarifa base",
      icon: Clock3,
      className: "border-[var(--court-100)] bg-[var(--court-50)] text-[var(--court-800)]",
    },
    {
      label: "Hora pico",
      value: peakPricePerHour,
      hint: "Mayor demanda",
      icon: Flame,
      className: "border-[#f3d08a] bg-[#fff8e8] text-[#7a5200]",
    },
    {
      label: "Fin de semana",
      value: weekendPricePerHour,
      hint: "Sabados y domingos",
      icon: CalendarDays,
      className: "border-[#c9defc] bg-[#f0f6ff] text-[#1d4f8f]",
    },
  ] as const;

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3" : "sm:grid-cols-3"}`}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className={`rounded-[var(--r-lg)] border p-4 shadow-[var(--shadow-sm)] ${item.className}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 shadow-[var(--shadow-sm)]">
                <Icon size={17} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                Por hora
              </span>
            </div>
            <p className="text-sm font-black">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-[var(--ink-950)]">
              {formatCOP(item.value)}
            </p>
            <p className="mt-1 text-xs font-bold opacity-75">{item.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
