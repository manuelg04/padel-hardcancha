import { describe, expect, test } from "vitest";

import { getPlayerBookingError } from "../lib/playerBookingErrors";

describe("player booking errors", () => {
  test("shows a friendly message for structured slot conflicts", () => {
    const result = getPlayerBookingError({
      data: {
        code: "SLOT_TAKEN",
        message: "Este horario ya no está disponible. Elige otro horario.",
      },
    });

    expect(result).toEqual({
      code: "SLOT_TAKEN",
      message:
        "Este horario ya no está disponible. Es posible que ya haya sido reservado. Por favor elige otro horario.",
      canReturnToAvailability: true,
    });
  });

  test("recognizes slot conflicts from the technical error message fallback", () => {
    const result = getPlayerBookingError(
      new Error(
        '[CONVEX M(bookings:createOnlineBooking)] Server Error ConvexError: {"code":"SLOT_TAKEN","message":"Este horario ya no está disponible."}',
      ),
    );

    expect(result.code).toBe("SLOT_TAKEN");
    expect(result.message).not.toContain("[CONVEX");
    expect(result.message).not.toContain("Server Error");
  });

  test("does not expose technical details for unknown failures", () => {
    const result = getPlayerBookingError(
      new Error("[CONVEX M(bookings:createOnlineBooking)] Called by client"),
    );

    expect(result.message).toBe(
      "No pudimos crear la reserva. Vuelve a intentarlo o elige otro horario.",
    );
  });
});
