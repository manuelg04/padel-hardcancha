export type FinancialSnapshotStatus = "complete" | "partial" | "unavailable";

export type MercadoPagoFinancialSnapshot = {
  grossAmount?: number;
  gatewayFeeAmount?: number;
  taxWithholdingAmount?: number;
  totalDeductionsAmount?: number;
  netReceivedAmount?: number;
  paymentMethod?: string;
  paymentMethodId?: string;
  installments?: number;
  providerMerchantOrderId?: string;
  dateApproved?: string;
  moneyReleaseDate?: string;
  financialSnapshotStatus: FinancialSnapshotStatus;
  financialSnapshotWarning?: string;
};

type UnknownRecord = Record<string, unknown>;

export function normalizeFinancialAmount(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numberValue)) return undefined;

  return Math.round((numberValue + Number.EPSILON) * 100) / 100;
}

export function extractMercadoPagoFinancialSnapshot(
  paymentDetail: unknown,
  fallbackGrossAmount?: number,
): MercadoPagoFinancialSnapshot {
  const payment = asRecord(paymentDetail);
  const transactionDetails = asRecord(payment?.transaction_details);
  const grossAmount =
    normalizeFinancialAmount(payment?.transaction_amount) ??
    normalizeFinancialAmount(fallbackGrossAmount);
  const netReceivedAmount = normalizeFinancialAmount(
    transactionDetails?.net_received_amount,
  );
  const feeBreakdown = extractFeeBreakdown(payment);
  const totalFromGrossAndNet =
    grossAmount !== undefined && netReceivedAmount !== undefined
      ? normalizeFinancialAmount(Math.max(grossAmount - netReceivedAmount, 0))
      : undefined;
  const totalDeductionsAmount =
    totalFromGrossAndNet ??
    (feeBreakdown.totalDeductionsAmount !== undefined
      ? feeBreakdown.totalDeductionsAmount
      : undefined);
  const hasExplicitFinancialData =
    netReceivedAmount !== undefined ||
    totalDeductionsAmount !== undefined ||
    feeBreakdown.gatewayFeeAmount !== undefined ||
    feeBreakdown.taxWithholdingAmount !== undefined;
  const financialSnapshotStatus =
    grossAmount !== undefined &&
    netReceivedAmount !== undefined &&
    totalDeductionsAmount !== undefined
      ? "complete"
      : grossAmount !== undefined && hasExplicitFinancialData
        ? "partial"
        : "unavailable";
  const financialSnapshotWarning = buildFinancialSnapshotWarning({
    grossAmount,
    netReceivedAmount,
    hasExplicitFinancialData,
    totalFromGrossAndNet,
  });

  return removeUndefinedValues({
    grossAmount,
    gatewayFeeAmount: feeBreakdown.gatewayFeeAmount,
    taxWithholdingAmount: feeBreakdown.taxWithholdingAmount,
    totalDeductionsAmount,
    netReceivedAmount,
    paymentMethod: stringValue(payment?.payment_type_id),
    paymentMethodId: stringValue(payment?.payment_method_id),
    installments: integerValue(payment?.installments),
    providerMerchantOrderId:
      stringValue(asRecord(payment?.order)?.id) ??
      stringValue(payment?.merchant_order_id),
    dateApproved: stringValue(payment?.date_approved),
    moneyReleaseDate:
      stringValue(payment?.money_release_date) ??
      stringValue(transactionDetails?.money_release_date),
    financialSnapshotStatus,
    financialSnapshotWarning,
  });
}

function extractFeeBreakdown(payment: UnknownRecord | null) {
  const feeDetails = asArray(payment?.fee_details);
  const chargesDetails = feeDetails.length > 0 ? [] : asArray(payment?.charges_details);
  const entries = feeDetails.length > 0 ? feeDetails : chargesDetails;
  let gatewayFeeAmount = 0;
  let taxWithholdingAmount = 0;

  for (const entry of entries) {
    const record = asRecord(entry);
    const amount =
      normalizeFinancialAmount(record?.amount) ??
      normalizeFinancialAmount(asRecord(record?.amounts)?.original);

    if (amount === undefined || amount <= 0) continue;

    if (isTaxOrWithholding(record)) {
      taxWithholdingAmount += amount;
    } else {
      gatewayFeeAmount += amount;
    }
  }

  const normalizedGateway = normalizeFinancialAmount(gatewayFeeAmount);
  const normalizedTax = normalizeFinancialAmount(taxWithholdingAmount);
  const gateway =
    normalizedGateway !== undefined && normalizedGateway > 0
      ? normalizedGateway
      : undefined;
  const tax =
    normalizedTax !== undefined && normalizedTax > 0 ? normalizedTax : undefined;
  const totalDeductionsAmount = normalizeFinancialAmount(
    (gateway ?? 0) + (tax ?? 0),
  );

  return {
    gatewayFeeAmount: gateway,
    taxWithholdingAmount: tax,
    totalDeductionsAmount:
      totalDeductionsAmount !== undefined && totalDeductionsAmount > 0
        ? totalDeductionsAmount
        : undefined,
  };
}

function buildFinancialSnapshotWarning({
  grossAmount,
  netReceivedAmount,
  hasExplicitFinancialData,
  totalFromGrossAndNet,
}: {
  grossAmount?: number;
  netReceivedAmount?: number;
  hasExplicitFinancialData: boolean;
  totalFromGrossAndNet?: number;
}) {
  if (grossAmount === undefined && !hasExplicitFinancialData) {
    return "Financial fields unavailable in provider payload";
  }

  if (netReceivedAmount === undefined) {
    return "Mercado Pago did not return net_received_amount";
  }

  if (
    totalFromGrossAndNet === 0 &&
    grossAmount !== undefined &&
    grossAmount < netReceivedAmount
  ) {
    return "Mercado Pago net_received_amount was greater than gross amount";
  }

  return undefined;
}

function isTaxOrWithholding(record: UnknownRecord | null) {
  const value = [
    record?.type,
    record?.name,
    record?.label,
    record?.description,
    asRecord(record?.metadata)?.reason,
  ]
    .map((part) => stringValue(part)?.toLowerCase() ?? "")
    .join(" ");

  return (
    value.includes("tax") ||
    value.includes("withholding") ||
    value.includes("retention") ||
    value.includes("retencion") ||
    value.includes("impuesto") ||
    value.includes("iva")
  );
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const result = String(value).trim();
  return result === "" ? undefined : result;
}

function integerValue(value: unknown) {
  const normalized = normalizeFinancialAmount(value);
  return normalized === undefined ? undefined : Math.trunc(normalized);
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
