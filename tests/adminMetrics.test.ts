import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import { buildMetricsWorkbookModel } from "../lib/admin/metricsCalculations";
import { createMetricsWorkbookBuffer } from "../lib/admin/metricsExcel";
import type { ClubMetricsExportData } from "../lib/admin/metricsTypes";

const data: ClubMetricsExportData = {
  club: {
    id: "club1",
    name: "Club Demo",
    timezone: "America/Bogota",
    openingHours: [
      {
        dayOfWeek: 1,
        isOpen: true,
        openMinutes: 8 * 60,
        closeMinutes: 12 * 60,
      },
      {
        dayOfWeek: 2,
        isOpen: true,
        openMinutes: 8 * 60,
        closeMinutes: 12 * 60,
      },
    ],
  },
  courts: [
    {
      id: "court1",
      name: "Cancha 1",
      isActive: true,
      sortOrder: 1,
    },
  ],
  bookings: [
    {
      id: "booking1",
      code: "AAA111",
      localDate: "2026-05-04",
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      durationMinutes: 60,
      courtId: "court1",
      courtName: "Cancha 1",
      customerName: "Ana Perez",
      customerPhone: "3001234567",
      bookingStatus: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "cash",
      value: 80000,
      createdAt: 1777900000000,
    },
    {
      id: "booking2",
      code: "BBB222",
      localDate: "2026-05-04",
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      durationMinutes: 60,
      courtId: "court1",
      courtName: "Cancha 1",
      customerName: "Bruno Diaz",
      customerPhone: "3007654321",
      bookingStatus: "blocked",
      paymentStatus: "pending",
      paymentMethod: "club",
      value: 0,
      createdAt: 1777900000000,
    },
    {
      id: "booking3",
      code: "CCC333",
      localDate: "2026-05-05",
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      durationMinutes: 60,
      courtId: "court1",
      courtName: "Cancha 1",
      customerName: "Carla Ruiz",
      customerPhone: "3011234567",
      bookingStatus: "cancelled",
      paymentStatus: "pending",
      paymentMethod: "transfer",
      value: 90000,
      createdAt: 1777900000000,
      cancelledAt: 1777980000000,
    },
    {
      id: "booking4",
      code: "DDD444",
      localDate: "2026-05-06",
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      durationMinutes: 60,
      courtId: "court1",
      courtName: "Cancha 1",
      customerName: "Diana Mora",
      customerPhone: "3021234567",
      bookingStatus: "confirmed",
      paymentStatus: "pending",
      paymentMethod: "cash",
      value: 70000,
      createdAt: 1777900000000,
    },
  ],
  settlements: [
    {
      id: "settlement1",
      bookingId: "booking1",
      status: "paid",
      baseBookingValue: 80000,
      finalTotalCollectedValue: 60000,
      discountAbsorbedByClubValue: 20000,
      manualAdjustmentAmount: 0,
      memberCharges: [
        {
          customerId: "customer1",
          customerName: "Ana Perez",
          membershipId: "membership1",
          membershipPlanId: "plan1",
          membershipPlanName: "Mensual",
          benefitType: "percentage_discount",
          benefitApplied: true,
          baseShareValue: 20000,
          chargedValue: 10000,
          discountValue: 10000,
        },
      ],
      paidAt: 1777901000000,
      closedAt: 1777900500000,
      createdAt: 1777900000000,
      updatedAt: 1777901000000,
    },
  ],
  memberships: [
    {
      id: "membership1",
      customerId: "customer1",
      customerName: "Ana Perez",
      planId: "plan1",
      planName: "Mensual",
      status: "active",
      startsAt: 1777842000000,
      endsAt: 1780520400000,
      createdAt: 1777842000000,
      monthlyPrice: 180000,
    },
  ],
  generatedAt: 1778000000000,
};

describe("admin metrics calculations", () => {
  it("keeps blocked and cancelled bookings out of commercial metrics", () => {
    const model = buildMetricsWorkbookModel(data, {
      startDate: "2026-05-04",
      endDate: "2026-05-06",
      now: { localDate: "2026-05-05", currentMinutes: 12 * 60 },
    });

    expect(model.reservas.summary.totalRecords).toBe(4);
    expect(model.reservas.summary.commercialBookings).toBe(2);
    expect(model.reservas.summary.blocks).toBe(1);
    expect(model.reservas.summary.cancelled).toBe(1);
    expect(model.reservas.summary.completed).toBe(1);
    expect(model.reservas.summary.futureConfirmed).toBe(1);
    expect(model.ocupacion.summary.reservedCommercialHours).toBe(2);
    expect(model.ocupacion.summary.availableHours).toBe(8);
    expect(model.ocupacion.detail[0]).toMatchObject({
      date: "2026-05-04",
      court: "Cancha 1",
      reservedCommercialHours: 1,
      blockedHours: 1,
      cancelledHours: 0,
    });
  });

  it("uses only paid settlements for collected income and membership benefits", () => {
    const model = buildMetricsWorkbookModel(data, {
      startDate: "2026-05-04",
      endDate: "2026-05-06",
      now: { localDate: "2026-05-05", currentMinutes: 12 * 60 },
    });

    expect(model.ingresos.summary.completedBookings).toBe(1);
    expect(model.ingresos.summary.paidSettledBookings).toBe(1);
    expect(model.ingresos.summary.totalCollected).toBe(60000);
    expect(model.ingresos.summary.expectedBaseValue).toBe(150000);
    expect(model.horarios.summary.totalCollected).toBe(60000);
    expect(model.horarios.detailBySlot).toContainEqual(
      expect.objectContaining({
        slot: "09:00 - 10:00",
        confirmedBookings: 2,
        completedBookings: 1,
        cancelledBookings: 1,
        collectedTotal: 60000,
      }),
    );
    expect(model.membresias.summary.usedBenefitBookings).toBe(1);
    expect(model.membresias.summary.totalMembershipDiscount).toBe(10000);
    expect(model.membresias.summary.totalCollectedWithMembership).toBe(60000);
  });

  it("creates complete and individual Excel workbooks with the expected sheets", async () => {
    const params = {
      startDate: "2026-05-04",
      endDate: "2026-05-06",
      now: { localDate: "2026-05-05", currentMinutes: 12 * 60 },
    };
    const fullBuffer = await createMetricsWorkbookBuffer(data, params, [
      "reservas",
      "ingresos",
      "ocupacion",
      "horarios",
      "membresias",
    ]);
    const fullWorkbook = new ExcelJS.Workbook();

    await fullWorkbook.xlsx.load(fullBuffer);

    expect(fullWorkbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Reservas por estado",
      "Ingresos liquidados",
      "Ocupación canchas",
      "Rendimiento horarios",
      "Membresías",
    ]);

    const singleBuffer = await createMetricsWorkbookBuffer(data, params, [
      "ingresos",
    ]);
    const singleWorkbook = new ExcelJS.Workbook();

    await singleWorkbook.xlsx.load(singleBuffer);

    expect(singleWorkbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Ingresos liquidados",
    ]);
  });
});
