import { describe, expect, test } from "vitest";

import {
  buildCustomerMembershipRecord,
  findOverlappingActiveMembership,
  findActiveCustomerMembership,
  isMembershipPlanUsable,
  validateMembershipPlanInput,
} from "../lib/membershipRules";

describe("membership plan rules", () => {
  test("accepts a valid percentage discount plan", () => {
    expect(
      validateMembershipPlanInput({
        name: "Valle 30",
        description: "Descuento en horario valle",
        monthlyPrice: 120000,
        benefitType: "percentage_discount",
        discountPercent: 30,
        appliesAlways: false,
        validDaysOfWeek: [1, 2, 3, 4, 5],
        validStartTime: "06:00",
        validEndTime: "18:00",
      }),
    ).toEqual([]);
  });

  test("rejects invalid plan benefits and schedules", () => {
    expect(
      validateMembershipPlanInput({
        name: "Plan roto",
        monthlyPrice: -1,
        benefitType: "percentage_discount",
        discountPercent: 130,
        appliesAlways: false,
        validDaysOfWeek: [1, 8],
        validStartTime: "18:00",
        validEndTime: "06:00",
      }),
    ).toEqual([
      "El precio mensual no puede ser negativo.",
      "El descuento debe estar entre 0 y 100.",
      "Los dias validos deben estar entre 0 y 6.",
      "La hora final debe ser posterior a la hora inicial.",
    ]);
  });

  test("rejects non-integer money values", () => {
    expect(
      validateMembershipPlanInput({
        name: "Fijo decimal",
        monthlyPrice: 100000.5,
        benefitType: "fixed_price",
        fixedPrice: 15000.5,
        appliesAlways: true,
      }),
    ).toEqual([
      "El precio mensual debe estar en pesos enteros.",
      "El precio fijo debe estar en pesos enteros.",
    ]);
  });

  test("treats inactive plans as unusable for new benefits", () => {
    expect(isMembershipPlanUsable({ isActive: true })).toBe(true);
    expect(isMembershipPlanUsable({ isActive: false })).toBe(false);
  });
});

describe("customer membership rules", () => {
  const now = Date.UTC(2026, 4, 2, 12);

  test("builds a new active customer membership", () => {
    expect(
      buildCustomerMembershipRecord({
        clubId: "clubs:match-point",
        customerId: "customers:valentina",
        userId: "users:valentina",
        membershipPlanId: "membershipPlans:free",
        startsAt: now,
        notes: "  Pago en recepcion  ",
        now,
      }),
    ).toEqual({
      clubId: "clubs:match-point",
      customerId: "customers:valentina",
      userId: "users:valentina",
      membershipPlanId: "membershipPlans:free",
      status: "active",
      startsAt: now,
      endsAt: undefined,
      createdAt: now,
      updatedAt: now,
      cancelledAt: undefined,
      notes: "Pago en recepcion",
    });
  });

  test("detects an active membership", () => {
    expect(
      findActiveCustomerMembership(
        [
          {
            clubId: "clubs:match-point",
            customerId: "customers:valentina",
            status: "active",
            startsAt: now - 1000,
            endsAt: now + 1000,
          },
        ],
        {
          clubId: "clubs:match-point",
          customerId: "customers:valentina",
          now,
        },
      ),
    ).toMatchObject({
      clubId: "clubs:match-point",
      customerId: "customers:valentina",
    });
  });

  test("ignores expired memberships", () => {
    expect(
      findActiveCustomerMembership(
        [
          {
            clubId: "clubs:match-point",
            customerId: "customers:valentina",
            status: "active",
            startsAt: now - 2000,
            endsAt: now - 1000,
          },
        ],
        {
          clubId: "clubs:match-point",
          customerId: "customers:valentina",
          now,
        },
      ),
    ).toBeNull();
  });

  test("ignores future memberships", () => {
    expect(
      findActiveCustomerMembership(
        [
          {
            clubId: "clubs:match-point",
            customerId: "customers:valentina",
            status: "active",
            startsAt: now + 1000,
            endsAt: undefined,
          },
        ],
        {
          clubId: "clubs:match-point",
          customerId: "customers:valentina",
          now,
        },
      ),
    ).toBeNull();
  });

  test("allows at most one active membership per customer and club", () => {
    const existing = {
      clubId: "clubs:match-point",
      customerId: "customers:valentina",
      status: "active" as const,
      startsAt: now - 1000,
      endsAt: undefined,
    };

    expect(
      findActiveCustomerMembership([existing], {
        clubId: "clubs:match-point",
        customerId: "customers:valentina",
        now,
      }),
    ).toBe(existing);

    expect(
      findActiveCustomerMembership([existing], {
        clubId: "clubs:match-point",
        customerId: "customers:james",
        now,
      }),
    ).toBeNull();
  });

  test("detects overlapping active membership periods", () => {
    const existing = {
      clubId: "clubs:match-point",
      customerId: "customers:valentina",
      status: "active" as const,
      startsAt: now + 1000,
      endsAt: now + 10_000,
    };

    expect(
      findOverlappingActiveMembership([existing], {
        clubId: "clubs:match-point",
        customerId: "customers:valentina",
        status: "active",
        startsAt: now + 5000,
        endsAt: now + 12_000,
      }),
    ).toBe(existing);

    expect(
      findOverlappingActiveMembership([existing], {
        clubId: "clubs:match-point",
        customerId: "customers:valentina",
        status: "active",
        startsAt: now + 11_000,
        endsAt: now + 12_000,
      }),
    ).toBeNull();
  });
});
