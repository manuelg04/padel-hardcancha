import { describe, expect, test } from "vitest";

import {
  DEFAULT_PAYMENT_HOLD_MINUTES,
  getPaymentHoldExpiresAt,
  getPaymentHoldMinutes,
  mapMercadoPagoStatus,
  paymentLifecycleUpdatesForProviderStatus,
} from "../lib/paymentRules";

describe("payment hold rules", () => {
  test("uses a default hold when the club has no setting", () => {
    expect(getPaymentHoldMinutes()).toBe(DEFAULT_PAYMENT_HOLD_MINUTES);
    expect(getPaymentHoldExpiresAt(undefined, 1_000)).toBe(901_000);
  });

  test("uses the club hold when present", () => {
    expect(getPaymentHoldMinutes(30)).toBe(30);
    expect(getPaymentHoldExpiresAt(30, 1_000)).toBe(1_801_000);
  });
});

describe("Mercado Pago status mapping", () => {
  test("keeps known statuses and maps unknown values to error", () => {
    expect(mapMercadoPagoStatus("approved")).toBe("approved");
    expect(mapMercadoPagoStatus("pending")).toBe("pending");
    expect(mapMercadoPagoStatus("in_process")).toBe("in_process");
    expect(mapMercadoPagoStatus("charged_back")).toBe("charged_back");
    expect(mapMercadoPagoStatus("unknown")).toBe("error");
    expect(mapMercadoPagoStatus()).toBe("error");
  });
});

describe("payment lifecycle updates", () => {
  test("approves the payment and confirms the booking", () => {
    expect(
      paymentLifecycleUpdatesForProviderStatus({
        status: "approved",
        bookingStatus: "payment_pending",
        source: "online",
        now: 2_000,
        paidAt: 1_500,
      }),
    ).toEqual({
      payment: { paidAt: 1_500 },
      booking: {
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        paidAt: 1_500,
      },
    });
  });

  test("keeps manual bookings confirmed while payment is still pending", () => {
    expect(
      paymentLifecycleUpdatesForProviderStatus({
        status: "pending",
        bookingStatus: "confirmed",
        source: "manual",
        now: 2_000,
      }),
    ).toEqual({
      payment: {},
      booking: {
        paymentStatus: "pending",
        bookingStatus: undefined,
      },
    });
  });

  test("expires rejected payments immediately", () => {
    expect(
      paymentLifecycleUpdatesForProviderStatus({
        status: "rejected",
        bookingStatus: "payment_pending",
        source: "online",
        now: 2_000,
      }),
    ).toEqual({
      payment: { failedAt: 2_000 },
      booking: {
        paymentStatus: "failed",
        bookingStatus: "expired",
        expiredAt: 2_000,
      },
    });
  });

  test("only expires an error booking when it was waiting for payment", () => {
    expect(
      paymentLifecycleUpdatesForProviderStatus({
        status: "error",
        bookingStatus: "confirmed",
        source: "whatsapp",
        now: 2_000,
      }),
    ).toEqual({
      payment: { failedAt: 2_000 },
      booking: {
        paymentStatus: "failed",
        bookingStatus: undefined,
        expiredAt: undefined,
      },
    });
  });
});
