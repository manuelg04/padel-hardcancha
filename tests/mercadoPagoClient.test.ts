import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createMercadoPagoDepositPreference,
  createMercadoPagoReservationPreference,
  getMercadoPagoPayment,
  isMercadoPagoUnauthorizedError,
} from "../convex/mercadoPagoClient";

const originalFetch = globalThis.fetch;

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Mercado Pago client errors", () => {
  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  test("preserves 401 status without exposing provider tokens", async () => {
    mockFetch(
      Response.json(
        {
          message: "invalid APP_USR-access-token access_token=hidden",
        },
        { status: 401 },
      ),
    );

    let capturedError: unknown;

    try {
      await getMercadoPagoPayment("APP_USR-seller-token", "12345");
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({
      status: 401,
      safeMessage: "invalid [redacted] [redacted]",
    });
    expect(isMercadoPagoUnauthorizedError(capturedError)).toBe(true);
    expect(String(capturedError)).not.toContain("APP_USR-access-token");
    expect(String(capturedError)).not.toContain("access_token=hidden");
  });

  test("sends the provided seller token only in the authorization header", async () => {
    const fetchMock = mockFetch(
      Response.json({
        id: "preference-1",
        init_point: "https://checkout.mercadopago.com/preference-1",
      }),
    );

    await createMercadoPagoDepositPreference({
      sellerAccessToken: "APP_USR-seller-token",
      clubId: "club-1" as never,
      clubSlug: "club-demo",
      clubName: "Club Demo",
      courtId: "court-1" as never,
      courtName: "Cancha 1",
      reservationId: "booking-1" as never,
      reservationCode: "ABC123",
      reservationPaymentId: "payment-1" as never,
      userId: "user-1" as never,
      customerName: "Cliente",
      customerPhone: "3001234567",
      amount: 30000,
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(request?.headers);
    expect(headers.get("authorization")).toBe("Bearer APP_USR-seller-token");
    expect(String(request?.body)).not.toContain("APP_USR-seller-token");
  });

  test("builds a full-payment preference with clear reference and metadata", async () => {
    const fetchMock = mockFetch(
      Response.json({
        id: "preference-2",
        init_point: "https://checkout.mercadopago.com/preference-2",
      }),
    );

    await createMercadoPagoReservationPreference({
      sellerAccessToken: "APP_USR-seller-token",
      clubId: "club-1" as never,
      clubSlug: "club-demo",
      clubName: "Club Demo",
      courtId: "court-1" as never,
      courtName: "Cancha 1",
      reservationId: "booking-1" as never,
      reservationCode: "ABC123",
      reservationPaymentId: "payment-2" as never,
      userId: "user-1" as never,
      customerName: "Cliente",
      customerPhone: "3001234567",
      amount: 60000,
      paymentType: "full_payment",
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));

    expect(body.items[0].title).toBe("Pago completo reserva cancha");
    expect(body.items[0].unit_price).toBe(60000);
    expect(body.external_reference).toBe("full_payment:payment-2");
    expect(body.metadata).toMatchObject({
      reservationId: "booking-1",
      clubId: "club-1",
      userId: "user-1",
      paymentType: "full_payment",
    });
    expect(body).not.toHaveProperty("marketplace_fee");
  });
});
