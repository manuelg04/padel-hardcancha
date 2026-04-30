import {
  mapMercadoPagoStatus,
  paymentLifecycleUpdatesForProviderStatus,
  type BookingSource,
  type BookingStatus,
} from "../../lib/paymentRules";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { getMercadoPagoPayment } from "../mercadoPagoClient";
import { getSellerAccessToken } from "./connections";
import type { ConnectionSecret } from "./types";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const omitUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<Mutable<T>>;

export function extractProviderPaymentId(
  payload: unknown,
  query: Record<string, string>,
) {
  if (query["data.id"]) return query["data.id"];
  if (query.id && (query.type === "payment" || query.topic === "payment")) {
    return query.id;
  }

  if (payload && typeof payload === "object") {
    const data = "data" in payload ? (payload as { data?: unknown }).data : null;
    if (data && typeof data === "object" && "id" in data) {
      return String((data as { id: unknown }).id);
    }
  }

  return null;
}

export function stringFromPayload(payload: unknown, key: string) {
  if (payload && typeof payload === "object" && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return value === undefined || value === null ? undefined : String(value);
  }
  return undefined;
}

export const processMercadoPagoWebhookHandler = async (
  ctx: ActionCtx,
  args: { query: unknown; payload: unknown },
) => {
  const query = args.query as Record<string, string>;
  const providerPaymentId = extractProviderPaymentId(args.payload, query);
  const eventType = stringFromPayload(args.payload, "type") ?? query.type;
  const actionName = stringFromPayload(args.payload, "action") ?? query.action;
  const dateCreated = stringFromPayload(args.payload, "date_created");
  const eventId =
    stringFromPayload(args.payload, "id") ??
    `mercadopago:${eventType ?? "unknown"}:${actionName ?? "unknown"}:${
      providerPaymentId ?? "no-payment"
    }:${dateCreated ?? "no-date"}`;

  const event = await ctx.runMutation(
    internal.payments._recordWebhookEventStart,
    {
      eventId,
      clubId: query.clubId as Id<"clubs"> | undefined,
      providerPaymentId: providerPaymentId ?? undefined,
      eventType,
      action: actionName,
      rawPayload: args.payload,
    },
  );

  if (!event.shouldProcess) {
    return { processed: false };
  }

  if (!providerPaymentId) {
    await ctx.runMutation(internal.payments._markWebhookEventProcessed, {
      eventId: event.eventId,
    });
    return { processed: false };
  }

  const connection = (await ctx.runQuery(
    internal.payments._getConnectionForWebhook,
    {
      clubId: query.clubId as Id<"clubs"> | undefined,
      collectorId: stringFromPayload(args.payload, "user_id"),
    },
  )) as ConnectionSecret | null;

  if (!connection) {
    throw new Error("Mercado Pago connection not found for webhook.");
  }

  const sellerAccessToken = await getSellerAccessToken(ctx, connection);
  const mercadoPagoPayment = await getMercadoPagoPayment(
    sellerAccessToken,
    providerPaymentId,
  );

  if (
    mercadoPagoPayment.collector_id !== undefined &&
    String(mercadoPagoPayment.collector_id) !== connection.collectorId
  ) {
    throw new Error("Mercado Pago collector does not match this club.");
  }

  await ctx.runMutation(internal.payments._applyWebhookPaymentStatus, {
    eventId: event.eventId,
    clubId: connection.clubId,
    providerPaymentId,
    providerMerchantOrderId:
      mercadoPagoPayment.order?.id === undefined
        ? undefined
        : String(mercadoPagoPayment.order.id),
    providerPreferenceId: mercadoPagoPayment.preference_id,
    providerCollectorId:
      mercadoPagoPayment.collector_id === undefined
        ? connection.collectorId
        : String(mercadoPagoPayment.collector_id),
    externalReference: mercadoPagoPayment.external_reference,
    status: mapMercadoPagoStatus(mercadoPagoPayment.status),
    statusDetail: mercadoPagoPayment.status_detail,
    paymentMethod: mercadoPagoPayment.payment_method_id,
    paymentType: mercadoPagoPayment.payment_type_id,
    amount: mercadoPagoPayment.transaction_amount,
    currency: mercadoPagoPayment.currency_id,
    paidAt: mercadoPagoPayment.date_approved
      ? Date.parse(mercadoPagoPayment.date_approved)
      : undefined,
    rawLastWebhookEvent: args.payload,
  });

  return { processed: true };
};

export const getConnectionForWebhookHandler = async (
  ctx: QueryCtx,
  args: {
    clubId?: Id<"clubs">;
    collectorId?: string;
  },
) => {
  const connection = args.clubId
    ? await ctx.db
        .query("mercadoPagoConnections")
        .withIndex("by_club", (q) => q.eq("clubId", args.clubId!))
        .unique()
    : args.collectorId
      ? await ctx.db
          .query("mercadoPagoConnections")
          .withIndex("by_collector", (q) => q.eq("collectorId", args.collectorId!))
          .unique()
      : null;

  if (!connection || connection.status !== "connected") return null;

  return {
    _id: connection._id,
    clubId: connection.clubId,
    status: connection.status,
    environment: connection.environment,
    collectorId: connection.collectorId,
    publicKey: connection.publicKey,
    accessTokenEncrypted: connection.accessTokenEncrypted,
    refreshTokenEncrypted: connection.refreshTokenEncrypted,
    accessTokenExpiresAt: connection.accessTokenExpiresAt,
    liveMode: connection.liveMode,
    scope: connection.scope,
  };
};

export const recordWebhookEventStartHandler = async (
  ctx: MutationCtx,
  args: {
    eventId: string;
    clubId?: Id<"clubs">;
    providerPaymentId?: string;
    eventType?: string;
    action?: string;
    rawPayload: unknown;
  },
) => {
  const existing = await ctx.db
    .query("paymentWebhookEvents")
    .withIndex("by_provider_event", (q) =>
      q.eq("provider", "mercadopago").eq("eventId", args.eventId),
    )
    .unique();

  if (existing) {
    return {
      eventId: existing.eventId,
      shouldProcess: existing.processedAt === undefined,
    };
  }

  await ctx.db.insert("paymentWebhookEvents", {
    provider: "mercadopago",
    eventId: args.eventId,
    clubId: args.clubId,
    providerPaymentId: args.providerPaymentId,
    eventType: args.eventType,
    action: args.action,
    rawPayload: args.rawPayload,
    createdAt: Date.now(),
  });

  return { eventId: args.eventId, shouldProcess: true };
};

export const markWebhookEventProcessedHandler = async (
  ctx: MutationCtx,
  args: { eventId: string },
) => {
  const event = await ctx.db
    .query("paymentWebhookEvents")
    .withIndex("by_provider_event", (q) =>
      q.eq("provider", "mercadopago").eq("eventId", args.eventId),
    )
    .unique();

  if (event) {
    await ctx.db.patch(event._id, { processedAt: Date.now() });
  }

  return null;
};

export const applyWebhookPaymentStatusHandler = async (
  ctx: MutationCtx,
  args: {
    eventId: string;
    clubId: Id<"clubs">;
    providerPaymentId: string;
    providerPreferenceId?: string;
    providerMerchantOrderId?: string;
    providerCollectorId?: string;
    externalReference?: string;
    status: Doc<"payments">["status"];
    statusDetail?: string;
    paymentMethod?: string;
    paymentType?: string;
    amount?: number;
    currency?: string;
    paidAt?: number;
    rawLastWebhookEvent: unknown;
  },
) => {
  if (!args.externalReference?.startsWith("booking:")) {
    throw new Error("Mercado Pago payment has invalid external_reference.");
  }

  const matchingPayments = await ctx.db
    .query("payments")
    .withIndex("by_external_reference", (q) =>
      q.eq("externalReference", args.externalReference!),
    )
    .collect();
  const payment =
    matchingPayments
      .filter((entry) => entry.clubId === args.clubId)
      .sort((a, b) => {
        const aPreferenceMatch =
          args.providerPreferenceId &&
          a.providerPreferenceId === args.providerPreferenceId
            ? 1
            : 0;
        const bPreferenceMatch =
          args.providerPreferenceId &&
          b.providerPreferenceId === args.providerPreferenceId
            ? 1
            : 0;

        return bPreferenceMatch - aPreferenceMatch || b.createdAt - a.createdAt;
      })[0] ?? null;

  if (!payment) {
    throw new Error("Internal payment not found for Mercado Pago webhook.");
  }

  const booking = await ctx.db.get(payment.bookingId);
  if (!booking) {
    throw new Error("Booking not found for Mercado Pago webhook.");
  }

  const now = Date.now();
  const paymentPatch: Partial<Doc<"payments">> = {
    providerPaymentId: args.providerPaymentId,
    providerPreferenceId:
      args.providerPreferenceId ?? payment.providerPreferenceId,
    providerMerchantOrderId: args.providerMerchantOrderId,
    providerCollectorId: args.providerCollectorId,
    status: args.status,
    statusDetail: args.statusDetail,
    paymentMethod: args.paymentMethod,
    paymentType: args.paymentType,
    amount: args.amount ?? payment.amount,
    currency: args.currency ?? payment.currency,
    rawLastWebhookEvent: args.rawLastWebhookEvent,
    updatedAt: now,
  };
  const bookingPatch: Partial<Doc<"bookings">> = { updatedAt: now };
  const lifecycleUpdates = paymentLifecycleUpdatesForProviderStatus({
    status: args.status,
    bookingStatus: booking.bookingStatus as BookingStatus,
    source: booking.source as BookingSource,
    now,
    paidAt: args.paidAt,
  });

  Object.assign(paymentPatch, lifecycleUpdates.payment);
  Object.assign(bookingPatch, omitUndefined(lifecycleUpdates.booking));

  await ctx.db.patch(payment._id, paymentPatch);
  await ctx.db.patch(booking._id, bookingPatch);

  const event = await ctx.db
    .query("paymentWebhookEvents")
    .withIndex("by_provider_event", (q) =>
      q.eq("provider", "mercadopago").eq("eventId", args.eventId),
    )
    .unique();

  if (event) {
    await ctx.db.patch(event._id, {
      clubId: args.clubId,
      paymentId: payment._id,
      providerPaymentId: args.providerPaymentId,
      processedAt: now,
    });
  }

  await ctx.db.insert("auditLogs", {
    clubId: args.clubId,
    action: "payment.webhook_applied",
    entityType: "payment",
    entityId: payment._id,
    metadata: {
      providerPaymentId: args.providerPaymentId,
      status: args.status,
      eventId: args.eventId,
    },
    createdAt: now,
  });

  return null;
};
