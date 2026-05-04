export const BOOKING_CODE_RANDOM_BYTES = 16;

export function isSeedTokenAuthorized(
  providedToken?: string,
  configuredToken?: string,
) {
  const expected = configuredToken?.trim();
  return Boolean(expected) && providedToken === expected;
}

export function formatBookingCode(bytes: Uint8Array) {
  if (bytes.length < BOOKING_CODE_RANDOM_BYTES) {
    throw new Error("No hay suficiente entropia para el codigo de reserva.");
  }

  const suffix = Array.from(bytes)
    .slice(0, BOOKING_CODE_RANDOM_BYTES)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return `RES-${suffix}`;
}

export function buildPublicAvailabilitySlot<TCourtId>({
  courtId,
  courtName,
  courtDescription,
  isCovered,
  startMinutes,
  endMinutes,
  durationMinutes,
  value,
  isAvailable,
}: {
  courtId: TCourtId;
  courtName: string;
  courtDescription: string;
  isCovered: boolean;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  value: number;
  isAvailable: boolean;
}) {
  return {
    courtId,
    courtName,
    courtDescription,
    isCovered,
    startMinutes,
    endMinutes,
    durationMinutes,
    value,
    isAvailable,
  };
}

export function buildPublicBookingReceipt({
  booking,
  court,
  club,
}: {
  booking: {
    code: string;
    localDate: string;
    startMinutes: number;
    endMinutes: number;
    durationMinutes: number;
    value: number;
  } & Record<string, unknown>;
  court: {
    name: string;
  };
  club: {
    name: string;
    whatsapp: string;
  };
}) {
  return {
    code: booking.code,
    localDate: booking.localDate,
    startMinutes: booking.startMinutes,
    endMinutes: booking.endMinutes,
    durationMinutes: booking.durationMinutes,
    value: booking.value,
    courtName: court.name,
    clubName: club.name,
    clubWhatsapp: club.whatsapp,
  };
}

export type PublicBookingReceipt = ReturnType<typeof buildPublicBookingReceipt>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasPublicReceiptFields(
  value: Record<string, unknown>,
): value is PublicBookingReceipt & Record<string, unknown> {
  return (
    typeof value.code === "string" &&
    typeof value.localDate === "string" &&
    typeof value.startMinutes === "number" &&
    typeof value.endMinutes === "number" &&
    typeof value.durationMinutes === "number" &&
    typeof value.value === "number" &&
    typeof value.courtName === "string" &&
    typeof value.clubName === "string" &&
    typeof value.clubWhatsapp === "string"
  );
}

export function normalizePublicBookingReceiptResponse(
  value: unknown,
): PublicBookingReceipt | null {
  if (!isRecord(value)) return null;

  if (hasPublicReceiptFields(value)) {
    return {
      code: value.code,
      localDate: value.localDate,
      startMinutes: value.startMinutes,
      endMinutes: value.endMinutes,
      durationMinutes: value.durationMinutes,
      value: value.value,
      courtName: value.courtName,
      clubName: value.clubName,
      clubWhatsapp: value.clubWhatsapp,
    };
  }

  const booking = value.booking;
  const court = value.court;

  if (
    !isRecord(booking) ||
    !isRecord(court) ||
    typeof value.clubName !== "string" ||
    typeof value.clubWhatsapp !== "string" ||
    typeof court.name !== "string" ||
    typeof booking.code !== "string" ||
    typeof booking.localDate !== "string" ||
    typeof booking.startMinutes !== "number" ||
    typeof booking.endMinutes !== "number" ||
    typeof booking.durationMinutes !== "number" ||
    typeof booking.value !== "number"
  ) {
    return null;
  }

  return buildPublicBookingReceipt({
    booking: {
      code: booking.code,
      localDate: booking.localDate,
      startMinutes: booking.startMinutes,
      endMinutes: booking.endMinutes,
      durationMinutes: booking.durationMinutes,
      value: booking.value,
    },
    court: { name: court.name },
    club: {
      name: value.clubName,
      whatsapp: value.clubWhatsapp,
    },
  });
}
