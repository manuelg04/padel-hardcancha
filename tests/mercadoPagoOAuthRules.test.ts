import { describe, expect, test } from "vitest";

import {
  buildMercadoPagoOAuthConnectionPatch,
  buildMercadoPagoOAuthStateErrorPatch,
  buildMercadoPagoOAuthStateInsert,
  buildMercadoPagoOAuthStateUsedPatch,
  generateMercadoPagoOAuthState,
  validateMercadoPagoOAuthStateForConsumption,
} from "../lib/mercadoPagoOAuthRules";

const now = 1_700_000_000_000;

describe("Mercado Pago OAuth state lifecycle", () => {
  test("creates unique pending states that expire in ten minutes", () => {
    const firstState = generateMercadoPagoOAuthState();
    const secondState = generateMercadoPagoOAuthState();
    const insert = buildMercadoPagoOAuthStateInsert({
      clubId: "club-1",
      userId: "user-1",
      state: firstState,
      now,
      redirectAfterSuccess: "/admin/config",
    });

    expect(firstState).not.toBe(secondState);
    expect(insert).toEqual({
      clubId: "club-1",
      userId: "user-1",
      state: firstState,
      status: "pending",
      expiresAt: now + 10 * 60 * 1000,
      createdAt: now,
      redirectAfterSuccess: "/admin/config",
    });
  });

  test("consumes a valid pending state", () => {
    const state = {
      status: "pending" as const,
      expiresAt: now + 1,
      clubId: "club-1",
      userId: "user-1",
      redirectAfterSuccess: "/admin/config",
    };

    expect(validateMercadoPagoOAuthStateForConsumption(state, now)).toEqual({
      ok: true,
      clubId: "club-1",
      userId: "user-1",
      redirectAfterSuccess: "/admin/config",
    });
    expect(buildMercadoPagoOAuthStateUsedPatch(now)).toEqual({
      status: "used",
      usedAt: now,
    });
  });

  test("rejects an invalid state", () => {
    expect(validateMercadoPagoOAuthStateForConsumption(null, now)).toEqual({
      ok: false,
      code: "OAUTH_STATE_INVALID",
      message: "La solicitud de Mercado Pago no es valida.",
    });
  });

  test("expires stale states", () => {
    expect(
      validateMercadoPagoOAuthStateForConsumption(
        {
          status: "pending",
          expiresAt: now,
          clubId: "club-1",
          userId: "user-1",
        },
        now + 1,
      ),
    ).toEqual({
      ok: false,
      code: "OAUTH_STATE_EXPIRED",
      message: "La solicitud de Mercado Pago expiro.",
      expired: true,
    });
  });

  test("does not allow a used state to be consumed again", () => {
    expect(
      validateMercadoPagoOAuthStateForConsumption(
        {
          status: "used",
          expiresAt: now + 1,
          clubId: "club-1",
          userId: "user-1",
        },
        now,
      ),
    ).toEqual({
      ok: false,
      code: "OAUTH_STATE_NOT_PENDING",
      message: "La solicitud de Mercado Pago ya fue procesada.",
    });
  });

  test("records safe state errors without secrets", () => {
    expect(
      buildMercadoPagoOAuthStateErrorPatch({
        now,
        errorCode: "oauth_failed!!",
        errorMessage: "bad APP_USR-token client_secret=hidden refresh_token=hidden",
      }),
    ).toEqual({
      status: "cancelled",
      errorCode: "oauth_failed",
      errorMessage: "bad [redacted] [redacted] [redacted]",
      cancelledAt: now,
    });
  });
});

describe("Mercado Pago OAuth connection storage", () => {
  test("builds an OAuth connection patch without plain tokens", () => {
    const patch = buildMercadoPagoOAuthConnectionPatch({
      now,
      accessTokenEncrypted: "v1:iv:access",
      refreshTokenEncrypted: "v1:iv:refresh",
      publicKey: "APP_USR-public-key",
      liveMode: true,
      mpUserId: "12345",
      tokenType: "bearer",
      expiresIn: 15552000,
      scope: "offline_access payments write",
      userId: "user-1",
    });

    expect(patch).toEqual({
      status: "connected",
      connectionSource: "oauth",
      accessToken: undefined,
      accessTokenEncrypted: "v1:iv:access",
      refreshTokenEncrypted: "v1:iv:refresh",
      accessTokenExpiresAt: now + 15552000 * 1000,
      refreshTokenExpiresAt: undefined,
      publicKey: "APP_USR-public-key",
      liveMode: true,
      scope: "offline_access payments write",
      mpUserId: "12345",
      collectorId: "12345",
      tokenType: "bearer",
      connectedByUserId: "user-1",
      connectedAt: now,
      lastRefreshAt: undefined,
      refreshError: undefined,
      refreshErrorAt: undefined,
      lastValidatedAt: now,
      disconnectedAt: undefined,
      updatedAt: now,
    });
    expect(JSON.stringify(patch)).not.toContain("APP_USR-access-token");
  });
});
