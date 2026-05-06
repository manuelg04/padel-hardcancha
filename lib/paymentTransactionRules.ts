import { normalizeFinancialAmount } from "./mercadoPagoFinancialRules";

export type PaymentTransactionStatus =
  | "created"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "failed"
  | "superseded";

export type PaymentTransactionType = "deposit" | "full_payment";

export type PaymentTransactionSummaryInput = {
  reservationId: string;
  status: PaymentTransactionStatus;
  type: PaymentTransactionType;
  amount: number;
  grossAmount?: number | null;
  totalDeductionsAmount?: number | null;
  gatewayFeeAmount?: number | null;
  taxWithholdingAmount?: number | null;
  netReceivedAmount?: number | null;
  financialSnapshotStatus?: "complete" | "partial" | "unavailable" | null;
  totalReservationAmount: number;
};

export type PaymentTransactionRowKpiInput = Omit<
  PaymentTransactionSummaryInput,
  "amount"
> & {
  grossAmount?: number | null;
};

export type PaymentTransactionsKpis = {
  grossCollectedAmount: number;
  gatewayDeductionsAmount: number;
  netReceivedAmount: number;
  pendingReceptionAmount: number;
  transactionCount: number;
  approvedPaymentCount: number;
  pendingAttemptCount: number;
  depositCount: number;
  fullPaymentCount: number;
  missingFinancialBreakdownCount: number;
};

export function getGrossAmountForCalculations(
  payment: Pick<PaymentTransactionSummaryInput, "amount" | "grossAmount">,
) {
  return normalizeFinancialAmount(payment.grossAmount ?? payment.amount) ?? 0;
}

export function calculatePendingAmountAtReception(
  totalReservationAmount: number,
  totalPaidOnlineGross: number,
) {
  return (
    normalizeFinancialAmount(
      Math.max(totalReservationAmount - totalPaidOnlineGross, 0),
    ) ?? 0
  );
}

export function isCollectedPaymentStatus(status: PaymentTransactionStatus) {
  return status === "approved";
}

export function isPendingPaymentAttemptStatus(status: PaymentTransactionStatus) {
  return status === "created" || status === "pending";
}

export function sumApprovedGrossByReservation(
  payments: PaymentTransactionSummaryInput[],
) {
  const result = new Map<string, number>();

  for (const payment of payments) {
    if (!isCollectedPaymentStatus(payment.status)) continue;

    const current = result.get(payment.reservationId) ?? 0;
    result.set(
      payment.reservationId,
      normalizeFinancialAmount(current + getGrossAmountForCalculations(payment)) ?? 0,
    );
  }

  return result;
}

export function calculatePaymentTransactionsKpis(
  payments: PaymentTransactionSummaryInput[],
  approvedGrossByReservation = sumApprovedGrossByReservation(payments),
): PaymentTransactionsKpis {
  const seenReservations = new Set<string>();
  const reservationsWithApprovedPayments = new Set(
    payments
      .filter((payment) => isCollectedPaymentStatus(payment.status))
      .map((payment) => payment.reservationId),
  );
  const totals: PaymentTransactionsKpis = {
    grossCollectedAmount: 0,
    gatewayDeductionsAmount: 0,
    netReceivedAmount: 0,
    pendingReceptionAmount: 0,
    transactionCount: payments.length,
    approvedPaymentCount: 0,
    pendingAttemptCount: 0,
    depositCount: 0,
    fullPaymentCount: 0,
    missingFinancialBreakdownCount: 0,
  };

  for (const payment of payments) {
    if (payment.type === "deposit") totals.depositCount += 1;
    if (payment.type === "full_payment") totals.fullPaymentCount += 1;
    if (isCollectedPaymentStatus(payment.status)) totals.approvedPaymentCount += 1;
    if (isPendingPaymentAttemptStatus(payment.status)) totals.pendingAttemptCount += 1;

    if (
      reservationsWithApprovedPayments.has(payment.reservationId) &&
      !seenReservations.has(payment.reservationId)
    ) {
      seenReservations.add(payment.reservationId);
      totals.pendingReceptionAmount = addMoney(
        totals.pendingReceptionAmount,
        calculatePendingAmountAtReception(
          payment.totalReservationAmount,
          approvedGrossByReservation.get(payment.reservationId) ?? 0,
        ),
      );
    }

    if (!isCollectedPaymentStatus(payment.status)) continue;

    totals.grossCollectedAmount = addMoney(
      totals.grossCollectedAmount,
      getGrossAmountForCalculations(payment),
    );
    totals.gatewayDeductionsAmount = addMoney(
      totals.gatewayDeductionsAmount,
      getDeductionsAmountForCalculations(payment),
    );
    totals.netReceivedAmount = addMoney(
      totals.netReceivedAmount,
      payment.netReceivedAmount ?? 0,
    );

    if (payment.financialSnapshotStatus !== "complete") {
      totals.missingFinancialBreakdownCount += 1;
    }
  }

  return totals;
}

export function calculatePaymentTransactionRowKpis(
  rows: PaymentTransactionRowKpiInput[],
) {
  return calculatePaymentTransactionsKpis(
    rows.map((row) => ({
      ...row,
      amount: row.grossAmount ?? 0,
    })),
  );
}

function getDeductionsAmountForCalculations(payment: PaymentTransactionSummaryInput) {
  return (
    normalizeFinancialAmount(
      payment.totalDeductionsAmount ??
        (payment.gatewayFeeAmount ?? 0) + (payment.taxWithholdingAmount ?? 0),
    ) ?? 0
  );
}

function addMoney(left: number, right: number) {
  return normalizeFinancialAmount(left + right) ?? 0;
}
