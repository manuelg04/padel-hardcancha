import type { BookingFilter } from "./types";

const filters: Array<[BookingFilter, string]> = [
  ["all", "Todas"],
  ["pending", "Pendientes"],
  ["paid", "Pagadas"],
  ["blocked", "Bloqueadas"],
];

export function AgendaFilters({
  value,
  onChange,
}: {
  value: BookingFilter;
  onChange: (value: BookingFilter) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {filters.map(([filterValue, label]) => (
        <button
          key={filterValue}
          className={`rounded-[var(--r-pill)] border px-4 py-2 text-sm font-black ${
            value === filterValue
              ? "border-[var(--court-600)] bg-[var(--court-500)] text-white"
              : "border-[var(--ink-200)] bg-white text-[var(--ink-700)]"
          }`}
          onClick={() => onChange(filterValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
