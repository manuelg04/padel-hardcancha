import { describe, expect, test } from "vitest";

import {
  calculatePaymentTransactionsKpis,
  calculatePendingAmountAtReception,
  sumApprovedGrossByReservation,
} from "../lib/paymentTransactionRules";

describe("payment transaction calculations", () => {
  test("calculates reception balance from gross paid online, not net received", () => {
    expect(calculatePendingAmountAtReception(120000, 30000)).toBe(90000);
  });

  test("approved payments add to gross, net and deductions totals", () => {
    expect(
      calculatePaymentTransactionsKpis([
        {
          reservationId: "reservation-1",
          status: "approved",
          type: "deposit",
          amount: 30000,
          grossAmount: 30000,
          totalDeductionsAmount: 2702.2,
          netReceivedAmount: 27297.8,
          financialSnapshotStatus: "complete",
          totalReservationAmount: 120000,
        },
      ]),
    ).toMatchObject({
      grossCollectedAmount: 30000,
      gatewayDeductionsAmount: 2702.2,
      netReceivedAmount: 27297.8,
      pendingReceptionAmount: 90000,
      transactionCount: 1,
      depositCount: 1,
      fullPaymentCount: 0,
      missingFinancialBreakdownCount: 0,
    });
  });

  test("rejected payments do not add to money totals", () => {
    expect(
      calculatePaymentTransactionsKpis([
        {
          reservationId: "reservation-1",
          status: "rejected",
          type: "deposit",
          amount: 30000,
          grossAmount: 30000,
          totalReservationAmount: 120000,
        },
      ]),
    ).toMatchObject({
      grossCollectedAmount: 0,
      gatewayDeductionsAmount: 0,
      netReceivedAmount: 0,
      pendingReceptionAmount: 120000,
      transactionCount: 1,
      depositCount: 1,
    });
  });

  test("multiple payments on one reservation do not duplicate pending amount in KPIs", () => {
    const payments = [
      {
        reservationId: "reservation-1",
        status: "approved" as const,
        type: "deposit" as const,
        amount: 30000,
        grossAmount: 30000,
        totalReservationAmount: 120000,
      },
      {
        reservationId: "reservation-1",
        status: "pending" as const,
        type: "deposit" as const,
        amount: 10000,
        grossAmount: 10000,
        totalReservationAmount: 120000,
      },
    ];

    expect(calculatePaymentTransactionsKpis(payments)).toMatchObject({
      pendingReceptionAmount: 90000,
      transactionCount: 2,
      grossCollectedAmount: 30000,
    });
  });

  test("pending calculations can use approved payments outside the current filtered rows", () => {
    const allApproved = sumApprovedGrossByReservation([
      {
        reservationId: "reservation-1",
        status: "approved",
        type: "deposit",
        amount: 30000,
        grossAmount: 30000,
        totalReservationAmount: 120000,
      },
    ]);

    expect(
      calculatePaymentTransactionsKpis(
        [
          {
            reservationId: "reservation-1",
            status: "rejected",
            type: "deposit",
            amount: 30000,
            grossAmount: 30000,
            totalReservationAmount: 120000,
          },
        ],
        allApproved,
      ),
    ).toMatchObject({
      pendingReceptionAmount: 90000,
      grossCollectedAmount: 0,
    });
  });
});
