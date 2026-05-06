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
    bookingStatus?: string;
    paymentStatus?: string;
    paymentOptionSelected?: string;
    estimatedMembershipDiscount?: number;
    estimatedTotal?: number;
    depositSuggestedAmount?: number;
    depositPaidAmount?: number;
    depositStatus?: string;
    estimatedBalanceDue?: number;
    membershipSnapshot?: unknown;
  } & Record<string, unknown>;
  court: {
    name: string;
  };
  club: {
    name: string;
    whatsapp: string;
  };
}) {
  return omitUndefinedFields({
    code: booking.code,
    localDate: booking.localDate,
    startMinutes: booking.startMinutes,
    endMinutes: booking.endMinutes,
    durationMinutes: booking.durationMinutes,
    value: booking.value,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    paymentOptionSelected: booking.paymentOptionSelected,
    estimatedMembershipDiscount: booking.estimatedMembershipDiscount,
    estimatedTotal: booking.estimatedTotal,
    depositSuggestedAmount: booking.depositSuggestedAmount,
    depositPaidAmount: booking.depositPaidAmount,
    depositStatus: booking.depositStatus,
    estimatedBalanceDue: booking.estimatedBalanceDue,
    membershipSnapshot: booking.membershipSnapshot,
    courtName: court.name,
    clubName: club.name,
    clubWhatsapp: club.whatsapp,
  });
}

export type PublicBookingReceipt = ReturnType<typeof buildPublicBookingReceipt>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function omitUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined),
  ) as T;
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
      bookingStatus:
        typeof value.bookingStatus === "string" ? value.bookingStatus : undefined,
      paymentStatus:
        typeof value.paymentStatus === "string" ? value.paymentStatus : undefined,
      paymentOptionSelected:
        typeof value.paymentOptionSelected === "string"
          ? value.paymentOptionSelected
          : undefined,
      estimatedMembershipDiscount:
        typeof value.estimatedMembershipDiscount === "number"
          ? value.estimatedMembershipDiscount
          : undefined,
      estimatedTotal:
        typeof value.estimatedTotal === "number" ? value.estimatedTotal : undefined,
      depositSuggestedAmount:
        typeof value.depositSuggestedAmount === "number"
          ? value.depositSuggestedAmount
          : undefined,
      depositPaidAmount:
        typeof value.depositPaidAmount === "number"
          ? value.depositPaidAmount
          : undefined,
      depositStatus:
        typeof value.depositStatus === "string" ? value.depositStatus : undefined,
      estimatedBalanceDue:
        typeof value.estimatedBalanceDue === "number"
          ? value.estimatedBalanceDue
          : undefined,
      membershipSnapshot: value.membershipSnapshot,
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
      bookingStatus:
        typeof booking.bookingStatus === "string"
          ? booking.bookingStatus
          : undefined,
      paymentStatus:
        typeof booking.paymentStatus === "string"
          ? booking.paymentStatus
          : undefined,
      paymentOptionSelected:
        typeof booking.paymentOptionSelected === "string"
          ? booking.paymentOptionSelected
          : undefined,
      estimatedMembershipDiscount:
        typeof booking.estimatedMembershipDiscount === "number"
          ? booking.estimatedMembershipDiscount
          : undefined,
      estimatedTotal:
        typeof booking.estimatedTotal === "number"
          ? booking.estimatedTotal
          : undefined,
      depositSuggestedAmount:
        typeof booking.depositSuggestedAmount === "number"
          ? booking.depositSuggestedAmount
          : undefined,
      depositPaidAmount:
        typeof booking.depositPaidAmount === "number"
          ? booking.depositPaidAmount
          : undefined,
      depositStatus:
        typeof booking.depositStatus === "string" ? booking.depositStatus : undefined,
      estimatedBalanceDue:
        typeof booking.estimatedBalanceDue === "number"
          ? booking.estimatedBalanceDue
          : undefined,
      membershipSnapshot: booking.membershipSnapshot,
    },
    court: { name: court.name },
    club: {
      name: value.clubName,
      whatsapp: value.clubWhatsapp,
    },
  });
}
