import { describe, expect, test } from "vitest";

import {
  buildMercadoPagoRefreshFailurePatch,
  buildMercadoPagoRefreshSuccessPatch,
  buildMercadoPagoSafeConnectionStatusFields,
  classifyMercadoPagoRefreshFailureStatus,
  getMercadoPagoConnectionSource,
  hasUsableMercadoPagoConnection,
  shouldRetryMercadoPagoUnauthorizedOperation,
  shouldRefreshMercadoPagoOAuthAccessToken,
  validateMercadoPagoOAuthTokenFields,
} from "../lib/mercadoPagoAccessTokenRules";

const now = 1_700_000_000_000;
const fourteenDays = 14 * 24 * 60 * 60 * 1000;

describe("Mercado Pago valid access token rules", () => {
  test("treats older plain-token connections as manual", () => {
    expect(
      getMercadoPagoConnectionSource({
        status: "connected",
        accessToken: " APP_USR-manual ",
      }),
    ).toBe("manual");
  });

  test("keeps manual compatibility without encrypted token fields", () => {
    expect(
      hasUsableMercadoPagoConnection({
        status: "connected",
        connectionSource: "manual",
        accessToken: "APP_USR-manual",
      }),
    ).toBe(true);
  });

  test("rejects manual connections without a plain token", () => {
    expect(
      hasUsableMercadoPagoConnection({
        status: "connected",
        connectionSource: "manual",
        accessToken: " ",
      }),
    ).toBe(false);
  });

  test("allows OAuth connections only when encrypted token storage exists", () => {
    expect(
      hasUsableMercadoPagoConnection({
        status: "connected",
        connectionSource: "oauth",
        accessTokenEncrypted: "v1:iv:access",
      }),
    ).toBe(true);
    expect(
      hasUsableMercadoPagoConnection({
        status: "connected",
        connectionSource: "oauth",
      }),
    ).toBe(false);
  });

  test("refreshes OAuth tokens when forced, missing expiration, or near expiration", () => {
    expect(
      shouldRefreshMercadoPagoOAuthAccessToken({
        now,
        expiresAt: now + fourteenDays + 1,
      }),
    ).toBe(false);
    expect(
      shouldRefreshMercadoPagoOAuthAccessToken({
        now,
        expiresAt: now + fourteenDays,
      }),
    ).toBe(true);
    expect(
      shouldRefreshMercadoPagoOAuthAccessToken({
        now,
        expiresAt: undefined,
      }),
    ).toBe(true);
    expect(
      shouldRefreshMercadoPagoOAuthAccessToken({
        now,
        expiresAt: now + fourteenDays + 1,
        forceRefresh: true,
      }),
    ).toBe(true);
  });

  test("requires encrypted OAuth token fields before retrieval and refresh", () => {
    expect(
      validateMercadoPagoOAuthTokenFields(
        {
          accessTokenEncrypted: "v1:iv:access",
          refreshTokenEncrypted: "v1:iv:refresh",
        },
        { requireRefreshToken: true },
      ),
    ).toEqual({ ok: true });
    expect(
      validateMercadoPagoOAuthTokenFields(
        {
          accessTokenEncrypted: "v1:iv:access",
        },
        { requireRefreshToken: true },
      ),
    ).toEqual({
      ok: false,
      code: "MERCADOPAGO_RECONNECT_REQUIRED",
      message: "Mercado Pago no esta conectado o requiere reconexion.",
      status: "expired",
    });
  });

  test("builds a refresh success patch with encrypted tokens only", () => {
    const patch = buildMercadoPagoRefreshSuccessPatch({
      now,
      accessTokenEncrypted: "v1:iv:new-access",
      refreshTokenEncrypted: "v1:iv:new-refresh",
      expiresIn: 3600,
      publicKey: "APP_USR-public-key",
      liveMode: true,
      mpUserId: "12345",
      tokenType: "bearer",
      scope: "offline_access",
    });

    expect(patch).toEqual({
      status: "connected",
      connectionSource: "oauth",
      accessToken: undefined,
      accessTokenEncrypted: "v1:iv:new-access",
      refreshTokenEncrypted: "v1:iv:new-refresh",
      accessTokenExpiresAt: now + 3600 * 1000,
      publicKey: "APP_USR-public-key",
      liveMode: true,
      mpUserId: "12345",
      collectorId: "12345",
      tokenType: "bearer",
      scope: "offline_access",
      lastRefreshAt: now,
      refreshError: undefined,
      refreshErrorAt: undefined,
      lastValidatedAt: now,
      updatedAt: now,
    });
    expect(JSON.stringify(patch)).not.toContain("APP_USR-new-access");
  });

  test("marks refresh failures safely", () => {
    expect(
      buildMercadoPagoRefreshFailurePatch({
        now,
        status: "expired",
        errorMessage: "invalid APP_USR-token refresh_token=hidden",
      }),
    ).toEqual({
      status: "expired",
      refreshError: "invalid [redacted] [redacted]",
      refreshErrorAt: now,
      lastValidatedAt: now,
      updatedAt: now,
    });
  });

  test("classifies invalid refresh token failures as expired", () => {
    expect(
      classifyMercadoPagoRefreshFailureStatus(
        new Error("Mercado Pago OAuth request failed with status 400: invalid_grant"),
      ),
    ).toBe("expired");
    expect(
      classifyMercadoPagoRefreshFailureStatus(
        new Error("MERCADOPAGO_CLIENT_SECRET is required."),
      ),
    ).toBe("error");
  });

  test("retries unauthorized Mercado Pago operations only for OAuth", () => {
    expect(shouldRetryMercadoPagoUnauthorizedOperation("oauth")).toBe(true);
    expect(shouldRetryMercadoPagoUnauthorizedOperation("manual")).toBe(false);
  });

  test("builds status metadata without any token fields", () => {
    const status = buildMercadoPagoSafeConnectionStatusFields({
      connectionSource: "oauth",
      mpUserId: "12345",
      liveMode: true,
      accessTokenExpiresAt: now + 1000,
      lastRefreshAt: now,
      refreshError: "safe error",
      refreshErrorAt: now + 1,
      accessToken: "APP_USR-manual",
      accessTokenEncrypted: "v1:iv:access",
      refreshTokenEncrypted: "v1:iv:refresh",
    });

    expect(status).toEqual({
      connectionSource: "oauth",
      mpUserId: "12345",
      liveMode: true,
      accessTokenExpiresAt: now + 1000,
      lastRefreshAt: now,
      refreshError: "safe error",
      refreshErrorAt: now + 1,
    });
    expect(JSON.stringify(status)).not.toContain("APP_USR-manual");
    expect(JSON.stringify(status)).not.toContain("v1:iv");
  });
});
