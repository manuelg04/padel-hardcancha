import type { Id } from "./_generated/dataModel";

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";
const MERCADO_PAGO_AUTH_BASE = "https://auth.mercadopago.com/authorization";

export type MercadoPagoEnvironment = "sandbox" | "production";

export type MercadoPagoOAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  user_id: number | string;
  refresh_token: string;
  public_key?: string;
  live_mode: boolean;
};

export type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

export type MercadoPagoPaymentResponse = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  collector_id?: number | string;
  order?: { id?: number | string };
  preference_id?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

export function getMercadoPagoEnvironment(): MercadoPagoEnvironment {
  return process.env.MERCADOPAGO_ENV === "production" ? "production" : "sandbox";
}

export function getAppBaseUrl() {
  return getRequiredEnv("APP_BASE_URL").replace(/\/$/, "");
}

export function getMercadoPagoRedirectUri() {
  return `${getAppBaseUrl()}/api/mercadopago/oauth/callback`;
}

function getClientId() {
  return process.env.MERCADOPAGO_CLIENT_ID ?? getRequiredEnv("MERCADOPAGO_APP_ID");
}

function getClientSecret() {
  return getRequiredEnv("MERCADOPAGO_CLIENT_SECRET");
}

async function mercadoPagoRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
) {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const parsed = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String(parsed.message)
        : "Mercado Pago request failed.";
    throw new Error(`Mercado Pago error ${response.status}: ${message}`);
  }

  return parsed as T;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function buildMercadoPagoOAuthUrl(state: string) {
  const url = new URL(MERCADO_PAGO_AUTH_BASE);
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("redirect_uri", getMercadoPagoRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeMercadoPagoOAuthCode(code: string) {
  return await mercadoPagoRequest<MercadoPagoOAuthTokenResponse>("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: getMercadoPagoRedirectUri(),
      test_token: getMercadoPagoEnvironment() === "sandbox" ? "true" : "false",
    }),
  });
}

export async function refreshMercadoPagoToken(refreshToken: string) {
  return await mercadoPagoRequest<MercadoPagoOAuthTokenResponse>("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
}

export async function createMercadoPagoPreference(args: {
  sellerAccessToken: string;
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  bookingId: Id<"bookings">;
  bookingCode: string;
  localDate: string;
  startMinutes: number;
  durationMinutes: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  expiresAt: number;
  allowOfflineMethods: boolean;
}) {
  const now = new Date();
  const baseUrl = getAppBaseUrl();
  const preferenceBody = {
    items: [
      {
        title: `Reserva cancha ${args.courtName} - ${args.clubName}`,
        quantity: 1,
        unit_price: args.amount,
        currency_id: "COP",
      },
    ],
    payer: {
      name: args.customerName,
      email: args.customerEmail,
      phone: {
        number: args.customerPhone,
      },
    },
    back_urls: {
      success: `${baseUrl}/club/${args.clubSlug}/reserva/${args.bookingCode}?payment=success`,
      failure: `${baseUrl}/club/${args.clubSlug}/reserva/${args.bookingCode}?payment=failure`,
      pending: `${baseUrl}/club/${args.clubSlug}/reserva/${args.bookingCode}?payment=pending`,
    },
    auto_return: "approved",
    notification_url: `${baseUrl}/api/mercadopago/webhook?clubId=${args.clubId}`,
    external_reference: `booking:${args.bookingId}`,
    metadata: {
      bookingId: args.bookingId,
      bookingCode: args.bookingCode,
      clubId: args.clubId,
      courtId: args.courtId,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
    },
    expires: true,
    expiration_date_from: now.toISOString(),
    expiration_date_to: new Date(args.expiresAt).toISOString(),
    marketplace_fee: 0,
    ...(args.allowOfflineMethods
      ? {}
      : {
          payment_methods: {
            excluded_payment_types: [{ id: "ticket" }],
          },
        }),
  };

  return await mercadoPagoRequest<MercadoPagoPreferenceResponse>(
    "/checkout/preferences",
    {
      method: "POST",
      accessToken: args.sellerAccessToken,
      body: JSON.stringify(preferenceBody),
    },
  );
}

export async function getMercadoPagoPayment(
  sellerAccessToken: string,
  providerPaymentId: string,
) {
  return await mercadoPagoRequest<MercadoPagoPaymentResponse>(
    `/v1/payments/${encodeURIComponent(providerPaymentId)}`,
    {
      method: "GET",
      accessToken: sellerAccessToken,
    },
  );
}
