import { BOGOTA_TIMEZONE, SLOT_MINUTES } from "./bookingRules";

export function todayBogota() {
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: BOGOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function addDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function formatDateLong(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateShort(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function minutesToTime(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function minutesToRange(startMinutes: number, endMinutes: number) {
  return `${minutesToTime(startMinutes)} - ${minutesToTime(endMinutes)}`;
}

export function minutesToInput(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function inputToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function getHourRows(openMinutes: number, closeMinutes: number) {
  const rows = [];

  for (let minutes = openMinutes; minutes < closeMinutes; minutes += SLOT_MINUTES) {
    rows.push(minutes);
  }

  return rows;
}
