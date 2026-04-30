import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { BOGOTA_TIMEZONE, calculateBookingValue } from "../lib/bookingRules";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertCanBook,
  buildBookingCode,
  getClubOrThrow,
  getCourtOrThrow,
  upsertCustomer,
} from "./bookings";
import {
  buildMercadoPagoOAuthUrl,
  createMercadoPagoPreference,
  exchangeMercadoPagoOAuthCode,
  getMercadoPagoEnvironment,
  getMercadoPagoPayment,
  refreshMercadoPagoToken,
} from "./mercadoPagoClient";
import {
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
} from "./mercadoPagoCrypto";
import {
  paymentProviderEnvironmentValidator,
  paymentSafeValidator,
  providerPaymentStatusValidator,
  sourceValidator,
} from "./validators";
import {
  getCurrentUserClub,
  requireClubAccess,
  requireClubAccessForUser,
  requireSuperAdmin,
} from "./access";

const DEFAULT_PAYMENT_HOLD_MINUTES = 15;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type Ctx = QueryCtx | MutationCtx;

type CheckoutPreparation = {
  clubId: Id<"clubs">;
  clubSlug: string;
  clubName: string;
  courtId: Id<"courts">;
  courtName: string;
  bookingId: Id<"bookings">;
  bookingCode: string;
  paymentId: Id<"payments">;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  localDate: string;
  startMinutes: number;
  durationMinutes: number;
  amount: number;
  expiresAt: number;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt?: number;
  allowOfflineMethods: boolean;
};

type CheckoutActionResult = {
  checkoutUrl: string;
  bookingCode: string;
  bookingId: Id<"bookings">;
  paymentId: Id<"payments">;
};

type PendingOAuthState = {
  _id: Id<"mercadoPagoOAuthStates">;
  clubId: Id<"clubs">;
  userId: Id<"users">;
};

const checkoutPreparationValidator = v.object({
  clubId: v.id("clubs"),
  clubSlug: v.string(),
  clubName: v.string(),
  courtId: v.id("courts"),
  courtName: v.string(),
  bookingId: v.id("bookings"),
  bookingCode: v.string(),
  paymentId: v.id("payments"),
  customerName: v.string(),
  customerPhone: v.string(),
  customerEmail: v.optional(v.string()),
  localDate: v.string(),
  startMinutes: v.number(),
  durationMinutes: v.number(),
  amount: v.number(),
  expiresAt: v.number(),
  accessTokenEncrypted: v.string(),
  refreshTokenEncrypted: v.string(),
  accessTokenExpiresAt: v.optional(v.number()),
  allowOfflineMethods: v.boolean(),
});

const connectionSecretValidator = v.object({
  _id: v.id("mercadoPagoConnections"),
  clubId: v.id("clubs"),
  status: v.string(),
  environment: paymentProviderEnvironmentValidator,
  collectorId: v.string(),
  publicKey: v.optional(v.string()),
  accessTokenEncrypted: v.string(),
  refreshTokenEncrypted: v.string(),
  accessTokenExpiresAt: v.optional(v.number()),
  liveMode: v.boolean(),
  scope: v.optional(v.string()),
});

function paymentHoldMinutes(club: Doc<"clubs">) {
  return club.paymentHoldMinutes ?? DEFAULT_PAYMENT_HOLD_MINUTES;
}

function paymentHoldExpiresAt(club: Doc<"clubs">, now: number) {
  return now + paymentHoldMinutes(club) * 60 * 1000;
}

function safePayment(payment: Doc<"payments">) {
  return {
    _id: payment._id,
    _creationTime: payment._creationTime,
    clubId: payment.clubId,
    bookingId: payment.bookingId,
    customerId: payment.customerId,
    playerUserId: payment.playerUserId,
    provider: payment.provider,
    providerEnvironment: payment.providerEnvironment,
    providerPreferenceId: payment.providerPreferenceId,
    providerPaymentId: payment.providerPaymentId,
    providerMerchantOrderId: payment.providerMerchantOrderId,
    providerCollectorId: payment.providerCollectorId,
    externalReference: payment.externalReference,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    statusDetail: payment.statusDetail,
    checkoutUrl: payment.checkoutUrl,
    sandboxCheckoutUrl: payment.sandboxCheckoutUrl,
    paymentMethod: payment.paymentMethod,
    paymentType: payment.paymentType,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
    failedAt: payment.failedAt,
    refundedAt: payment.refundedAt,
    createdByUserId: payment.createdByUserId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

async function getActiveConnection(ctx: Ctx, clubId: Id<"clubs">) {
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .unique();

  if (!connection || connection.status !== "connected") {
    throw new ConvexError({
      code: "MERCADOPAGO_NOT_CONNECTED",
      message: "Este club aun no tiene Mercado Pago conectado.",
    });
  }

  return connection;
}

async function getLatestPaymentForBooking(ctx: Ctx, bookingId: Id<"bookings">) {
  const payments = await ctx.db
    .query("payments")
    .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
    .collect();

  return payments.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

async function getSellerAccessToken(
  ctx: ActionCtx,
  connection: {
    clubId: Id<"clubs">;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    accessTokenExpiresAt?: number;
  },
) {
  if (
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt < Date.now() + TOKEN_REFRESH_WINDOW_MS
  ) {
    const refreshToken = await decryptMercadoPagoToken(
      connection.refreshTokenEncrypted,
    );
    const refreshed = await refreshMercadoPagoToken(refreshToken);
    const accessTokenEncrypted = await encryptMercadoPagoToken(
      refreshed.access_token,
    );
    const refreshTokenEncrypted = await encryptMercadoPagoToken(
      refreshed.refresh_token,
    );
    const accessTokenExpiresAt =
      Date.now() + (refreshed.expires_in ?? 15552000) * 1000;

    await ctx.runMutation(internal.payments._storeRefreshedConnection, {
      clubId: connection.clubId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      accessTokenExpiresAt,
      publicKey: refreshed.public_key,
      liveMode: refreshed.live_mode,
      scope: refreshed.scope,
    });

    return refreshed.access_token;
  }

  return await decryptMercadoPagoToken(connection.accessTokenEncrypted);
}

function providerCheckoutUrl(
  preference: { init_point?: string; sandbox_init_point?: string },
) {
  if (getMercadoPagoEnvironment() === "sandbox" && preference.sandbox_init_point) {
    return preference.sandbox_init_point;
  }

  return preference.init_point ?? preference.sandbox_init_point;
}

async function createPreferenceAndAttach(
  ctx: ActionCtx,
  preparation: CheckoutPreparation,
): Promise<CheckoutActionResult> {
  try {
    const sellerAccessToken = await getSellerAccessToken(ctx, preparation);
    const preference = await createMercadoPagoPreference({
      sellerAccessToken,
      clubId: preparation.clubId,
      clubSlug: preparation.clubSlug,
      clubName: preparation.clubName,
      courtId: preparation.courtId,
      courtName: preparation.courtName,
      bookingId: preparation.bookingId,
      bookingCode: preparation.bookingCode,
      localDate: preparation.localDate,
      startMinutes: preparation.startMinutes,
      durationMinutes: preparation.durationMinutes,
      customerName: preparation.customerName,
      customerPhone: preparation.customerPhone,
      customerEmail: preparation.customerEmail,
      amount: preparation.amount,
      expiresAt: preparation.expiresAt,
      allowOfflineMethods: preparation.allowOfflineMethods,
    });
    const checkoutUrl = providerCheckoutUrl(preference);

    if (!checkoutUrl) {
      throw new Error("Mercado Pago did not return a checkout URL.");
    }

    await ctx.runMutation(internal.payments._attachPreferenceToPayment, {
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
      providerPreferenceId: preference.id,
      checkoutUrl,
      sandboxCheckoutUrl: preference.sandbox_init_point,
    });

    return {
      checkoutUrl,
      bookingCode: preparation.bookingCode,
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
    };
  } catch (error) {
    await ctx.runMutation(internal.payments._markPreferenceCreationFailed, {
      bookingId: preparation.bookingId,
      paymentId: preparation.paymentId,
      message:
        error instanceof Error
          ? error.message
          : "No pudimos crear el link de Mercado Pago.",
    });
    throw error;
  }
}

function mapMercadoPagoStatus(status?: string) {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status === "in_process") return "in_process";
  if (status === "rejected") return "rejected";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "charged_back") return "charged_back";
  return "error";
}

function extractProviderPaymentId(payload: unknown, query: Record<string, string>) {
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

function stringFromPayload(payload: unknown, key: string) {
  if (payload && typeof payload === "object" && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return value === undefined || value === null ? undefined : String(value);
  }
  return undefined;
}

export const getClubMercadoPagoStatus = query({
  args: {},
  returns: v.object({
    clubId: v.id("clubs"),
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    allowOfflineMercadoPagoMethods: v.boolean(),
    status: v.string(),
    environment: v.optional(paymentProviderEnvironmentValidator),
    collectorId: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastRefreshAt: v.optional(v.number()),
    accessTokenExpiresAt: v.optional(v.number()),
    canManageConnection: v.boolean(),
  }),
  handler: async (ctx) => {
    const { club, clubUser } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();

    return {
      clubId: club._id,
      onlinePaymentsEnabled: club.onlinePaymentsEnabled ?? false,
      onlinePaymentRequired: club.onlinePaymentRequired ?? false,
      paymentHoldMinutes: paymentHoldMinutes(club),
      allowOfflineMercadoPagoMethods:
        club.allowOfflineMercadoPagoMethods ?? false,
      status:
        connection?.status ?? club.mercadoPagoConnectionStatus ?? "disconnected",
      environment: connection?.environment,
      collectorId: connection?.collectorId,
      connectedAt: connection?.connectedAt,
      lastRefreshAt: connection?.lastRefreshAt,
      accessTokenExpiresAt: connection?.accessTokenExpiresAt,
      canManageConnection: clubUser.role === "club_master",
    };
  },
});

export const getClubMercadoPagoPublicStatus = query({
  args: { clubSlug: v.string() },
  returns: v.object({
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    connected: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
      .unique();

    if (!club || !club.isActive || !club.isPublished) {
      return {
        onlinePaymentsEnabled: false,
        onlinePaymentRequired: false,
        paymentHoldMinutes: DEFAULT_PAYMENT_HOLD_MINUTES,
        connected: false,
      };
    }

    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();
    const connected = connection?.status === "connected";

    return {
      onlinePaymentsEnabled: (club.onlinePaymentsEnabled ?? false) && connected,
      onlinePaymentRequired: club.onlinePaymentRequired ?? false,
      paymentHoldMinutes: paymentHoldMinutes(club),
      connected,
    };
  },
});

export const updateClubPaymentSettings = mutation({
  args: {
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    allowOfflineMercadoPagoMethods: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);

    if (args.paymentHoldMinutes < 5 || args.paymentHoldMinutes > 60) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "El tiempo de pago debe estar entre 5 y 60 minutos.",
      });
    }

    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();

    if (args.onlinePaymentsEnabled && connection?.status !== "connected") {
      throw new ConvexError({
        code: "MERCADOPAGO_NOT_CONNECTED",
        message: "Conecta Mercado Pago antes de activar pagos online.",
      });
    }

    await ctx.db.patch(club._id, {
      onlinePaymentsEnabled: args.onlinePaymentsEnabled,
      onlinePaymentRequired: args.onlinePaymentRequired,
      paymentHoldMinutes: args.paymentHoldMinutes,
      allowOfflineMercadoPagoMethods: args.allowOfflineMercadoPagoMethods,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const startMercadoPagoOAuth = mutation({
  args: { state: v.string() },
  returns: v.object({ authUrl: v.string() }),
  handler: async (ctx, args) => {
    if (args.state.length < 24) {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "No pudimos iniciar la conexion de Mercado Pago.",
      });
    }

    const { club, userId } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const now = Date.now();

    await ctx.db.insert("mercadoPagoOAuthStates", {
      clubId: club._id,
      userId,
      state: args.state,
      status: "pending",
      expiresAt: now + OAUTH_STATE_TTL_MS,
      createdAt: now,
    });
    await ctx.db.insert("auditLogs", {
      clubId: club._id,
      userId,
      action: "mercadopago.oauth_started",
      entityType: "club",
      entityId: club._id,
      createdAt: now,
    });

    return { authUrl: buildMercadoPagoOAuthUrl(args.state) };
  },
});

export const disconnectMercadoPago = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { club, userId } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .unique();
    const now = Date.now();

    if (connection) {
      await ctx.db.patch(connection._id, {
        status: "disconnected",
        disconnectedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(club._id, {
      mercadoPagoConnectionStatus: "disconnected",
      onlinePaymentsEnabled: false,
      onlinePaymentRequired: false,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      clubId: club._id,
      userId,
      action: "mercadopago.disconnected",
      entityType: "mercadoPagoConnection",
      entityId: connection?._id,
      createdAt: now,
    });

    return null;
  },
});

export const completeMercadoPagoOAuth = action({
  args: { code: v.string(), state: v.string() },
  returns: v.object({ clubId: v.id("clubs") }),
  handler: async (ctx, args): Promise<{ clubId: Id<"clubs"> }> => {
    const state = (await ctx.runQuery(
      internal.payments._getPendingOAuthState,
      {
        state: args.state,
        now: Date.now(),
      },
    )) as PendingOAuthState | null;

    if (!state) {
      throw new Error("Invalid or expired Mercado Pago OAuth state.");
    }

    const tokenResponse = await exchangeMercadoPagoOAuthCode(args.code);
    const [accessTokenEncrypted, refreshTokenEncrypted] = await Promise.all([
      encryptMercadoPagoToken(tokenResponse.access_token),
      encryptMercadoPagoToken(tokenResponse.refresh_token),
    ]);

    await ctx.runMutation(internal.payments._completeOAuthConnection, {
      oauthStateId: state._id,
      clubId: state.clubId,
      userId: state.userId,
      collectorId: String(tokenResponse.user_id),
      publicKey: tokenResponse.public_key,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      accessTokenExpiresAt:
        Date.now() + (tokenResponse.expires_in ?? 15552000) * 1000,
      liveMode: tokenResponse.live_mode,
      scope: tokenResponse.scope,
      environment: getMercadoPagoEnvironment(),
    });

    return { clubId: state.clubId };
  },
});

export const createOnlineBookingCheckout = action({
  args: {
    clubSlug: v.string(),
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    bookingCode: v.string(),
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
  }),
  handler: async (ctx, args): Promise<CheckoutActionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Debes iniciar sesion.");

    const preparation = (await ctx.runMutation(
      internal.payments._createOnlineBookingForCheckout,
      {
        ...args,
        playerUserId: userId as Id<"users">,
      },
    )) as CheckoutPreparation;

    return await createPreferenceAndAttach(ctx, preparation);
  },
});

export const createManualBookingPaymentLink = action({
  args: {
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    source: sourceValidator,
    internalNote: v.optional(v.string()),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    bookingCode: v.string(),
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
  }),
  handler: async (ctx, args): Promise<CheckoutActionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Debes iniciar sesion.");

    const preparation = (await ctx.runMutation(
      internal.payments._createManualBookingForPaymentLink,
      {
        ...args,
        createdByUserId: userId as Id<"users">,
      },
    )) as CheckoutPreparation;

    return await createPreferenceAndAttach(ctx, preparation);
  },
});

export const retryBookingPayment = action({
  args: { bookingId: v.id("bookings") },
  returns: v.object({
    checkoutUrl: v.string(),
    bookingCode: v.string(),
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
  }),
  handler: async (ctx, args): Promise<CheckoutActionResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Debes iniciar sesion.");

    const preparation = (await ctx.runMutation(
      internal.payments._prepareRetryBookingPayment,
      {
        bookingId: args.bookingId,
        userId: userId as Id<"users">,
      },
    )) as CheckoutPreparation;

    return await createPreferenceAndAttach(ctx, preparation);
  },
});

export const processMercadoPagoWebhook = action({
  args: {
    query: v.any(),
    payload: v.any(),
  },
  returns: v.object({ processed: v.boolean() }),
  handler: async (ctx, args) => {
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

    const connection = await ctx.runQuery(
      internal.payments._getConnectionForWebhook,
      {
        clubId: query.clubId as Id<"clubs"> | undefined,
        collectorId: stringFromPayload(args.payload, "user_id"),
      },
    );

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
  },
});

export const refreshMercadoPagoConnection = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Debes iniciar sesion.");
    const { club } = await ctx.runQuery(internal.payments._getUserFirstClub, {
      userId: userId as Id<"users">,
    });
    await ctx.runAction(internal.payments.refreshMercadoPagoConnectionInternal, {
      clubId: club._id,
    });
    return null;
  },
});

export const listClubPayments = query({
  args: {},
  returns: v.array(paymentSafeValidator),
  handler: async (ctx) => {
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .collect();

    return payments.sort((a, b) => b.createdAt - a.createdAt).map(safePayment);
  },
});

export const getBookingPaymentDetails = query({
  args: { bookingId: v.id("bookings") },
  returns: v.union(paymentSafeValidator, v.null()),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    await requireClubAccess(ctx, booking.clubId, ["club_master", "club_staff"]);
    const payment = await getLatestPaymentForBooking(ctx, args.bookingId);
    return payment ? safePayment(payment) : null;
  },
});

export const getPaymentByBooking = query({
  args: { bookingId: v.id("bookings") },
  returns: v.union(paymentSafeValidator, v.null()),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new ConvexError("Debes iniciar sesion.");
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    if (booking.playerUserId !== authUserId) {
      await requireClubAccessForUser(
        ctx,
        authUserId as Id<"users">,
        booking.clubId,
        ["club_master", "club_staff"],
      );
    }

    const payment = await getLatestPaymentForBooking(ctx, args.bookingId);
    return payment ? safePayment(payment) : null;
  },
});

export const _getPendingOAuthState = internalQuery({
  args: { state: v.string(), now: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("mercadoPagoOAuthStates"),
      clubId: v.id("clubs"),
      userId: v.id("users"),
    }),
  ),
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("mercadoPagoOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();

    if (!state || state.status !== "pending") return null;
    if (state.expiresAt < args.now) {
      return null;
    }

    return {
      _id: state._id,
      clubId: state.clubId,
      userId: state.userId,
    };
  },
});

export const _completeOAuthConnection = internalMutation({
  args: {
    oauthStateId: v.id("mercadoPagoOAuthStates"),
    clubId: v.id("clubs"),
    userId: v.id("users"),
    collectorId: v.string(),
    publicKey: v.optional(v.string()),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.string(),
    accessTokenExpiresAt: v.number(),
    liveMode: v.boolean(),
    scope: v.optional(v.string()),
    environment: paymentProviderEnvironmentValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .unique();

    const connection = {
      clubId: args.clubId,
      status: "connected" as const,
      environment: args.environment,
      collectorId: args.collectorId,
      publicKey: args.publicKey,
      accessTokenEncrypted: args.accessTokenEncrypted,
      refreshTokenEncrypted: args.refreshTokenEncrypted,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      liveMode: args.liveMode,
      scope: args.scope,
      connectedByUserId: args.userId,
      connectedAt: now,
      disconnectedAt: undefined,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, connection);
    } else {
      await ctx.db.insert("mercadoPagoConnections", {
        ...connection,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.oauthStateId, {
      status: "used",
      usedAt: now,
    });
    await ctx.db.patch(args.clubId, {
      mercadoPagoConnectionStatus: "connected",
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      clubId: args.clubId,
      userId: args.userId,
      action: "mercadopago.connected",
      entityType: "mercadoPagoConnection",
      metadata: { collectorId: args.collectorId, environment: args.environment },
      createdAt: now,
    });

    return null;
  },
});

export const _createOnlineBookingForCheckout = internalMutation({
  args: {
    clubSlug: v.string(),
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    playerUserId: v.id("users"),
  },
  returns: checkoutPreparationValidator,
  handler: async (ctx, args) => {
    const club = await getClubOrThrow(ctx, args.clubSlug, {
      requirePublished: true,
      requireBookingEnabled: true,
    });
    const connection = await getActiveConnection(ctx, club._id);

    if (!(club.onlinePaymentsEnabled ?? false)) {
      throw new ConvexError({
        code: "ONLINE_PAYMENTS_DISABLED",
        message: "Este club aun no tiene pagos online activos.",
      });
    }

    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });
    const user = await ctx.db.get(args.playerUserId);
    const now = Date.now();
    const value = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
    const expiresAt = paymentHoldExpiresAt(club, now);
    const code = await buildBookingCode(ctx, now);
    const customerEmail = args.customerEmail?.trim() || user?.email;
    const customerId = await upsertCustomer(ctx, {
      clubId: club._id,
      fullName: args.customerName,
      phone: args.customerPhone,
      email: customerEmail,
      userId: args.playerUserId,
      source: "online",
    });
    const bookingId = await ctx.db.insert("bookings", {
      clubId: club._id,
      courtId: court._id,
      customerId,
      playerUserId: args.playerUserId,
      createdByUserId: args.playerUserId,
      createdByRole: "player",
      code,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
      endMinutes: args.startMinutes + args.durationMinutes,
      timezone: BOGOTA_TIMEZONE,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone.trim(),
      customerEmail: customerEmail?.trim() || undefined,
      source: "online",
      paymentMethod: "mercadopago",
      paymentStatus: "pending",
      bookingStatus: "payment_pending",
      paymentProvider: "mercadopago",
      paymentExpiresAt: expiresAt,
      value,
      createdAt: now,
      updatedAt: now,
    });
    const paymentId = await ctx.db.insert("payments", {
      clubId: club._id,
      bookingId,
      customerId,
      playerUserId: args.playerUserId,
      provider: "mercadopago",
      providerEnvironment: getMercadoPagoEnvironment(),
      providerCollectorId: connection.collectorId,
      externalReference: `booking:${bookingId}`,
      amount: value,
      currency: "COP",
      status: "created",
      expiresAt,
      createdByUserId: args.playerUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(bookingId, { paymentId });

    return {
      clubId: club._id,
      clubSlug: club.slug,
      clubName: club.name,
      courtId: court._id,
      courtName: court.name,
      bookingId,
      bookingCode: code,
      paymentId,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone.trim(),
      customerEmail: customerEmail?.trim() || undefined,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
      amount: value,
      expiresAt,
      accessTokenEncrypted: connection.accessTokenEncrypted,
      refreshTokenEncrypted: connection.refreshTokenEncrypted,
      accessTokenExpiresAt: connection.accessTokenExpiresAt,
      allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
    };
  },
});

export const _createManualBookingForPaymentLink = internalMutation({
  args: {
    courtId: v.id("courts"),
    localDate: v.string(),
    startMinutes: v.number(),
    durationMinutes: v.number(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    source: sourceValidator,
    internalNote: v.optional(v.string()),
    createdByUserId: v.id("users"),
  },
  returns: checkoutPreparationValidator,
  handler: async (ctx, args) => {
    if (args.source === "online") {
      throw new ConvexError({
        code: "INVALID_SOURCE",
        message: "Las reservas manuales no pueden tener origen online.",
      });
    }

    const clubUser = await ctx.db
      .query("clubUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.createdByUserId))
      .collect();
    const activeClubUser = clubUser.find((entry) => entry.status === "active");
    if (!activeClubUser) {
      throw new ConvexError("No tienes acceso a ningun club.");
    }

    const club = await ctx.db.get(activeClubUser.clubId);
    if (!club || !club.isActive) {
      throw new ConvexError("No tienes acceso a ningun club.");
    }

    await requireClubAccessForUser(ctx, args.createdByUserId, club._id, [
      "club_master",
      "club_staff",
    ]);

    if (!(club.onlinePaymentsEnabled ?? false)) {
      throw new ConvexError({
        code: "ONLINE_PAYMENTS_DISABLED",
        message: "Activa pagos online antes de generar links de pago.",
      });
    }

    const connection = await getActiveConnection(ctx, club._id);
    const court = await getCourtOrThrow(ctx, args.courtId);
    await assertCanBook({ ctx, club, court, ...args });
    const now = Date.now();
    const value = calculateBookingValue(
      args.localDate,
      args.startMinutes,
      args.durationMinutes,
      club.pricing,
    );
    const expiresAt = paymentHoldExpiresAt(club, now);
    const code = await buildBookingCode(ctx, now);
    const customerId = await upsertCustomer(ctx, {
      clubId: club._id,
      fullName: args.customerName,
      phone: args.customerPhone,
      email: args.customerEmail,
      source: args.source,
    });
    const bookingId = await ctx.db.insert("bookings", {
      clubId: club._id,
      courtId: court._id,
      customerId,
      createdByUserId: args.createdByUserId,
      createdByRole: activeClubUser.role,
      code,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
      endMinutes: args.startMinutes + args.durationMinutes,
      timezone: BOGOTA_TIMEZONE,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone.trim(),
      customerEmail: args.customerEmail?.trim() || undefined,
      source: args.source,
      paymentMethod: "mercadopago",
      paymentStatus: "pending",
      bookingStatus: "confirmed",
      paymentProvider: "mercadopago",
      paymentExpiresAt: expiresAt,
      value,
      internalNote: args.internalNote?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    const paymentId = await ctx.db.insert("payments", {
      clubId: club._id,
      bookingId,
      customerId,
      provider: "mercadopago",
      providerEnvironment: getMercadoPagoEnvironment(),
      providerCollectorId: connection.collectorId,
      externalReference: `booking:${bookingId}`,
      amount: value,
      currency: "COP",
      status: "created",
      expiresAt,
      createdByUserId: args.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(bookingId, { paymentId });
    await ctx.db.insert("auditLogs", {
      clubId: club._id,
      userId: args.createdByUserId,
      action: "payment_link.created",
      entityType: "booking",
      entityId: bookingId,
      createdAt: now,
    });

    return {
      clubId: club._id,
      clubSlug: club.slug,
      clubName: club.name,
      courtId: court._id,
      courtName: court.name,
      bookingId,
      bookingCode: code,
      paymentId,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone.trim(),
      customerEmail: args.customerEmail?.trim() || undefined,
      localDate: args.localDate,
      startMinutes: args.startMinutes,
      durationMinutes: args.durationMinutes,
      amount: value,
      expiresAt,
      accessTokenEncrypted: connection.accessTokenEncrypted,
      refreshTokenEncrypted: connection.refreshTokenEncrypted,
      accessTokenExpiresAt: connection.accessTokenExpiresAt,
      allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
    };
  },
});

export const _prepareRetryBookingPayment = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    userId: v.id("users"),
  },
  returns: checkoutPreparationValidator,
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la reserva.",
      });
    }
    if (booking.bookingStatus === "cancelled") {
      throw new ConvexError({
        code: "BOOKING_CANCELLED",
        message: "Esta reserva esta cancelada.",
      });
    }

    if (booking.playerUserId !== args.userId) {
      await requireClubAccessForUser(ctx, args.userId, booking.clubId, [
        "club_master",
        "club_staff",
      ]);
    }

    const [club, court] = await Promise.all([
      ctx.db.get(booking.clubId),
      ctx.db.get(booking.courtId),
    ]);
    if (!club || !court) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la reserva.",
      });
    }

    if (booking.bookingStatus === "expired") {
      await assertCanBook({
        ctx,
        club,
        court,
        localDate: booking.localDate,
        startMinutes: booking.startMinutes,
        durationMinutes: booking.durationMinutes,
      });
    }

    const connection = await getActiveConnection(ctx, club._id);
    const now = Date.now();
    const expiresAt = paymentHoldExpiresAt(club, now);
    const paymentId = await ctx.db.insert("payments", {
      clubId: club._id,
      bookingId: booking._id,
      customerId: booking.customerId,
      playerUserId: booking.playerUserId,
      provider: "mercadopago",
      providerEnvironment: getMercadoPagoEnvironment(),
      providerCollectorId: connection.collectorId,
      externalReference: `booking:${booking._id}`,
      amount: booking.value,
      currency: "COP",
      status: "created",
      expiresAt,
      createdByUserId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(booking._id, {
      paymentId,
      paymentProvider: "mercadopago",
      paymentMethod: "mercadopago",
      paymentStatus: "pending",
      bookingStatus:
        booking.source === "online" ? "payment_pending" : booking.bookingStatus,
      paymentExpiresAt: expiresAt,
      expiredAt: undefined,
      updatedAt: now,
    });

    return {
      clubId: club._id,
      clubSlug: club.slug,
      clubName: club.name,
      courtId: court._id,
      courtName: court.name,
      bookingId: booking._id,
      bookingCode: booking.code,
      paymentId,
      customerName: booking.customerName ?? "",
      customerPhone: booking.customerPhone ?? "",
      customerEmail: booking.customerEmail,
      localDate: booking.localDate,
      startMinutes: booking.startMinutes,
      durationMinutes: booking.durationMinutes,
      amount: booking.value,
      expiresAt,
      accessTokenEncrypted: connection.accessTokenEncrypted,
      refreshTokenEncrypted: connection.refreshTokenEncrypted,
      accessTokenExpiresAt: connection.accessTokenExpiresAt,
      allowOfflineMethods: club.allowOfflineMercadoPagoMethods ?? false,
    };
  },
});

export const _attachPreferenceToPayment = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
    providerPreferenceId: v.string(),
    checkoutUrl: v.string(),
    sandboxCheckoutUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      providerPreferenceId: args.providerPreferenceId,
      checkoutUrl: args.checkoutUrl,
      sandboxCheckoutUrl: args.sandboxCheckoutUrl,
      status: "pending",
      updatedAt: now,
    });
    await ctx.db.patch(args.bookingId, {
      paymentCheckoutUrl: args.checkoutUrl,
      updatedAt: now,
    });
    return null;
  },
});

export const _markPreferenceCreationFailed = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const booking = await ctx.db.get(args.bookingId);
    await ctx.db.patch(args.paymentId, {
      status: "error",
      statusDetail: args.message.slice(0, 300),
      failedAt: now,
      updatedAt: now,
    });
    if (booking?.bookingStatus === "payment_pending") {
      await ctx.db.patch(args.bookingId, {
        bookingStatus: "expired",
        paymentStatus: "failed",
        expiredAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const _getConnectionForWebhook = internalQuery({
  args: {
    clubId: v.optional(v.id("clubs")),
    collectorId: v.optional(v.string()),
  },
  returns: v.union(connectionSecretValidator, v.null()),
  handler: async (ctx, args) => {
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
  },
});

export const _recordWebhookEventStart = internalMutation({
  args: {
    eventId: v.string(),
    clubId: v.optional(v.id("clubs")),
    providerPaymentId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    action: v.optional(v.string()),
    rawPayload: v.any(),
  },
  returns: v.object({
    eventId: v.string(),
    shouldProcess: v.boolean(),
  }),
  handler: async (ctx, args) => {
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
  },
});

export const _markWebhookEventProcessed = internalMutation({
  args: { eventId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
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
  },
});

export const _applyWebhookPaymentStatus = internalMutation({
  args: {
    eventId: v.string(),
    clubId: v.id("clubs"),
    providerPaymentId: v.string(),
    providerPreferenceId: v.optional(v.string()),
    providerMerchantOrderId: v.optional(v.string()),
    providerCollectorId: v.optional(v.string()),
    externalReference: v.optional(v.string()),
    status: providerPaymentStatusValidator,
    statusDetail: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    paymentType: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    rawLastWebhookEvent: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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
    const bookingPatch: Partial<Doc<"bookings">> = {
      updatedAt: now,
    };

    if (args.status === "approved") {
      paymentPatch.paidAt = args.paidAt ?? now;
      bookingPatch.paymentStatus = "paid";
      bookingPatch.bookingStatus = "confirmed";
      bookingPatch.paidAt = args.paidAt ?? now;
    } else if (args.status === "pending" || args.status === "in_process") {
      bookingPatch.paymentStatus = "pending";
      if (booking.source === "online") {
        bookingPatch.bookingStatus = "payment_pending";
      }
    } else if (args.status === "rejected" || args.status === "cancelled") {
      paymentPatch.failedAt = now;
      bookingPatch.paymentStatus = "failed";
      bookingPatch.bookingStatus = "expired";
      bookingPatch.expiredAt = now;
    } else if (args.status === "refunded") {
      paymentPatch.refundedAt = now;
      bookingPatch.paymentStatus = "refunded";
    } else if (args.status === "charged_back") {
      paymentPatch.failedAt = now;
      bookingPatch.paymentStatus = "failed";
    } else if (args.status === "expired" || args.status === "error") {
      paymentPatch.failedAt = now;
      bookingPatch.paymentStatus =
        args.status === "expired" ? "expired" : "failed";
      if (booking.bookingStatus === "payment_pending") {
        bookingPatch.bookingStatus = "expired";
        bookingPatch.expiredAt = now;
      }
    }

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
  },
});

export const _storeRefreshedConnection = internalMutation({
  args: {
    clubId: v.id("clubs"),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.string(),
    accessTokenExpiresAt: v.number(),
    publicKey: v.optional(v.string()),
    liveMode: v.boolean(),
    scope: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await getActiveConnection(ctx, args.clubId);
    await ctx.db.patch(connection._id, {
      accessTokenEncrypted: args.accessTokenEncrypted,
      refreshTokenEncrypted: args.refreshTokenEncrypted,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      publicKey: args.publicKey ?? connection.publicKey,
      liveMode: args.liveMode,
      scope: args.scope ?? connection.scope,
      lastRefreshAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const refreshMercadoPagoConnectionInternal = internalAction({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.payments._getConnectionForWebhook,
      { clubId: args.clubId },
    );
    if (!connection) return null;

    try {
      await getSellerAccessToken(ctx, connection);
    } catch {
      await ctx.runMutation(internal.payments._markConnectionExpired, {
        clubId: args.clubId,
      });
    }

    return null;
  },
});

export const _markConnectionExpired = internalMutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .unique();
    const now = Date.now();

    if (connection) {
      await ctx.db.patch(connection._id, {
        status: "expired",
        updatedAt: now,
      });
    }
    await ctx.db.patch(args.clubId, {
      mercadoPagoConnectionStatus: "expired",
      onlinePaymentsEnabled: false,
      updatedAt: now,
    });
    return null;
  },
});

export const _listConnectionsNeedingRefresh = internalQuery({
  args: { before: v.number() },
  returns: v.array(v.id("clubs")),
  handler: async (ctx, args) => {
    const connections = await ctx.db.query("mercadoPagoConnections").collect();

    return connections
      .filter(
        (connection) =>
          connection.status === "connected" &&
          connection.accessTokenExpiresAt !== undefined &&
          connection.accessTokenExpiresAt < args.before,
      )
      .map((connection) => connection.clubId);
  },
});

export const refreshMercadoPagoTokensCron = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const clubIds = await ctx.runQuery(
      internal.payments._listConnectionsNeedingRefresh,
      { before: Date.now() + TOKEN_REFRESH_WINDOW_MS },
    );

    for (const clubId of clubIds) {
      await ctx.runAction(internal.payments.refreshMercadoPagoConnectionInternal, {
        clubId,
      });
    }

    return null;
  },
});

export const expirePendingPaymentBookings = internalMutation({
  args: {},
  returns: v.object({ expired: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    const pendingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_payment_status", (q) => q.eq("paymentStatus", "pending"))
      .collect();
    let expired = 0;

    for (const booking of pendingBookings) {
      if (
        booking.bookingStatus !== "payment_pending" ||
        booking.paymentExpiresAt === undefined ||
        booking.paymentExpiresAt >= now
      ) {
        continue;
      }

      await ctx.db.patch(booking._id, {
        bookingStatus: "expired",
        paymentStatus: "expired",
        expiredAt: now,
        updatedAt: now,
      });

      if (booking.paymentId) {
        await ctx.db.patch(booking.paymentId, {
          status: "expired",
          failedAt: now,
          updatedAt: now,
        });
      }

      expired += 1;
    }

    return { expired };
  },
});

export const _getUserFirstClub = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    club: v.object({
      _id: v.id("clubs"),
    }),
  }),
  handler: async (ctx, args) => {
    const clubUsers = await ctx.db
      .query("clubUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const activeClubUser = clubUsers.find((entry) => entry.status === "active");

    if (!activeClubUser) {
      throw new ConvexError("No tienes acceso a ningun club.");
    }

    return { club: { _id: activeClubUser.clubId } };
  },
});

export const superAdminGetClubPaymentStatus = query({
  args: { clubId: v.id("clubs") },
  returns: v.object({
    status: v.string(),
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    collectorId: v.optional(v.string()),
    connectedAt: v.optional(v.number()),
    lastRefreshAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el club.",
      });
    }
    const connection = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .unique();

    return {
      status:
        connection?.status ?? club.mercadoPagoConnectionStatus ?? "disconnected",
      onlinePaymentsEnabled: club.onlinePaymentsEnabled ?? false,
      onlinePaymentRequired: club.onlinePaymentRequired ?? false,
      paymentHoldMinutes: paymentHoldMinutes(club),
      collectorId: connection?.collectorId,
      connectedAt: connection?.connectedAt,
      lastRefreshAt: connection?.lastRefreshAt,
    };
  },
});
