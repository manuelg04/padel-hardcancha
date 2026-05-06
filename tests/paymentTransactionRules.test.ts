import { describe, expect, test } from "vitest";

import {
  calculatePaymentTransactionRowKpis,
  calculatePaymentTransactionsKpis,
  calculatePendingAmountAtReception,
  isPendingPaymentAttemptStatus,
  sumApprovedGrossByReservation,
} from "../lib/paymentTransactionRules";

describe("payment transaction calculations", () => {
  test("calculates reception balance from gross paid online, not net received", () => {
    expect(calculatePendingAmountAtReception(120000, 30000)).toBe(90000);
  });

  test("approved payments add to gross, net, deductions and reception balance totals", () => {
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
      approvedPaymentCount: 1,
      pendingAttemptCount: 0,
      depositCount: 1,
      fullPaymentCount: 0,
      missingFinancialBreakdownCount: 0,
    });
  });

  test("created payments do not add to financial totals or reception balance", () => {
    expect(
      calculatePaymentTransactionsKpis([
        {
          reservationId: "reservation-1",
          status: "created",
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
      pendingReceptionAmount: 0,
      transactionCount: 1,
      approvedPaymentCount: 0,
      pendingAttemptCount: 1,
      depositCount: 1,
    });
  });

  test("approved full payments count as collected with no reception balance", () => {
    expect(
      calculatePaymentTransactionsKpis([
        {
          reservationId: "reservation-1",
          status: "approved",
          type: "full_payment",
          amount: 60000,
          grossAmount: 60000,
          totalDeductionsAmount: 5404.4,
          netReceivedAmount: 54595.6,
          financialSnapshotStatus: "complete",
          totalReservationAmount: 60000,
        },
      ]),
    ).toMatchObject({
      grossCollectedAmount: 60000,
      gatewayDeductionsAmount: 5404.4,
      netReceivedAmount: 54595.6,
      pendingReceptionAmount: 0,
      approvedPaymentCount: 1,
      pendingAttemptCount: 0,
      depositCount: 0,
      fullPaymentCount: 1,
    });
  });

  test("pending payments do not add to financial totals or reception balance", () => {
    expect(
      calculatePaymentTransactionsKpis([
        {
          reservationId: "reservation-1",
          status: "pending",
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
      pendingReceptionAmount: 0,
      transactionCount: 1,
      approvedPaymentCount: 0,
      pendingAttemptCount: 1,
      depositCount: 1,
    });
  });

  test("rejected and failed payments do not add to financial totals or reception balance", () => {
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
        {
          reservationId: "reservation-2",
          status: "failed",
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
      pendingReceptionAmount: 0,
      transactionCount: 2,
      approvedPaymentCount: 0,
      pendingAttemptCount: 0,
      depositCount: 2,
    });
  });

  test("multiple approved payments on one reservation do not duplicate pending amount in KPIs", () => {
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
        status: "approved" as const,
        type: "deposit" as const,
        amount: 10000,
        grossAmount: 10000,
        totalReservationAmount: 120000,
      },
    ];

    expect(calculatePaymentTransactionsKpis(payments)).toMatchObject({
      pendingReceptionAmount: 80000,
      transactionCount: 2,
      approvedPaymentCount: 2,
      pendingAttemptCount: 0,
      grossCollectedAmount: 40000,
    });
  });

  test("pending calculations use approved totals outside the current filtered rows without counting non-approved rows", () => {
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
      pendingReceptionAmount: 0,
      grossCollectedAmount: 0,
      approvedPaymentCount: 0,
    });
  });

  test("pending attempt status only includes created and pending", () => {
    expect(isPendingPaymentAttemptStatus("created")).toBe(true);
    expect(isPendingPaymentAttemptStatus("pending")).toBe(true);
    expect(isPendingPaymentAttemptStatus("approved")).toBe(false);
    expect(isPendingPaymentAttemptStatus("rejected")).toBe(false);
    expect(isPendingPaymentAttemptStatus("failed")).toBe(false);
    expect(isPendingPaymentAttemptStatus("cancelled")).toBe(false);
    expect(isPendingPaymentAttemptStatus("refunded")).toBe(false);
    expect(isPendingPaymentAttemptStatus("superseded")).toBe(false);
  });

  test("two approved payments and one created attempt match the payments KPI scenario", () => {
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
          totalReservationAmount: 60000,
        },
        {
          reservationId: "reservation-2",
          status: "approved",
          type: "deposit",
          amount: 30000,
          grossAmount: 30000,
          totalDeductionsAmount: 2702.2,
          netReceivedAmount: 27297.8,
          financialSnapshotStatus: "complete",
          totalReservationAmount: 75000,
        },
        {
          reservationId: "reservation-3",
          status: "created",
          type: "deposit",
          amount: 30000,
          grossAmount: 30000,
          totalReservationAmount: 60000,
        },
      ]),
    ).toMatchObject({
      grossCollectedAmount: 60000,
      gatewayDeductionsAmount: 5404.4,
      netReceivedAmount: 54595.6,
      pendingReceptionAmount: 75000,
      approvedPaymentCount: 2,
      pendingAttemptCount: 1,
      transactionCount: 3,
    });
  });

  test("row-based KPI shape matches the payments screen scenario", () => {
    expect(
      calculatePaymentTransactionRowKpis([
        {
          reservationId: "reservation-1",
          status: "approved",
          type: "deposit",
          grossAmount: 30000,
          totalDeductionsAmount: 2702.2,
          netReceivedAmount: 27297.8,
          financialSnapshotStatus: "complete",
          totalReservationAmount: 60000,
        },
        {
          reservationId: "reservation-2",
          status: "approved",
          type: "deposit",
          grossAmount: 30000,
          totalDeductionsAmount: 2702.2,
          netReceivedAmount: 27297.8,
          financialSnapshotStatus: "complete",
          totalReservationAmount: 75000,
        },
        {
          reservationId: "reservation-3",
          status: "created",
          type: "deposit",
          grossAmount: 30000,
          totalReservationAmount: 60000,
        },
      ]),
    ).toEqual({
      grossCollectedAmount: 60000,
      gatewayDeductionsAmount: 5404.4,
      netReceivedAmount: 54595.6,
      pendingReceptionAmount: 75000,
      transactionCount: 3,
      approvedPaymentCount: 2,
      pendingAttemptCount: 1,
      depositCount: 3,
      fullPaymentCount: 0,
      missingFinancialBreakdownCount: 0,
    });
  });

  test("row-based KPI counts stay numeric for empty payment results", () => {
    expect(calculatePaymentTransactionRowKpis([])).toMatchObject({
      pendingReceptionAmount: 0,
      transactionCount: 0,
      approvedPaymentCount: 0,
      pendingAttemptCount: 0,
      missingFinancialBreakdownCount: 0,
    });
  });
});
