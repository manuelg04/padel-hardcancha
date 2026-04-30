export function ClubStatusBadge({
  active,
  label,
  positiveLabel,
  negativeLabel,
}: {
  active: boolean;
  label?: string;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  return (
    <span className={`pill ${active ? "pill-available" : "pill-blocked"}`}>
      <span className="dot" />
      {label ?? (active ? positiveLabel ?? "Activo" : negativeLabel ?? "Inactivo")}
    </span>
  );
}
