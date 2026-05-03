type ConvexErrorData = {
  code?: unknown;
  message?: unknown;
};

export type PlayerBookingError = {
  code?: string;
  message: string;
  canReturnToAvailability: boolean;
};

const SLOT_TAKEN_MESSAGE =
  "Este horario ya no está disponible. Es posible que ya haya sido reservado. Por favor elige otro horario.";

const GENERIC_BOOKING_MESSAGE =
  "No pudimos crear la reserva. Vuelve a intentarlo o elige otro horario.";

function isErrorData(value: unknown): value is ConvexErrorData {
  return typeof value === "object" && value !== null;
}

function getConvexErrorData(error: unknown) {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }

  const data = (error as { data?: unknown }).data;
  return isErrorData(data) ? data : null;
}

function getCodeFromMessage(error: unknown) {
  if (!(error instanceof Error)) return undefined;

  const codeMatch = error.message.match(/["']code["']\s*:\s*["']([^"']+)["']/);
  return codeMatch?.[1];
}

export function getPlayerBookingError(error: unknown): PlayerBookingError {
  const data = getConvexErrorData(error);
  const code =
    typeof data?.code === "string" ? data.code : getCodeFromMessage(error);

  if (code === "SLOT_TAKEN") {
    return {
      code,
      message: SLOT_TAKEN_MESSAGE,
      canReturnToAvailability: true,
    };
  }

  if (typeof data?.message === "string" && data.message.trim()) {
    return {
      code,
      message: data.message,
      canReturnToAvailability: code === "INVALID_TIME" || code === "INVALID_COURT",
    };
  }

  return {
    code,
    message: GENERIC_BOOKING_MESSAGE,
    canReturnToAvailability: true,
  };
}
