export type AgendaBookingFilter = "all" | "pending" | "paid" | "blocked";

export type AgendaBookingForRules = {
  code: string;
  customerName?: string;
  customerPhone?: string;
  source: "online" | "manual" | "whatsapp" | "walk_in" | "phone";
  paymentStatus:
    | "pending"
    | "paid"
    | "failed"
    | "expired"
    | "refunded"
    | "no_payment_required";
  bookingStatus:
    | "payment_pending"
    | "confirmed"
    | "cancelled"
    | "expired"
    | "blocked";
};

export const sourceLabel = (source: AgendaBookingForRules["source"]) => {
  const labels: Record<AgendaBookingForRules["source"], string> = {
    online: "Reserva online",
    manual: "Manual",
    whatsapp: "WhatsApp",
    walk_in: "Presencial",
    phone: "Telefono",
  };

  return labels[source];
};

export const bookingStatusLabel = (
  status: AgendaBookingForRules["bookingStatus"],
) => {
  const labels: Record<AgendaBookingForRules["bookingStatus"], string> = {
    payment_pending: "Pendiente de pago",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    expired: "Expirada",
    blocked: "Bloqueada",
  };

  return labels[status];
};

export const paymentStatusLabel = (
  status: AgendaBookingForRules["paymentStatus"],
) => {
  const labels: Record<AgendaBookingForRules["paymentStatus"], string> = {
    pending: "Pendiente",
    paid: "Pagada",
    failed: "Fallida",
    expired: "Vencida",
    refunded: "Reembolsada",
    no_payment_required: "No requiere pago",
  };

  return labels[status];
};

export const bookingMatchesFilter = (
  booking: AgendaBookingForRules,
  filter: AgendaBookingFilter,
  search: string,
) => {
  const matchesFilter =
    filter === "all" ||
    (filter === "blocked" && booking.bookingStatus === "blocked") ||
    (filter === "pending" &&
      booking.bookingStatus !== "blocked" &&
      booking.paymentStatus === "pending") ||
    (filter === "paid" &&
      booking.bookingStatus !== "blocked" &&
      booking.paymentStatus === "paid");

  if (!matchesFilter) return false;

  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [booking.code, booking.customerName, booking.customerPhone]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(term));
};
