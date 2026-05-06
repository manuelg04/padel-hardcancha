export function formatCOP(value: number) {
  const hasDecimals = !Number.isInteger(value);

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\s/g, "");
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function initials(name?: string) {
  if (!name) return "MP";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
