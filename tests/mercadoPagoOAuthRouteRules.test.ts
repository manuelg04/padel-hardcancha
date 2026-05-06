import { describe, expect, test } from "vitest";

import {
  buildMercadoPagoAuthorizationUrl,
  buildMercadoPagoOAuthResultRedirect,
  getMercadoPagoOAuthCallbackFailure,
  normalizeMercadoPagoOAuthRedirect,
  readMercadoPagoOAuthCallbackEnv,
  readMercadoPagoOAuthStartEnv,
} from "../lib/mercadoPagoOAuthRouteRules";

describe("Mercado Pago OAuth authorization URL", () => {
  test("builds the official Colombia authorization URL", () => {
    const url = buildMercadoPagoAuthorizationUrl({
      clientId: "123456789",
      redirectUri:
        "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
      state: "state-value",
    });

    expect(url.origin + url.pathname).toBe(
      "https://auth.mercadopago.com.co/authorization",
    );
    expect(url.searchParams.get("client_id")).toBe("123456789");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("platform_id")).toBe("mp");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
    );
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.toString()).toContain(
      "redirect_uri=https%3A%2F%2Fpadel-hardcancha.vercel.app%2Fapi%2Fmercadopago%2Foauth%2Fcallback",
    );
  });
});

describe("Mercado Pago OAuth safe redirects", () => {
  test("accepts internal admin routes", () => {
    expect(normalizeMercadoPagoOAuthRedirect("/admin/config")).toBe(
      "/admin/config",
    );
    expect(normalizeMercadoPagoOAuthRedirect("/admin/config?tab=pagos")).toBe(
      "/admin/config?tab=pagos",
    );
  });

  test("rejects external or unsafe redirects", () => {
    expect(normalizeMercadoPagoOAuthRedirect("https://evil.com")).toBe(
      "/admin/config",
    );
    expect(normalizeMercadoPagoOAuthRedirect("//evil.com")).toBe(
      "/admin/config",
    );
    expect(normalizeMercadoPagoOAuthRedirect("javascript:alert(1)")).toBe(
      "/admin/config",
    );
    expect(normalizeMercadoPagoOAuthRedirect("")).toBe("/admin/config");
  });

  test("adds safe result params without leaking callback inputs", () => {
    expect(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: "/admin/config?tab=pagos",
        result: "success",
      }),
    ).toBe("/admin/config?tab=pagos&mp_oauth=success");
    expect(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: "/admin/config",
        result: "error",
        reason: "missing_code",
      }),
    ).toBe("/admin/config?mp_oauth=error&reason=missing_code");
  });

  test("maps callback completion outcomes to safe final URLs", () => {
    expect(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: "/admin/config",
        result: "error",
        reason: "token_exchange_failed",
      }),
    ).toBe("/admin/config?mp_oauth=error&reason=token_exchange_failed");
    expect(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: "/admin/config",
        result: "error",
        reason: "save_connection_failed",
      }),
    ).toBe("/admin/config?mp_oauth=error&reason=save_connection_failed");
    expect(
      buildMercadoPagoOAuthResultRedirect({
        redirectPath: "/admin/config",
        result: "success",
      }),
    ).toBe("/admin/config?mp_oauth=success");
  });
});

describe("Mercado Pago OAuth callback mapping", () => {
  test("maps missing state and code safely", () => {
    expect(getMercadoPagoOAuthCallbackFailure(new URLSearchParams(""))).toEqual({
      reason: "missing_state",
    });
    expect(
      getMercadoPagoOAuthCallbackFailure(new URLSearchParams("state=safe")),
    ).toEqual({
      reason: "missing_code",
    });
  });

  test("maps provider errors safely", () => {
    expect(
      getMercadoPagoOAuthCallbackFailure(
        new URLSearchParams(
          "state=safe&error=access_denied&error_description=secret",
        ),
      ),
    ).toEqual({
      reason: "provider_error",
      errorCode: "access_denied",
      errorMessage: "secret",
    });
  });

  test("success has no preflight failure", () => {
    expect(
      getMercadoPagoOAuthCallbackFailure(
        new URLSearchParams("state=safe&code=auth-code"),
      ),
    ).toBeNull();
  });
});

describe("Mercado Pago OAuth env handling", () => {
  test("reads start env lazily and safely", () => {
    expect(
      readMercadoPagoOAuthStartEnv({
        MERCADOPAGO_CLIENT_ID: "123456789",
        MERCADOPAGO_OAUTH_REDIRECT_URI:
          "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
      }),
    ).toEqual({
      ok: true,
      clientId: "123456789",
      redirectUri:
        "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
    });
  });

  test("derives OAuth callback URL from the app base URL", () => {
    expect(
      readMercadoPagoOAuthStartEnv({
        MERCADOPAGO_CLIENT_ID: "123456789",
        APP_BASE_URL: "https://padel-hardcancha.vercel.app",
      }),
    ).toEqual({
      ok: true,
      clientId: "123456789",
      redirectUri:
        "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
    });
    expect(
      readMercadoPagoOAuthCallbackEnv({
        APP_BASE_URL: "https://padel-hardcancha.vercel.app",
      }),
    ).toEqual({
      ok: true,
      redirectUri:
        "https://padel-hardcancha.vercel.app/api/mercadopago/oauth/callback",
    });
  });

  test("fails safely when start env is missing", () => {
    expect(readMercadoPagoOAuthStartEnv({})).toEqual({
      ok: false,
      reason: "missing_env",
    });
  });
});
