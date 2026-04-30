export function ClubCityFilter({
  cities,
  value,
  onChange,
}: {
  cities: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>Ciudad</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todas las ciudades</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </label>
  );
}
