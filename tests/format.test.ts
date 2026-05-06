import { describe, expect, test } from "vitest";

import { formatBookingStatus, formatCOP, formatCurrencyCode } from "../lib/format";

describe("formatCOP", () => {
  test("preserves cents when Colombian peso values have decimals", () => {
    expect(formatCOP(30000)).toBe("$30.000");
    expect(formatCOP(2702.2)).toBe("$2.702,20");
    expect(formatCOP(27297.8)).toBe("$27.297,80");
    expect(formatCOP(0)).toBe("$0");
  });
});

describe("formatBookingStatus", () => {
  test("shows known booking statuses with user-facing labels", () => {
    expect(formatBookingStatus("payment_pending")).toBe("Pago pendiente");
    expect(formatBookingStatus("confirmed")).toBe("Confirmada");
    expect(formatBookingStatus("cancelled")).toBe("Cancelada");
    expect(formatBookingStatus("expired")).toBe("Expirada");
    expect(formatBookingStatus("blocked")).toBe("Bloqueada");
  });

  test("keeps missing and unknown booking statuses safe to read", () => {
    expect(formatBookingStatus(null)).toBe("No disponible");
    expect(formatBookingStatus("needs_manual_review")).toBe("Needs manual review");
  });
});

describe("formatCurrencyCode", () => {
  test("normalizes currency codes and keeps missing values unavailable", () => {
    expect(formatCurrencyCode("cop")).toBe("COP");
    expect(formatCurrencyCode(" ")).toBe("No disponible");
    expect(formatCurrencyCode(undefined)).toBe("No disponible");
  });
});
