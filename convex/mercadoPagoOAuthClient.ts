import { sanitizeMercadoPagoOAuthMessage } from "../lib/mercadoPagoOAuthRules";

const MERCADO_PAGO_OAUTH_TOKEN_URL =
  "https://api.mercadopago.com/oauth/token";

export type MercadoPagoOAuthTokenResult = {
  accessToken: string;
  refreshToken?: string;
  publicKey?: string;
  liveMode?: boolean;
  mpUserId?: string;
  tokenType?: string;
  expiresIn: number;
  scope?: string;
};

export async function exchangeMercadoPagoAuthorizationCode(args: {
  code: string;
  state: string;
  redirectUri: string;
}) {
  const env = getMercadoPagoOAuthEnv();

  return await requestMercadoPagoOAuthToken(
    new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
      state: args.state,
    }),
    { requireRefreshToken: true },
  );
}

export async function refreshMercadoPagoOAuthToken(args: {
  refreshToken: string;
}) {
  const env = getMercadoPagoOAuthEnv();

  return await requestMercadoPagoOAuthToken(
    new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      grant_type: "refresh_token",
      refresh_token: args.refreshToken,
    }),
    { requireRefreshToken: false },
  );
}

async function requestMercadoPagoOAuthToken(
  body: URLSearchParams,
  options: { requireRefreshToken: boolean },
): Promise<MercadoPagoOAuthTokenResult> {
  const response = await fetch(MERCADO_PAGO_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await response.text();
  const parsed = text ? tryParseJson(text) : null;

  if (!response.ok) {
    throw new Error(
      `Mercado Pago OAuth request failed with status ${response.status}: ${safeOAuthFailureMessage(
        parsed,
      )}`,
    );
  }

  return normalizeMercadoPagoOAuthTokenResponse(parsed, options);
}

function normalizeMercadoPagoOAuthTokenResponse(
  value: unknown,
  options: { requireRefreshToken: boolean },
): MercadoPagoOAuthTokenResult {
  if (!value || typeof value !== "object") {
    throw new Error("Mercado Pago did not return the expected OAuth fields.");
  }

  const record = value as Record<string, unknown>;
  const accessToken = optionalString(record.access_token);
  const refreshToken = optionalString(record.refresh_token);
  const expiresIn = optionalNumber(record.expires_in);

  if (
    !accessToken ||
    expiresIn === undefined ||
    (options.requireRefreshToken && !refreshToken)
  ) {
    throw new Error("Mercado Pago did not return the expected OAuth fields.");
  }

  return {
    accessToken,
    refreshToken,
    publicKey: optionalString(record.public_key),
    liveMode: optionalBoolean(record.live_mode),
    mpUserId: optionalString(record.user_id),
    tokenType: optionalString(record.token_type),
    expiresIn,
    scope: optionalString(record.scope),
  };
}

function getMercadoPagoOAuthEnv() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error("MERCADOPAGO_CLIENT_ID is required.");
  }

  if (!clientSecret) {
    throw new Error("MERCADOPAGO_CLIENT_SECRET is required.");
  }

  return { clientId, clientSecret };
}

function optionalString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function safeOAuthFailureMessage(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const message =
      optionalString(record.message) ??
      optionalString(record.error_description) ??
      optionalString(record.error);

    if (message) {
      return sanitizeMercadoPagoOAuthMessage(message);
    }
  }

  return "Mercado Pago no pudo procesar OAuth.";
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
