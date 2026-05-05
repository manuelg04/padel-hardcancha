import { describe, expect, test } from "vitest";

import {
  buildPackagePurchaseRecord,
  buildProfessorRecord,
  calculateAcademyRevenue,
  getPackageUnavailableReason,
  getRemainingClasses,
  shouldConsumePackage,
  shouldRestorePackage,
  statusAfterConfirmation,
  validatePackagePlanInput,
  validatePackageSaleInput,
  validateProfessorInput,
  validateSessionInput,
} from "../lib/academyRules";

describe("academy professor rules", () => {
  test("creates a professor record", () => {
    expect(
      buildProfessorRecord({
        clubId: "clubs:match-point",
        name: "  Laura Perez  ",
        email: " laura@example.com ",
        phone: "3001234567",
        now: 1000,
      }),
    ).toEqual({
      clubId: "clubs:match-point",
      name: "Laura Perez",
      email: "laura@example.com",
      phone: "3001234567",
      userId: undefined,
      status: "active",
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  test("validates professor data", () => {
    expect(validateProfessorInput({ name: "" })).toEqual([
      "El nombre del profesor es obligatorio.",
    ]);
    expect(validateProfessorInput({ name: "Laura", email: "mal" })).toEqual([
      "El email del profesor no es valido.",
    ]);
  });
});

describe("academy package rules", () => {
  test("creates and validates package plans", () => {
    expect(
      validatePackagePlanInput({
        name: "Bono 8 clases",
        classesCount: 8,
        price: 480000,
        validityDays: 45,
      }),
    ).toEqual([]);

    expect(
      validatePackagePlanInput({
        name: "",
        classesCount: 0,
        price: 100.5,
        validityDays: -1,
      }),
    ).toEqual([
      "El nombre del paquete es obligatorio.",
      "La cantidad de clases debe ser mayor a cero.",
      "El precio debe estar en pesos enteros y no puede ser negativo.",
      "La vigencia debe estar expresada en dias positivos.",
    ]);
  });

  test("sells a package with usedClasses starting at zero", () => {
    expect(
      buildPackagePurchaseRecord({
        clubId: "clubs:match-point",
        customerId: "customers:ana",
        packagePlanId: "academyPackagePlans:bono",
        name: "  Bono 8  ",
        totalClasses: 8,
        amountPaid: 480000,
        purchasedAt: 1000,
        expiresAt: 2000,
        createdByUserId: "users:staff",
        now: 1100,
      }),
    ).toEqual({
      clubId: "clubs:match-point",
      customerId: "customers:ana",
      packagePlanId: "academyPackagePlans:bono",
      name: "Bono 8",
      totalClasses: 8,
      usedClasses: 0,
      amountPaid: 480000,
      purchasedAt: 1000,
      expiresAt: 2000,
      status: "active",
      createdByUserId: "users:staff",
      createdAt: 1100,
      updatedAt: 1100,
    });
  });

  test("validates package sales", () => {
    expect(
      validatePackageSaleInput({
        totalClasses: 4,
        amountPaid: 200000,
        purchasedAt: 1000,
        expiresAt: 2000,
      }),
    ).toEqual([]);

    expect(
      validatePackageSaleInput({
        totalClasses: 0,
        amountPaid: -1,
        purchasedAt: Number.NaN,
      }),
    ).toEqual([
      "La cantidad de clases compradas debe ser mayor a cero.",
      "El valor pagado debe estar en pesos enteros y no puede ser negativo.",
      "La fecha de compra no es valida.",
    ]);

    expect(
      validatePackageSaleInput({
        totalClasses: 4,
        amountPaid: 200000,
        purchasedAt: 1000,
        expiresAt: 1,
      }),
    ).toEqual([
      "La fecha de vencimiento debe ser posterior a la compra.",
    ]);
  });

  test("calculates remaining classes from total and used", () => {
    expect(getRemainingClasses({ totalClasses: 8, usedClasses: 3 })).toBe(5);
    expect(getRemainingClasses({ totalClasses: 8, usedClasses: 9 })).toBe(0);
  });

  test("blocks unusable packages", () => {
    const attendance = {
      clubId: "clubs:match-point",
      customerId: "customers:ana",
    };

    expect(
      getPackageUnavailableReason(
        {
          clubId: "clubs:other",
          customerId: "customers:ana",
          totalClasses: 8,
          usedClasses: 0,
          status: "active",
        },
        attendance,
        1000,
      ),
    ).toBe("PACKAGE_OTHER_CLUB");

    expect(
      getPackageUnavailableReason(
        {
          clubId: "clubs:match-point",
          customerId: "customers:ana",
          totalClasses: 8,
          usedClasses: 8,
          status: "active",
        },
        attendance,
        1000,
      ),
    ).toBe("PACKAGE_NO_BALANCE");

    expect(
      getPackageUnavailableReason(
        {
          clubId: "clubs:match-point",
          customerId: "customers:ana",
          totalClasses: 8,
          usedClasses: 0,
          status: "active",
          expiresAt: 900,
        },
        attendance,
        1000,
      ),
    ).toBe("PACKAGE_EXPIRED");
  });
});

describe("academy session and attendance rules", () => {
  test("validates class session fields", () => {
    expect(
      validateSessionInput({
        localDate: "2026-05-05",
        startTime: "10:00",
        endTime: "11:00",
      }),
    ).toEqual([]);

    expect(
      validateSessionInput({
        localDate: "05-05-2026",
        startTime: "10",
        endTime: "09:00",
      }),
    ).toEqual([
      "La fecha debe estar en formato YYYY-MM-DD.",
      "La hora inicial debe usar formato HH:MM.",
    ]);
  });

  test("completes only after student confirmation and professor validation", () => {
    const base = {
      clubId: "clubs:match-point",
      customerId: "customers:ana",
      paymentType: "package" as const,
      packagePurchaseId: "academyPackagePurchases:bono",
      status: "registered" as const,
    };

    expect(statusAfterConfirmation(base)).toBe("registered");
    expect(statusAfterConfirmation({ ...base, studentConfirmedAt: 1000 })).toBe(
      "student_confirmed",
    );
    expect(
      statusAfterConfirmation({ ...base, professorValidatedAt: 1000 }),
    ).toBe("professor_validated");
    expect(
      statusAfterConfirmation({
        ...base,
        studentConfirmedAt: 1000,
        professorValidatedAt: 1100,
      }),
    ).toBe("completed");
  });

  test("consumes package exactly once when attendance becomes completed", () => {
    const attendance = {
      clubId: "clubs:match-point",
      customerId: "customers:ana",
      paymentType: "package" as const,
      packagePurchaseId: "academyPackagePurchases:bono",
      studentConfirmedAt: 1000,
      professorValidatedAt: 1100,
      status: "professor_validated" as const,
    };

    expect(shouldConsumePackage(attendance)).toBe(true);
    expect(
      shouldConsumePackage({
        ...attendance,
        packageConsumedAt: 1200,
        status: "completed",
      }),
    ).toBe(false);
  });

  test("restores package once when completed attendance is cancelled", () => {
    const attendance = {
      clubId: "clubs:match-point",
      customerId: "customers:ana",
      paymentType: "package" as const,
      packagePurchaseId: "academyPackagePurchases:bono",
      studentConfirmedAt: 1000,
      professorValidatedAt: 1100,
      packageConsumedAt: 1200,
      status: "completed" as const,
    };

    expect(shouldRestorePackage(attendance)).toBe(true);
    expect(
      shouldRestorePackage({
        ...attendance,
        packageConsumptionRevertedAt: 1300,
        status: "cancelled",
      }),
    ).toBe(false);
  });
});

describe("academy reports", () => {
  test("does not double count package revenue when classes are consumed", () => {
    expect(
      calculateAcademyRevenue({
        packageSales: [{ amountPaid: 480000, status: "active" }],
        attendances: [
          {
            paymentType: "package",
            paymentStatus: "not_required",
            status: "completed",
            packageConsumedAt: 1200,
          },
          {
            paymentType: "single",
            paymentStatus: "paid",
            status: "completed",
            singleClassPrice: 90000,
          },
          {
            paymentType: "single",
            paymentStatus: "pending",
            status: "completed",
            singleClassPrice: 90000,
          },
        ],
      }),
    ).toEqual({
      packageSalesRevenue: 480000,
      singleClassRevenue: 90000,
      packageClassesConsumed: 1,
      totalReceived: 570000,
    });
  });
});
