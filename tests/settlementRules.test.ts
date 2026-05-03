import { describe, expect, test } from "vitest";

import { calculateBookingSettlement } from "../lib/settlementRules";

const bookingDate = "2026-05-04";
const bookingStartMinutes = 19 * 60;

const freeMember = (customerId: string, displayName: string) => ({
  customerId,
  displayName,
  membershipId: `membership:${customerId}`,
  membershipPlanId: "plan:free",
  membershipPlanName: "Gratis",
  benefitType: "free" as const,
  appliesAlways: true,
});

describe("booking settlement rules", () => {
  test("charges the full booking value when no members are selected", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [],
      }),
    ).toMatchObject({
      baseBookingValue: 120000,
      baseShareValue: 30000,
      playerSlots: 4,
      memberCount: 0,
      nonMemberCount: 4,
      nonMemberTotalValue: 120000,
      calculatedTotalCollectedValue: 120000,
      finalTotalCollectedValue: 120000,
      discountAbsorbedByClubValue: 0,
    });
  });

  test("rounds an uneven base share down so players are not overcharged", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 100003,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [],
      }),
    ).toMatchObject({
      baseBookingValue: 100003,
      baseShareValue: 25000,
      nonMemberTotalValue: 100000,
      finalTotalCollectedValue: 100000,
      discountAbsorbedByClubValue: 3,
    });
  });

  test("applies one free member benefit", () => {
    const settlement = calculateBookingSettlement({
      bookingValue: 120000,
      bookingDate,
      bookingStartMinutes,
      selectedMembers: [freeMember("customer:valentina", "Valentina")],
    });

    expect(settlement.memberCharges[0]).toMatchObject({
      customerId: "customer:valentina",
      customerName: "Valentina",
      benefitApplied: true,
      chargedValue: 0,
      discountValue: 30000,
    });
    expect(settlement).toMatchObject({
      nonMemberCount: 3,
      nonMemberTotalValue: 90000,
      finalTotalCollectedValue: 90000,
      discountAbsorbedByClubValue: 30000,
    });
  });

  test("applies two free member benefits", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [
          freeMember("customer:valentina", "Valentina"),
          freeMember("customer:james", "James"),
        ],
      }),
    ).toMatchObject({
      nonMemberCount: 2,
      nonMemberTotalValue: 60000,
      finalTotalCollectedValue: 60000,
      discountAbsorbedByClubValue: 60000,
    });
  });

  test("applies four free member benefits", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [
          freeMember("customer:1", "Uno"),
          freeMember("customer:2", "Dos"),
          freeMember("customer:3", "Tres"),
          freeMember("customer:4", "Cuatro"),
        ],
      }),
    ).toMatchObject({
      nonMemberCount: 0,
      nonMemberTotalValue: 0,
      finalTotalCollectedValue: 0,
      discountAbsorbedByClubValue: 120000,
    });
  });

  test("applies a percentage discount member benefit", () => {
    const settlement = calculateBookingSettlement({
      bookingValue: 120000,
      bookingDate,
      bookingStartMinutes,
      selectedMembers: [
        {
          customerId: "customer:ana",
          displayName: "Ana",
          membershipId: "membership:ana",
          membershipPlanId: "plan:discount",
          membershipPlanName: "30%",
          benefitType: "percentage_discount",
          discountPercent: 30,
          appliesAlways: true,
        },
      ],
    });

    expect(settlement.memberCharges[0]).toMatchObject({
      chargedValue: 21000,
      discountValue: 9000,
    });
    expect(settlement).toMatchObject({
      nonMemberTotalValue: 90000,
      finalTotalCollectedValue: 111000,
      discountAbsorbedByClubValue: 9000,
    });
  });

  test("applies a fixed price member benefit", () => {
    const settlement = calculateBookingSettlement({
      bookingValue: 120000,
      bookingDate,
      bookingStartMinutes,
      selectedMembers: [
        {
          customerId: "customer:felipe",
          displayName: "Felipe",
          membershipId: "membership:felipe",
          membershipPlanId: "plan:fixed",
          membershipPlanName: "Fijo",
          benefitType: "fixed_price",
          fixedPrice: 15000,
          appliesAlways: true,
        },
      ],
    });

    expect(settlement.memberCharges[0]).toMatchObject({
      chargedValue: 15000,
      discountValue: 15000,
    });
    expect(settlement).toMatchObject({
      finalTotalCollectedValue: 105000,
      discountAbsorbedByClubValue: 15000,
    });
  });

  test("charges the base share when the plan does not apply by schedule", () => {
    const settlement = calculateBookingSettlement({
      bookingValue: 120000,
      bookingDate,
      bookingStartMinutes,
      selectedMembers: [
        {
          customerId: "customer:laura",
          displayName: "Laura",
          membershipId: "membership:laura",
          membershipPlanId: "plan:valle",
          membershipPlanName: "Valle",
          benefitType: "free",
          appliesAlways: false,
          validDaysOfWeek: [1, 2, 3, 4, 5],
          validStartTime: "06:00",
          validEndTime: "18:00",
        },
      ],
    });

    expect(settlement.memberCharges[0]).toMatchObject({
      benefitApplied: false,
      benefitNotAppliedReason: "outside_schedule",
      chargedValue: 30000,
      discountValue: 0,
    });
    expect(settlement.discountAbsorbedByClubValue).toBe(0);
  });

  test("charges the base share when the plan does not apply by day", () => {
    const settlement = calculateBookingSettlement({
      bookingValue: 120000,
      bookingDate,
      bookingStartMinutes,
      selectedMembers: [
        {
          customerId: "customer:laura",
          displayName: "Laura",
          membershipId: "membership:laura",
          membershipPlanId: "plan:fin-de-semana",
          membershipPlanName: "Fin de semana",
          benefitType: "free",
          appliesAlways: false,
          validDaysOfWeek: [0, 6],
        },
      ],
    });

    expect(settlement.memberCharges[0]).toMatchObject({
      benefitApplied: false,
      benefitNotAppliedReason: "outside_schedule",
      chargedValue: 30000,
      discountValue: 0,
    });
    expect(settlement.discountAbsorbedByClubValue).toBe(0);
  });

  test("rejects more than four selected members", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [
          freeMember("customer:1", "Uno"),
          freeMember("customer:2", "Dos"),
          freeMember("customer:3", "Tres"),
          freeMember("customer:4", "Cuatro"),
          freeMember("customer:5", "Cinco"),
        ],
      }),
    ).toThrow("No puedes seleccionar mas miembros que cupos.");
  });

  test("rejects duplicated selected members", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [
          freeMember("customer:1", "Uno"),
          freeMember("customer:1", "Uno"),
        ],
      }),
    ).toThrow("No puedes seleccionar el mismo cliente dos veces.");
  });

  test("rejects manual adjustments without a reason", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [],
        manualAdjustmentAmount: -5000,
      }),
    ).toThrow("El ajuste manual requiere una razon.");
  });

  test("applies a valid negative manual adjustment", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [freeMember("customer:valentina", "Valentina")],
        manualAdjustmentAmount: -5000,
        manualAdjustmentReason: "Cortesia autorizada",
      }),
    ).toMatchObject({
      calculatedTotalCollectedValue: 90000,
      manualAdjustmentAmount: -5000,
      manualAdjustmentReason: "Cortesia autorizada",
      finalTotalCollectedValue: 85000,
      discountAbsorbedByClubValue: 35000,
    });
  });

  test("rejects manual adjustments that make the final total negative", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [freeMember("customer:valentina", "Valentina")],
        manualAdjustmentAmount: -95000,
        manualAdjustmentReason: "Cortesia autorizada",
      }),
    ).toThrow("El total final no puede ser negativo.");
  });

  test("allows a positive manual adjustment only while it does not overcharge", () => {
    expect(
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [freeMember("customer:valentina", "Valentina")],
        manualAdjustmentAmount: 5000,
        manualAdjustmentReason: "Cobro de alquiler",
      }),
    ).toMatchObject({
      calculatedTotalCollectedValue: 90000,
      finalTotalCollectedValue: 95000,
      discountAbsorbedByClubValue: 25000,
    });

    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [],
        manualAdjustmentAmount: 1000,
        manualAdjustmentReason: "Cobro adicional",
      }),
    ).toThrow("La liquidacion no permite sobrecargos en este MVP.");
  });

  test("rejects fixed prices above the base player share", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        selectedMembers: [
          {
            customerId: "customer:felipe",
            displayName: "Felipe",
            membershipId: "membership:felipe",
            membershipPlanId: "plan:fixed",
            membershipPlanName: "Fijo",
            benefitType: "fixed_price",
            fixedPrice: 40000,
            appliesAlways: true,
          },
          freeMember("customer:valentina", "Valentina"),
        ],
      }),
    ).toThrow("El precio fijo no puede ser mayor que la base por jugador.");
  });

  test.each([0, -1, 120000.5])(
    "rejects invalid booking value %s",
    (bookingValue) => {
      expect(() =>
        calculateBookingSettlement({
          bookingValue,
          bookingDate,
          bookingStartMinutes,
          selectedMembers: [],
        }),
      ).toThrow("El valor de la reserva no es valido.");
    },
  );

  test("rejects player slot counts other than four", () => {
    expect(() =>
      calculateBookingSettlement({
        bookingValue: 120000,
        bookingDate,
        bookingStartMinutes,
        playerSlots: 5,
        selectedMembers: [],
      }),
    ).toThrow("La liquidacion MVP usa exactamente 4 cupos.");
  });
});
