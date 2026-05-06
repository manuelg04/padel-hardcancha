export type MercadoPagoOAuthRedirectResult = "success" | "error";

export type MercadoPagoOAuthFailureReason =
  | "missing_state"
  | "missing_code"
  | "invalid_state"
  | "expired_state"
  | "used_state"
  | "provider_error"
  | "token_exchange_failed"
  | "save_connection_failed"
  | "missing_env"
  | "unauthorized"
  | "forbidden";

const MERCADO_PAGO_AUTHORIZATION_URL =
  "https://auth.mercadopago.com.co/authorization";
const DEFAULT_OAUTH_REDIRECT = "/admin/config";
const DUMMY_INTERNAL_ORIGIN = "https://cancha.local";

export function buildMercadoPagoAuthorizationUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL(MERCADO_PAGO_AUTHORIZATION_URL);
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("state", args.state);

  return url;
}

export function normalizeMercadoPagoOAuthRedirect(
  value?: string | null,
  fallback = DEFAULT_OAUTH_REDIRECT,
) {
  const normalizedFallback = fallback.startsWith("/admin")
    ? fallback
    : DEFAULT_OAUTH_REDIRECT;
  const raw = value?.trim();

  if (!raw || raw.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) {
    return normalizedFallback;
  }

  try {
    const parsed = new URL(raw, DUMMY_INTERNAL_ORIGIN);
    const path = parsed.pathname;

    if (parsed.origin !== DUMMY_INTERNAL_ORIGIN) return normalizedFallback;
    if (path !== "/admin" && !path.startsWith("/admin/")) {
      return normalizedFallback;
    }

    return `${path}${parsed.search}`.slice(0, 240);
  } catch {
    return normalizedFallback;
  }
}

export function buildMercadoPagoOAuthResultRedirect(args: {
  redirectPath?: string;
  result: MercadoPagoOAuthRedirectResult;
  reason?: MercadoPagoOAuthFailureReason;
}) {
  const redirectPath = normalizeMercadoPagoOAuthRedirect(args.redirectPath);
  const url = new URL(redirectPath, DUMMY_INTERNAL_ORIGIN);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.set("mp_oauth", args.result);

  if (args.result === "error" && args.reason) {
    url.searchParams.set("reason", args.reason);
  } else {
    url.searchParams.delete("reason");
  }

  return `${url.pathname}${url.search}`;
}

export function getMercadoPagoOAuthCallbackFailure(params: URLSearchParams):
  | {
      reason: MercadoPagoOAuthFailureReason;
      errorCode?: string;
      errorMessage?: string;
    }
  | null {
  const state = params.get("state")?.trim();

  if (!state) {
    return { reason: "missing_state" };
  }

  const providerError = params.get("error")?.trim();

  if (providerError) {
    return {
      reason: "provider_error",
      errorCode: providerError,
      errorMessage: params.get("error_description")?.trim() || providerError,
    };
  }

  if (!params.get("code")?.trim()) {
    return { reason: "missing_code" };
  }

  return null;
}

export function readMercadoPagoOAuthStartEnv(env: Record<string, string | undefined>) {
  const clientId = env.MERCADOPAGO_CLIENT_ID?.trim();
  const redirectUri = getMercadoPagoOAuthRedirectUri(env);

  if (!clientId || !redirectUri) {
    return {
      ok: false as const,
      reason: "missing_env" as const,
    };
  }

  return {
    ok: true as const,
    clientId,
    redirectUri,
  };
}

export function readMercadoPagoOAuthCallbackEnv(
  env: Record<string, string | undefined>,
) {
  const redirectUri = getMercadoPagoOAuthRedirectUri(env);

  if (!redirectUri) {
    return {
      ok: false as const,
      reason: "missing_env" as const,
    };
  }

  return {
    ok: true as const,
    redirectUri,
  };
}

export function mapMercadoPagoOAuthStateErrorReason(code?: string) {
  if (code === "OAUTH_STATE_EXPIRED") return "expired_state" as const;
  if (code === "OAUTH_STATE_NOT_PENDING") return "used_state" as const;
  return "invalid_state" as const;
}

function getMercadoPagoOAuthRedirectUri(env: Record<string, string | undefined>) {
  const explicitRedirectUri = env.MERCADOPAGO_OAUTH_REDIRECT_URI?.trim();

  if (explicitRedirectUri && isValidAbsoluteUrl(explicitRedirectUri)) {
    return explicitRedirectUri;
  }

  const appBaseUrl = env.APP_BASE_URL?.trim();

  if (!appBaseUrl || !isValidAbsoluteUrl(appBaseUrl)) return null;

  return new URL("/api/mercadopago/oauth/callback", appBaseUrl).toString();
}

function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
