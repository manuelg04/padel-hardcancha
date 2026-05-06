import type { Id } from "./_generated/dataModel";
import { sanitizeMercadoPagoOAuthMessage } from "../lib/mercadoPagoOAuthRules";
import {
  buildReservationPaymentExternalReference,
  type OnlineReservationPaymentType,
} from "../lib/reservationPaymentOptionRules";

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";

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
  merchant_order_id?: number | string;
  order?: { id?: number | string };
  preference_id?: string;
  transaction_amount?: number;
  transaction_details?: {
    net_received_amount?: number;
    money_release_date?: string;
  };
  fee_details?: Array<{
    type?: string;
    amount?: number;
  }>;
  charges_details?: Array<{
    type?: string;
    name?: string;
    amount?: number;
    amounts?: {
      original?: number;
    };
    metadata?: Record<string, unknown>;
  }>;
  currency_id?: string;
  date_approved?: string;
  money_release_date?: string;
  installments?: number;
};

export class MercadoPagoApiError extends Error {
  status: number;
  safeMessage: string;

  constructor(status: number, safeMessage: string) {
    super(`Mercado Pago error ${status}: ${safeMessage}`);
    this.name = "MercadoPagoApiError";
    this.status = status;
    this.safeMessage = safeMessage;
  }
}

function getAppBaseUrl() {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (vercelUrl ? `https://${vercelUrl}` : undefined) ??
    "https://padel-hardcancha.vercel.app"
  ).replace(/\/$/, "");
}

async function mercadoPagoRequest<T>(
  path: string,
  options: RequestInit & { accessToken: string },
) {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  headers.set("authorization", `Bearer ${options.accessToken}`);

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const parsed = text ? tryParseJson(text) : null;

  if (!response.ok) {
    const rawMessage =
      parsed && typeof parsed === "object" && "message" in parsed
        ? String(parsed.message)
        : "Mercado Pago no pudo procesar la solicitud.";
    throw new MercadoPagoApiError(
      response.status,
      sanitizeMercadoPagoOAuthMessage(rawMessage),
    );
  }

  return parsed as T;
}

export function isMercadoPagoUnauthorizedError(error: unknown) {
  return error instanceof MercadoPagoApiError && error.status === 401;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function getMercadoPagoCheckoutUrl(preference: MercadoPagoPreferenceResponse) {
  return preference.init_point ?? preference.sandbox_init_point;
}

export async function createMercadoPagoDepositPreference(args: {
  sellerAccessToken: string;
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  reservationId: Id<"bookings">;
  reservationCode: string;
  reservationPaymentId: Id<"reservationPayments">;
  userId: Id<"users">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
}) {
  return await createMercadoPagoReservationPreference({
    ...args,
    paymentType: "deposit",
  });
}

export async function createMercadoPagoReservationPreference(args: {
  sellerAccessToken: string;
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  reservationId: Id<"bookings">;
  reservationCode: string;
  reservationPaymentId: Id<"reservationPayments">;
  userId: Id<"users">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  paymentType: OnlineReservationPaymentType;
}) {
  const baseUrl = getAppBaseUrl();
  const title =
    args.paymentType === "full_payment"
      ? "Pago completo reserva cancha"
      : "Abono reserva cancha";

  return await mercadoPagoRequest<MercadoPagoPreferenceResponse>(
    "/checkout/preferences",
    {
      method: "POST",
      accessToken: args.sellerAccessToken,
      body: JSON.stringify({
        items: [
          {
            title,
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
          success: `${baseUrl}/club/${args.clubSlug}/reserva/${args.reservationCode}?payment=success`,
          failure: `${baseUrl}/club/${args.clubSlug}/reserva/${args.reservationCode}?payment=failure`,
          pending: `${baseUrl}/club/${args.clubSlug}/reserva/${args.reservationCode}?payment=pending`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/mercadopago/webhook?clubId=${args.clubId}`,
        external_reference: buildReservationPaymentExternalReference(
          args.paymentType,
          args.reservationPaymentId,
        ),
        metadata: {
          reservationId: args.reservationId,
          reservationPaymentId: args.reservationPaymentId,
          clubId: args.clubId,
          courtId: args.courtId,
          userId: args.userId,
          paymentType: args.paymentType,
        },
      }),
    },
  );
}

export async function getMercadoPagoPayment(
  sellerAccessToken: string,
  mercadoPagoPaymentId: string,
) {
  return await mercadoPagoRequest<MercadoPagoPaymentResponse>(
    `/v1/payments/${encodeURIComponent(mercadoPagoPaymentId)}`,
    {
      method: "GET",
      accessToken: sellerAccessToken,
    },
  );
}
