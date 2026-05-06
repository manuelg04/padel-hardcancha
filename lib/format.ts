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

const bookingStatusLabels: Record<string, string> = {
  payment_pending: "Pago pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  expired: "Expirada",
  blocked: "Bloqueada",
};

export function formatBookingStatus(value: string | null | undefined) {
  const status = value?.trim();

  if (!status) return "No disponible";

  const label = bookingStatusLabels[status];
  if (label) return label;

  const readable = status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return readable ? readable[0].toUpperCase() + readable.slice(1) : "No disponible";
}

export function formatCurrencyCode(value: string | null | undefined) {
  const currency = value?.trim();

  return currency ? currency.toUpperCase() : "No disponible";
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
