export const BOGOTA_TIMEZONE = "America/Bogota";
export const SLOT_MINUTES = 60;

export type PricingRules = {
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  peakStartMinutes: number;
  peakEndMinutes: number;
};

export type BookingInterval = {
  startMinutes: number;
  endMinutes: number;
  bookingStatus:
    | "payment_pending"
    | "confirmed"
    | "cancelled"
    | "expired"
    | "blocked";
  paymentExpiresAt?: number;
};

export function getLocalDayOfWeek(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isWeekend(localDate: string) {
  const day = getLocalDayOfWeek(localDate);
  return day === 0 || day === 6;
}

export function getHourlyPrice(
  localDate: string,
  startMinutes: number,
  pricing: PricingRules,
) {
  if (isWeekend(localDate)) {
    return pricing.weekendPricePerHour;
  }

  if (
    startMinutes >= pricing.peakStartMinutes &&
    startMinutes < pricing.peakEndMinutes
  ) {
    return pricing.peakPricePerHour;
  }

  return pricing.normalPricePerHour;
}

export function calculateBookingValue(
  localDate: string,
  startMinutes: number,
  durationMinutes: number,
  pricing: PricingRules,
) {
  let total = 0;

  for (let offset = 0; offset < durationMinutes; offset += SLOT_MINUTES) {
    total += getHourlyPrice(localDate, startMinutes + offset, pricing);
  }

  return total;
}

export function bookingOverlaps(
  existing: Pick<BookingInterval, "startMinutes" | "endMinutes">,
  requestedStartMinutes: number,
  requestedEndMinutes: number,
) {
  return (
    existing.startMinutes < requestedEndMinutes &&
    existing.endMinutes > requestedStartMinutes
  );
}

export function isActiveBookingStatus(
  status: BookingInterval["bookingStatus"],
  paymentExpiresAt?: number,
  now = Date.now(),
) {
  if (status === "confirmed" || status === "blocked") return true;
  if (status !== "payment_pending") return false;
  return typeof paymentExpiresAt === "number" && paymentExpiresAt > now;
}

export function isActiveBooking(booking: BookingInterval, now = Date.now()) {
  return isActiveBookingStatus(
    booking.bookingStatus,
    booking.paymentExpiresAt,
    now,
  );
}

export function isSlotAvailableForDuration(
  startMinutes: number,
  durationMinutes: number,
  bookings: readonly BookingInterval[],
  now = Date.now(),
) {
  const requestedEndMinutes = startMinutes + durationMinutes;

  return !bookings.some(
    (booking) =>
      isActiveBooking(booking, now) &&
      bookingOverlaps(booking, startMinutes, requestedEndMinutes),
  );
}

export function isValidDuration(durationMinutes: number) {
  return durationMinutes === SLOT_MINUTES || durationMinutes === SLOT_MINUTES * 2;
}

export function assertValidBookingWindow(
  startMinutes: number,
  durationMinutes: number,
  openMinutes: number,
  closeMinutes: number,
) {
  const endMinutes = startMinutes + durationMinutes;

  return (
    isValidDuration(durationMinutes) &&
    startMinutes >= openMinutes &&
    endMinutes <= closeMinutes &&
    startMinutes % SLOT_MINUTES === 0
  );
}
