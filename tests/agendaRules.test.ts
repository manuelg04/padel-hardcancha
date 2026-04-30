import { describe, expect, test } from "vitest";

import {
  bookingMatchesFilter,
  bookingStatusLabel,
  paymentStatusLabel,
  sourceLabel,
  type AgendaBookingForRules,
} from "../components/admin/agendaRules";

const baseBooking: AgendaBookingForRules = {
  code: "MP-12345",
  customerName: "Manuel Gonzalez",
  customerPhone: "3001234567",
  source: "whatsapp",
  paymentStatus: "pending",
  bookingStatus: "confirmed",
};

describe("agenda labels", () => {
  test("keeps the existing Spanish labels", () => {
    expect(sourceLabel("online")).toBe("Reserva online");
    expect(sourceLabel("walk_in")).toBe("Presencial");
    expect(bookingStatusLabel("payment_pending")).toBe("Pendiente de pago");
    expect(paymentStatusLabel("no_payment_required")).toBe("No requiere pago");
  });
});

describe("agenda filters", () => {
  test("matches pending and paid bookings without including blocks", () => {
    expect(bookingMatchesFilter(baseBooking, "pending", "")).toBe(true);
    expect(
      bookingMatchesFilter(
        { ...baseBooking, bookingStatus: "blocked" },
        "pending",
        "",
      ),
    ).toBe(false);
    expect(
      bookingMatchesFilter(
        { ...baseBooking, paymentStatus: "paid" },
        "paid",
        "",
      ),
    ).toBe(true);
  });

  test("searches by code, name, and phone", () => {
    expect(bookingMatchesFilter(baseBooking, "all", "mp-123")).toBe(true);
    expect(bookingMatchesFilter(baseBooking, "all", "gonzalez")).toBe(true);
    expect(bookingMatchesFilter(baseBooking, "all", "4567")).toBe(true);
    expect(bookingMatchesFilter(baseBooking, "all", "otra persona")).toBe(
      false,
    );
  });
});
