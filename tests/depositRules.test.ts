import { describe, expect, test } from "vitest";

import {
  applyDepositWebhookState,
  calculateFinalBalanceDue,
  calculateSuggestedDeposit,
  type ClubDepositSettings,
} from "../lib/depositRules";

const defaultSettings = {
  onlineDepositsEnabled: true,
  depositMode: "optional" as const,
  depositType: "percentage" as const,
  depositPercentage: 25,
  depositFixedAmount: null,
  depositMinAmount: 30000,
  depositMaxAmount: 60000,
  depositRoundingAmount: 5000,
  depositApplyAfterMembershipDiscounts: true,
  allowPayAtClub: true,
};

function calculate(input: {
  total: number;
  discount?: number;
  waiver?: boolean;
  settings?: ClubDepositSettings;
}) {
  return calculateSuggestedDeposit({
    baseReservationTotal: input.total,
    estimatedMembershipDiscount: input.discount ?? 0,
    playerHasDepositWaiver: input.waiver ?? false,
    clubDepositSettings: {
      ...defaultSettings,
      ...input.settings,
    },
  }).depositAmount;
}

describe("deposit calculation", () => {
  test("calculates the expected percentage deposits", () => {
    expect(calculate({ total: 120000 })).toBe(30000);
    expect(calculate({ total: 150000 })).toBe(40000);
    expect(calculate({ total: 90000 })).toBe(30000);
    expect(calculate({ total: 300000 })).toBe(60000);
  });

  test("applies membership discounts before calculating the deposit", () => {
    expect(calculate({ total: 120000, discount: 30000 })).toBe(30000);
  });

  test("caps the deposit when the payable total is below the minimum", () => {
    expect(calculate({ total: 20000 })).toBe(20000);
  });

  test("returns zero when the player has a deposit waiver", () => {
    expect(calculate({ total: 120000, waiver: true })).toBe(0);
  });

  test("supports fixed deposits and rounding", () => {
    expect(
      calculate({
        total: 120000,
        settings: {
          depositType: "fixed",
          depositFixedAmount: 37500,
        },
      }),
    ).toBe(40000);
  });
});

describe("deposit webhook state", () => {
  test("marks an approved webhook as paid and discounts the balance", () => {
    expect(
      applyDepositWebhookState({
        currentDepositStatus: "pending",
        currentDepositPaidAmount: 0,
        estimatedTotal: 120000,
        paymentAmount: 30000,
        providerStatus: "approved",
      }),
    ).toEqual({
      paymentStatus: "approved",
      depositStatus: "paid",
      depositPaidAmount: 30000,
      estimatedBalanceDue: 90000,
    });
  });

  test("marks a failed webhook without cancelling or charging the reservation", () => {
    expect(
      applyDepositWebhookState({
        currentDepositStatus: "pending",
        currentDepositPaidAmount: 0,
        estimatedTotal: 120000,
        paymentAmount: 30000,
        providerStatus: "rejected",
      }),
    ).toEqual({
      paymentStatus: "rejected",
      depositStatus: "failed",
      depositPaidAmount: 0,
      estimatedBalanceDue: 120000,
    });
  });

  test("keeps duplicate approved webhooks from adding the deposit twice", () => {
    expect(
      applyDepositWebhookState({
        currentDepositStatus: "paid",
        currentDepositPaidAmount: 30000,
        estimatedTotal: 120000,
        paymentAmount: 30000,
        providerStatus: "approved",
      }),
    ).toMatchObject({
      depositStatus: "paid",
      depositPaidAmount: 30000,
      estimatedBalanceDue: 90000,
    });
  });

  test("leaves a reservation without deposit payable at the club", () => {
    expect(calculateFinalBalanceDue(120000, 0)).toBe(120000);
  });
});
