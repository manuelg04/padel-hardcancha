import { describe, expect, test } from "vitest";

import {
  PUBLIC_RESERVATION_PAYMENT_TYPES,
  applyReservationPaymentWebhookState,
  buildReservationPaymentExternalReference,
  calculateReservationDepositAmount,
  calculateReservationPaymentBreakdown,
  getPublicOnlineBookingRequiredError,
  getPublicReservationPaymentOptions,
  getReservationPaymentSubmitLabel,
  isReservationPaymentExternalReferenceForType,
} from "../lib/reservationPaymentOptionRules";

describe("reservation payment option calculations", () => {
  test("calculates the online deposit as one quarter of the reservation total", () => {
    expect(calculateReservationDepositAmount(60000)).toBe(15000);
    expect(calculateReservationDepositAmount(75000)).toBe(18750);
  });

  test("rejects zero or negative reservation totals", () => {
    expect(() => calculateReservationDepositAmount(0)).toThrow(
      "El total de la reserva debe ser mayor a cero.",
    );
    expect(() => calculateReservationPaymentBreakdown(-1, "deposit")).toThrow(
      "El total de la reserva debe ser mayor a cero.",
    );
  });

  test("keeps the deposit positive without exceeding the total", () => {
    expect(calculateReservationDepositAmount(1)).toBe(1);
    expect(calculateReservationDepositAmount(1)).toBeLessThanOrEqual(1);
  });

  test("only exposes online public reservation payment types", () => {
    expect(PUBLIC_RESERVATION_PAYMENT_TYPES).toEqual(["deposit", "full_payment"]);
    expect(PUBLIC_RESERVATION_PAYMENT_TYPES).not.toContain("pay_at_club");
    expect(PUBLIC_RESERVATION_PAYMENT_TYPES).not.toContain("transfer");
  });

  test("rejects offline payment types for public reservation breakdowns", () => {
    expect(() =>
      calculateReservationPaymentBreakdown(60000, "pay_at_club" as never),
    ).toThrow("Las reservas online requieren pago.");
  });

  test("builds the online deposit breakdown", () => {
    expect(calculateReservationPaymentBreakdown(60000, "deposit")).toEqual({
      onlineAmount: 15000,
      pendingAtReception: 45000,
      label: "Abonar online",
      description: "Paga el cuarto de cancha ahora y el saldo en el club.",
    });
  });

  test("builds the full online payment breakdown", () => {
    expect(calculateReservationPaymentBreakdown(60000, "full_payment")).toEqual({
      onlineAmount: 60000,
      pendingAtReception: 0,
      label: "Pagar completo online",
      description: "Paga el total de la reserva ahora.",
    });
  });

  test("builds the visible public options without offline fallbacks", () => {
    expect(
      getPublicReservationPaymentOptions({
        total: 60000,
        depositAvailable: true,
        fullPaymentAvailable: true,
      }),
    ).toEqual([
      {
        value: "deposit",
        onlineAmount: 15000,
        pendingAtReception: 45000,
        label: "Abonar online",
        description: "Paga el cuarto de cancha ahora y el saldo en el club.",
      },
      {
        value: "full_payment",
        onlineAmount: 60000,
        pendingAtReception: 0,
        label: "Pagar completo online",
        description: "Paga el total de la reserva ahora.",
      },
    ]);
  });

  test("returns no public confirmation option when online payments are unavailable", () => {
    expect(
      getPublicReservationPaymentOptions({
        total: 60000,
        depositAvailable: false,
        fullPaymentAvailable: false,
      }),
    ).toEqual([]);
  });

  test("returns the public button labels for online payment options", () => {
    expect(getReservationPaymentSubmitLabel("deposit", false)).toBe(
      "Abonar y reservar",
    );
    expect(getReservationPaymentSubmitLabel("full_payment", false)).toBe(
      "Pagar completo y reservar",
    );
    expect(getReservationPaymentSubmitLabel("full_payment", true)).toBe(
      "Redirigiendo a Mercado Pago...",
    );
  });

  test("uses a safe backend rejection for public offline booking attempts", () => {
    expect(getPublicOnlineBookingRequiredError()).toEqual({
      code: "ONLINE_PAYMENT_REQUIRED",
      message: "Las reservas online requieren pago.",
    });
  });
});

describe("reservation payment external references", () => {
  test("creates clear Mercado Pago external references per payment type", () => {
    expect(buildReservationPaymentExternalReference("deposit", "payment-1")).toBe(
      "deposit:payment-1",
    );
    expect(
      buildReservationPaymentExternalReference("full_payment", "payment-2"),
    ).toBe("full_payment:payment-2");
  });

  test("matches deposit and full payment references without breaking legacy deposits", () => {
    expect(
      isReservationPaymentExternalReferenceForType("deposit:payment-1", "deposit"),
    ).toBe(true);
    expect(
      isReservationPaymentExternalReferenceForType(
        "full_payment:payment-2",
        "full_payment",
      ),
    ).toBe(true);
    expect(
      isReservationPaymentExternalReferenceForType(
        "deposit:payment-1",
        "full_payment",
      ),
    ).toBe(false);
  });
});

describe("reservation payment webhook state", () => {
  test("uses the approved gross deposit amount for the reception balance", () => {
    expect(
      applyReservationPaymentWebhookState({
        paymentType: "deposit",
        currentDepositStatus: "pending",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 15000,
        providerStatus: "approved",
      }),
    ).toEqual({
      reservationPaymentStatus: "approved",
      bookingPaymentStatus: "pending",
      depositStatus: "paid",
      depositPaidAmount: 15000,
      estimatedBalanceDue: 45000,
      bookingStatus: "confirmed",
    });
  });

  test("marks an approved full payment as paid with no reception balance", () => {
    expect(
      applyReservationPaymentWebhookState({
        paymentType: "full_payment",
        currentDepositStatus: "none",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 60000,
        providerStatus: "approved",
      }),
    ).toEqual({
      reservationPaymentStatus: "approved",
      bookingPaymentStatus: "paid",
      depositStatus: "none",
      depositPaidAmount: 0,
      estimatedBalanceDue: 0,
      bookingStatus: "confirmed",
    });
  });

  test("does not confirm rejected payments or count them as paid", () => {
    expect(
      applyReservationPaymentWebhookState({
        paymentType: "full_payment",
        currentDepositStatus: "none",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 60000,
        providerStatus: "rejected",
      }),
    ).toEqual({
      reservationPaymentStatus: "rejected",
      bookingPaymentStatus: "failed",
      depositStatus: "none",
      depositPaidAmount: 0,
      estimatedBalanceDue: 60000,
      bookingStatus: "expired",
    });
  });

  test("keeps pending payments out of confirmed reservation state", () => {
    expect(
      applyReservationPaymentWebhookState({
        paymentType: "deposit",
        currentDepositStatus: "pending",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 15000,
        providerStatus: "pending",
      }),
    ).toMatchObject({
      reservationPaymentStatus: "pending",
      bookingPaymentStatus: "pending",
      bookingStatus: "payment_pending",
    });

    expect(
      applyReservationPaymentWebhookState({
        paymentType: "full_payment",
        currentDepositStatus: "none",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 60000,
        providerStatus: "pending",
      }),
    ).toMatchObject({
      reservationPaymentStatus: "pending",
      bookingPaymentStatus: "pending",
      bookingStatus: "payment_pending",
    });
  });

  test("does not downgrade an already approved full payment", () => {
    expect(
      applyReservationPaymentWebhookState({
        paymentType: "full_payment",
        currentReservationPaymentStatus: "approved",
        currentDepositStatus: "none",
        currentDepositPaidAmount: 0,
        estimatedTotal: 60000,
        paymentAmount: 60000,
        providerStatus: "pending",
      }),
    ).toEqual({
      reservationPaymentStatus: "approved",
      bookingPaymentStatus: "paid",
      depositStatus: "none",
      depositPaidAmount: 0,
      estimatedBalanceDue: 0,
      bookingStatus: "confirmed",
    });
  });
});
