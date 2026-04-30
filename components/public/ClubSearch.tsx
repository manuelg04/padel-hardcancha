import { Search } from "lucide-react";

export function ClubSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>Buscar club</span>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]"
          size={17}
        />
        <input
          className="pl-10"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nombre, ciudad o direccion"
        />
      </div>
    </label>
  );
}
