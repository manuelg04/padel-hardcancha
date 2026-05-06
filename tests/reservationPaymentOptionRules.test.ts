import { describe, expect, test } from "vitest";

import {
  applyReservationPaymentWebhookState,
  buildReservationPaymentExternalReference,
  calculateReservationDepositAmount,
  calculateReservationPaymentBreakdown,
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

  test("builds the pay-at-club breakdown", () => {
    expect(calculateReservationPaymentBreakdown(60000, "pay_at_club")).toEqual({
      onlineAmount: 0,
      pendingAtReception: 60000,
      label: "Pago en club",
      description: "Reserva ahora y paga el total en recepcion.",
    });
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

  test("returns the public button labels for each payment option", () => {
    expect(getReservationPaymentSubmitLabel("pay_at_club", false)).toBe(
      "Confirmar reserva",
    );
    expect(getReservationPaymentSubmitLabel("deposit", false)).toBe(
      "Abonar y reservar",
    );
    expect(getReservationPaymentSubmitLabel("full_payment", false)).toBe(
      "Pagar completo",
    );
    expect(getReservationPaymentSubmitLabel("full_payment", true)).toBe(
      "Abriendo Mercado Pago...",
    );
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
