import { v } from "convex/values";

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  attachPreferenceToPaymentHandler,
  createManualBookingForPaymentLinkHandler,
  createManualBookingPaymentLinkHandler,
  createOnlineBookingCheckoutHandler,
  createOnlineBookingForCheckoutHandler,
  markPreferenceCreationFailedHandler,
  prepareRetryBookingPaymentHandler,
  retryBookingPaymentHandler,
} from "./payments/checkout";
import {
  getUserFirstClubHandler,
  listConnectionsNeedingRefreshHandler,
  markConnectionExpiredHandler,
  refreshMercadoPagoConnectionHandler,
  refreshMercadoPagoConnectionInternalHandler,
  refreshMercadoPagoTokensCronHandler,
  storeRefreshedConnectionHandler,
} from "./payments/connections";
import { expirePendingPaymentBookingsHandler } from "./payments/expiry";
import {
  completeMercadoPagoOAuthHandler,
  completeOAuthConnectionHandler,
  disconnectMercadoPagoHandler,
  getClubMercadoPagoPublicStatusHandler,
  getClubMercadoPagoStatusHandler,
  getPendingOAuthStateHandler,
  startMercadoPagoOAuthHandler,
  superAdminGetClubPaymentStatusHandler,
  updateClubPaymentSettingsHandler,
} from "./payments/oauth";
import {
  getBookingPaymentDetailsHandler,
  getPaymentByBookingHandler,
  listClubPaymentsHandler,
} from "./payments/readModels";
import {
  applyWebhookPaymentStatusHandler,
  getConnectionForWebhookHandler,
  markWebhookEventProcessedHandler,
  processMercadoPagoWebhookHandler,
  recordWebhookEventStartHandler,
} from "./payments/webhooks";
import {
  checkoutPreparationValidator,
  connectionSecretValidator,
} from "./payments/types";
import {
  paymentProviderEnvironmentValidator,
  paymentSafeValidator,
  providerPaymentStatusValidator,
  sourceValidator,
} from "./validators";

const checkoutActionResultValidator = v.object({
  checkoutUrl: v.string(),
  bookingCode: v.string(),
  bookingId: v.id("bookings"),
  paymentId: v.id("payments"),
});

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
  handler: getClubMercadoPagoStatusHandler,
});

export const getClubMercadoPagoPublicStatus = query({
  args: { clubSlug: v.string() },
  returns: v.object({
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    connected: v.boolean(),
  }),
  handler: getClubMercadoPagoPublicStatusHandler,
});

export const updateClubPaymentSettings = mutation({
  args: {
    onlinePaymentsEnabled: v.boolean(),
    onlinePaymentRequired: v.boolean(),
    paymentHoldMinutes: v.number(),
    allowOfflineMercadoPagoMethods: v.boolean(),
  },
  returns: v.null(),
  handler: updateClubPaymentSettingsHandler,
});

export const startMercadoPagoOAuth = mutation({
  args: { state: v.string() },
  returns: v.object({ authUrl: v.string() }),
  handler: startMercadoPagoOAuthHandler,
});

export const disconnectMercadoPago = mutation({
  args: {},
  returns: v.null(),
  handler: disconnectMercadoPagoHandler,
});

export const completeMercadoPagoOAuth = action({
  args: { code: v.string(), state: v.string() },
  returns: v.object({ clubId: v.id("clubs") }),
  handler: completeMercadoPagoOAuthHandler,
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
  returns: checkoutActionResultValidator,
  handler: createOnlineBookingCheckoutHandler,
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
  returns: checkoutActionResultValidator,
  handler: createManualBookingPaymentLinkHandler,
});

export const retryBookingPayment = action({
  args: { bookingId: v.id("bookings") },
  returns: checkoutActionResultValidator,
  handler: retryBookingPaymentHandler,
});

export const processMercadoPagoWebhook = action({
  args: {
    query: v.any(),
    payload: v.any(),
  },
  returns: v.object({ processed: v.boolean() }),
  handler: processMercadoPagoWebhookHandler,
});

export const refreshMercadoPagoConnection = action({
  args: {},
  returns: v.null(),
  handler: refreshMercadoPagoConnectionHandler,
});

export const listClubPayments = query({
  args: {},
  returns: v.array(paymentSafeValidator),
  handler: listClubPaymentsHandler,
});

export const getBookingPaymentDetails = query({
  args: { bookingId: v.id("bookings") },
  returns: v.union(paymentSafeValidator, v.null()),
  handler: getBookingPaymentDetailsHandler,
});

export const getPaymentByBooking = query({
  args: { bookingId: v.id("bookings") },
  returns: v.union(paymentSafeValidator, v.null()),
  handler: getPaymentByBookingHandler,
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
  handler: getPendingOAuthStateHandler,
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
  handler: completeOAuthConnectionHandler,
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
  handler: createOnlineBookingForCheckoutHandler,
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
  handler: createManualBookingForPaymentLinkHandler,
});

export const _prepareRetryBookingPayment = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    userId: v.id("users"),
  },
  returns: checkoutPreparationValidator,
  handler: prepareRetryBookingPaymentHandler,
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
  handler: attachPreferenceToPaymentHandler,
});

export const _markPreferenceCreationFailed = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    paymentId: v.id("payments"),
    message: v.string(),
  },
  returns: v.null(),
  handler: markPreferenceCreationFailedHandler,
});

export const _getConnectionForWebhook = internalQuery({
  args: {
    clubId: v.optional(v.id("clubs")),
    collectorId: v.optional(v.string()),
  },
  returns: v.union(connectionSecretValidator, v.null()),
  handler: getConnectionForWebhookHandler,
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
  handler: recordWebhookEventStartHandler,
});

export const _markWebhookEventProcessed = internalMutation({
  args: { eventId: v.string() },
  returns: v.null(),
  handler: markWebhookEventProcessedHandler,
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
  handler: applyWebhookPaymentStatusHandler,
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
  handler: storeRefreshedConnectionHandler,
});

export const refreshMercadoPagoConnectionInternal = internalAction({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: refreshMercadoPagoConnectionInternalHandler,
});

export const _markConnectionExpired = internalMutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: markConnectionExpiredHandler,
});

export const _listConnectionsNeedingRefresh = internalQuery({
  args: { before: v.number() },
  returns: v.array(v.id("clubs")),
  handler: listConnectionsNeedingRefreshHandler,
});

export const refreshMercadoPagoTokensCron = internalAction({
  args: {},
  returns: v.null(),
  handler: refreshMercadoPagoTokensCronHandler,
});

export const expirePendingPaymentBookings = internalMutation({
  args: {},
  returns: v.object({ expired: v.number() }),
  handler: expirePendingPaymentBookingsHandler,
});

export const _getUserFirstClub = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    club: v.object({
      _id: v.id("clubs"),
    }),
  }),
  handler: getUserFirstClubHandler,
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
  handler: superAdminGetClubPaymentStatusHandler,
});
