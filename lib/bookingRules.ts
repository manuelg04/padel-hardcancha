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

export function isActiveBookingStatus(status: BookingInterval["bookingStatus"]) {
  return status === "confirmed" || status === "payment_pending" || status === "blocked";
}

export function isSlotAvailableForDuration(
  startMinutes: number,
  durationMinutes: number,
  bookings: readonly BookingInterval[],
) {
  const requestedEndMinutes = startMinutes + durationMinutes;

  return !bookings.some(
    (booking) =>
      isActiveBookingStatus(booking.bookingStatus) &&
      bookingOverlaps(booking, startMinutes, requestedEndMinutes),
  );
}

export function isValidDuration(durationMinutes: number) {
  return durationMinutes === SLOT_MINUTES || durationMinutes === SLOT_MINUTES * 2;
}

export function getBogotaNowParts(now: Date | number = Date.now()) {
  const date = typeof now === "number" ? new Date(now) : now;
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return {
    localDate: `${year}-${month}-${day}`,
    currentMinutes: hour * 60 + minute,
  };
}

export function getPastSlotCutoffMinutes(
  localDate: string,
  closeMinutes: number,
  now: Date | number = Date.now(),
) {
  const current = getBogotaNowParts(now);

  if (localDate < current.localDate) {
    return closeMinutes;
  }

  if (localDate === current.localDate) {
    return current.currentMinutes;
  }

  return null;
}

export function isSlotStartBookable(
  localDate: string,
  startMinutes: number,
  now: Date | number = Date.now(),
) {
  const current = getBogotaNowParts(now);

  if (localDate < current.localDate) {
    return false;
  }

  if (localDate === current.localDate) {
    return startMinutes > current.currentMinutes;
  }

  return true;
}

export function getNextBookableSlotStartMinutes(
  openMinutes: number,
  closeMinutes: number,
  localDate: string,
  now: Date | number = Date.now(),
) {
  for (
    let startMinutes = openMinutes;
    startMinutes < closeMinutes;
    startMinutes += SLOT_MINUTES
  ) {
    if (isSlotStartBookable(localDate, startMinutes, now)) {
      return startMinutes;
    }
  }

  return null;
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
