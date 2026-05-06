import { describe, expect, test } from "vitest";

import {
  buildMercadoPagoDisconnectPatch,
  buildManualMercadoPagoConnectionPatch,
  normalizeMercadoPagoConnectionInput,
} from "../lib/mercadoPagoConnectionRules";

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

  test("keeps manual token compatibility and marks the source as manual", () => {
    expect(
      buildManualMercadoPagoConnectionPatch({
        accessToken: "APP_USR-token",
        collectorId: "12345",
        userId: "user-1",
        now: 1_700_000_000_000,
        existingConnectedAt: undefined,
      }),
    ).toEqual({
      status: "connected",
      collectorId: "12345",
      accessToken: "APP_USR-token",
      connectionSource: "manual",
      connectedByUserId: "user-1",
      connectedAt: 1_700_000_000_000,
      accessTokenEncrypted: undefined,
      refreshTokenEncrypted: undefined,
      accessTokenExpiresAt: undefined,
      refreshTokenExpiresAt: undefined,
      publicKey: undefined,
      liveMode: undefined,
      scope: undefined,
      mpUserId: undefined,
      tokenType: undefined,
      refreshError: undefined,
      refreshErrorAt: undefined,
      lastRefreshAt: undefined,
      lastValidatedAt: undefined,
      disconnectedAt: undefined,
      updatedAt: 1_700_000_000_000,
    });
  });

  test("cleans manual and OAuth fields when disconnecting", () => {
    expect(buildMercadoPagoDisconnectPatch(1_700_000_000_000)).toEqual({
      status: "disconnected",
      collectorId: undefined,
      accessToken: undefined,
      accessTokenEncrypted: undefined,
      refreshTokenEncrypted: undefined,
      publicKey: undefined,
      accessTokenExpiresAt: undefined,
      refreshTokenExpiresAt: undefined,
      liveMode: undefined,
      scope: undefined,
      mpUserId: undefined,
      tokenType: undefined,
      lastRefreshAt: undefined,
      refreshError: undefined,
      refreshErrorAt: undefined,
      lastValidatedAt: undefined,
      disconnectedAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });
  });
});
