import { describe, expect, test } from "vitest";

import { extractMercadoPagoFinancialSnapshot } from "../lib/mercadoPagoFinancialRules";

describe("Mercado Pago financial snapshot extraction", () => {
  test("extracts gross, net and fee details from a complete payment", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000,
        transaction_details: {
          net_received_amount: 27297.8,
        },
        fee_details: [
          {
            type: "mercadopago_fee",
            amount: 2702.2,
          },
        ],
        payment_type_id: "credit_card",
        payment_method_id: "visa",
        installments: 3,
        order: { id: "123456" },
        date_approved: "2026-05-05T10:00:00.000-05:00",
        money_release_date: "2026-05-10T10:00:00.000-05:00",
      }),
    ).toEqual({
      grossAmount: 30000,
      gatewayFeeAmount: 2702.2,
      totalDeductionsAmount: 2702.2,
      netReceivedAmount: 27297.8,
      paymentMethod: "credit_card",
      paymentMethodId: "visa",
      installments: 3,
      providerMerchantOrderId: "123456",
      dateApproved: "2026-05-05T10:00:00.000-05:00",
      moneyReleaseDate: "2026-05-10T10:00:00.000-05:00",
      financialSnapshotStatus: "complete",
    });
  });

  test("keeps gross amount but does not invent net received amount", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000,
      }),
    ).toEqual({
      grossAmount: 30000,
      financialSnapshotStatus: "unavailable",
      financialSnapshotWarning: "Mercado Pago did not return net_received_amount",
    });
  });

  test("uses gross minus net when fee details are missing", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 75000,
        transaction_details: {
          net_received_amount: 69672.5,
        },
      }),
    ).toMatchObject({
      grossAmount: 75000,
      netReceivedAmount: 69672.5,
      totalDeductionsAmount: 5327.5,
      financialSnapshotStatus: "complete",
    });
  });

  test("preserves decimal values to two decimals", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000.005,
        transaction_details: {
          net_received_amount: 27297.804,
        },
        fee_details: [{ type: "mercadopago_fee", amount: 2702.201 }],
      }),
    ).toMatchObject({
      grossAmount: 30000.01,
      gatewayFeeAmount: 2702.2,
      totalDeductionsAmount: 2702.21,
      netReceivedAmount: 27297.8,
    });
  });

  test("handles incomplete payment details defensively", () => {
    expect(extractMercadoPagoFinancialSnapshot(null)).toEqual({
      financialSnapshotStatus: "unavailable",
      financialSnapshotWarning: "Financial fields unavailable in provider payload",
    });
  });

  test("calculates total deductions as gross minus net", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000,
        transaction_details: {
          net_received_amount: 27297.8,
        },
        fee_details: [{ type: "mercadopago_fee", amount: 2000 }],
      }),
    ).toMatchObject({
      gatewayFeeAmount: 2000,
      totalDeductionsAmount: 2702.2,
      financialSnapshotStatus: "complete",
    });
  });

  test("does not store a negative deduction when provider net is greater than gross", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000,
        transaction_details: {
          net_received_amount: 31000,
        },
      }),
    ).toMatchObject({
      totalDeductionsAmount: 0,
      financialSnapshotStatus: "complete",
      financialSnapshotWarning:
        "Mercado Pago net_received_amount was greater than gross amount",
    });
  });

  test("does not invent a net amount when fee details exist without net", () => {
    expect(
      extractMercadoPagoFinancialSnapshot({
        transaction_amount: 30000,
        fee_details: [{ type: "mercadopago_fee", amount: 2702.2 }],
      }),
    ).toMatchObject({
      grossAmount: 30000,
      gatewayFeeAmount: 2702.2,
      totalDeductionsAmount: 2702.2,
      financialSnapshotStatus: "partial",
      financialSnapshotWarning: "Mercado Pago did not return net_received_amount",
    });
  });
});
