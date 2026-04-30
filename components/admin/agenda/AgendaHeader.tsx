import { Plus, Search } from "lucide-react";

import { formatDateLong } from "@/lib/dates";

export function AgendaHeader({
  clubName,
  localDate,
  search,
  onDateChange,
  onSearchChange,
  onNewBooking,
}: {
  clubName: string;
  localDate: string;
  search: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onNewBooking: () => void;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--ink-500)]">
          Agenda
        </p>
        <h1 className="text-display text-4xl font-black">{clubName}</h1>
        <p className="mt-1 text-[var(--ink-500)]">
          {formatDateLong(localDate)} Â· operaciÃ³n diaria
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="field min-w-44">
          <label htmlFor="agenda-date">Fecha</label>
          <input
            id="agenda-date"
            type="date"
            value={localDate}
            onChange={(event) => onDateChange(event.target.value)}
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
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cliente, celular o cÃ³digo"
            />
          </div>
        </div>
        <button className="btn btn-primary mt-5" onClick={onNewBooking}>
          <Plus size={17} />
          Nueva reserva
        </button>
      </div>
    </header>
  );
}
