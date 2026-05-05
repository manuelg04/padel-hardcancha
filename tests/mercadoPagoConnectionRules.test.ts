import { describe, expect, test } from "vitest";

import { normalizeMercadoPagoConnectionInput } from "../lib/mercadoPagoConnectionRules";

describe("Mercado Pago connection input", () => {
  test("requires an access token before calling the backend", () => {
    expect(
      normalizeMercadoPagoConnectionInput({
        accessToken: "   ",
        collectorId: "",
      }),
    ).toEqual({
      ok: false,
      message: "Ingresa el access token de Mercado Pago del club.",
    });
  });

  test("omits an empty optional Mercado Pago ID", () => {
    expect(
      normalizeMercadoPagoConnectionInput({
        accessToken: "  APP_USR-token  ",
        collectorId: "   ",
      }),
    ).toEqual({
      ok: true,
      accessToken: "APP_USR-token",
    });
  });

  test("keeps a provided Mercado Pago ID trimmed", () => {
    expect(
      normalizeMercadoPagoConnectionInput({
        accessToken: "APP_USR-token",
        collectorId: "  12345  ",
      }),
    ).toEqual({
      ok: true,
      accessToken: "APP_USR-token",
      collectorId: "12345",
    });
  });
});
