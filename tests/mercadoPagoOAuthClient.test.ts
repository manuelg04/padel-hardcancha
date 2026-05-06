import { afterEach, describe, expect, test, vi } from "vitest";

import {
  exchangeMercadoPagoAuthorizationCode,
  refreshMercadoPagoOAuthToken,
} from "../convex/mercadoPagoOAuthClient";

const originalFetch = globalThis.fetch;

function stubOAuthEnv() {
  vi.stubEnv("MERCADOPAGO_CLIENT_ID", "client-id");
  vi.stubEnv("MERCADOPAGO_CLIENT_SECRET", "client-secret");
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
    void args;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Mercado Pago OAuth client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", originalFetch);
  });

  test("normalizes a valid authorization-code response", async () => {
    stubOAuthEnv();
    const fetchMock = mockFetch(
      Response.json({
        access_token: "APP_USR-access-token",
        public_key: "APP_USR-public-key",
        refresh_token: "refresh-token",
        live_mode: true,
        user_id: 12345,
        token_type: "bearer",
        expires_in: 15552000,
        scope: "offline_access payments write",
      }),
    );

    const result = await exchangeMercadoPagoAuthorizationCode({
      code: "auth-code",
      state: "safe-state",
      redirectUri:
        "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
    });

    expect(result).toEqual({
      accessToken: "APP_USR-access-token",
      publicKey: "APP_USR-public-key",
      refreshToken: "refresh-token",
      liveMode: true,
      mpUserId: "12345",
      tokenType: "bearer",
      expiresIn: 15552000,
      scope: "offline_access payments write",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/oauth/token",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("redirect_uri=https%3A%2F%2Fpadel-hardcancha");
  });

  test("fails safely when the authorization-code response is incomplete", async () => {
    stubOAuthEnv();
    mockFetch(
      Response.json({
        access_token: "APP_USR-access-token",
        expires_in: 15552000,
      }),
    );

    await expect(
      exchangeMercadoPagoAuthorizationCode({
        code: "auth-code",
        state: "safe-state",
        redirectUri:
          "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
      }),
    ).rejects.toThrow("Mercado Pago did not return the expected OAuth fields.");
  });

  test("normalizes a valid refresh response without requiring a new refresh token", async () => {
    stubOAuthEnv();
    mockFetch(
      Response.json({
        access_token: "APP_USR-new-access-token",
        live_mode: false,
        token_type: "bearer",
        expires_in: 15552000,
        scope: "offline_access payments write",
      }),
    );

    await expect(
      refreshMercadoPagoOAuthToken({
        refreshToken: "refresh-token",
      }),
    ).resolves.toEqual({
      accessToken: "APP_USR-new-access-token",
      refreshToken: undefined,
      publicKey: undefined,
      liveMode: false,
      mpUserId: undefined,
      tokenType: "bearer",
      expiresIn: 15552000,
      scope: "offline_access payments write",
    });
  });

  test("converts Mercado Pago failures to safe errors without tokens", async () => {
    stubOAuthEnv();
    mockFetch(
      Response.json(
        {
          message: "invalid APP_USR-access-token client_secret=hidden",
        },
        { status: 400 },
      ),
    );

    await expect(
      refreshMercadoPagoOAuthToken({
        refreshToken: "refresh-token",
      }),
    ).rejects.toThrow(
      "Mercado Pago OAuth request failed with status 400: invalid [redacted] [redacted]",
    );
  });
});
