import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

import {
  bookingStatusValidator,
  clubUserRoleValidator,
  mercadoPagoConnectionStatusValidator,
  mercadoPagoOAuthStateStatusValidator,
  openingHourValidator,
  paymentMethodValidator,
  paymentProviderEnvironmentValidator,
  paymentProviderValidator,
  paymentStatusValidator,
  platformRoleValidator,
  providerPaymentStatusValidator,
  pricingValidator,
  roleStatusValidator,
  sourceValidator,
  userRoleValidator,
} from "./validators";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  platformRoles: defineTable({
    userId: v.id("users"),
    role: platformRoleValidator,
    status: roleStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  clubUsers: defineTable({
    clubId: v.id("clubs"),
    userId: v.id("users"),
    role: clubUserRoleValidator,
    status: roleStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_club", ["clubId"])
    .index("by_user_club", ["userId", "clubId"]),

  customers: defineTable({
    clubId: v.id("clubs"),
    userId: v.optional(v.id("users")),
    fullName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: sourceValidator,
    status: roleStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_club_phone", ["clubId", "phone"])
    .index("by_user", ["userId"]),

  clubs: defineTable({
    slug: v.string(),
    name: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    address: v.string(),
    phone: v.string(),
    whatsapp: v.string(),
    description: v.string(),
    coverImageUrl: v.string(),
    galleryImageUrls: v.array(v.string()),
    openingHoursText: v.string(),
    timezone: v.string(),
    normalPricePerHour: v.number(),
    peakPricePerHour: v.number(),
    weekendPricePerHour: v.number(),
    peakStartMinutes: v.number(),
    peakEndMinutes: v.number(),
    openingHours: v.array(openingHourValidator),
    pricing: pricingValidator,
    isActive: v.boolean(),
    isPublished: v.boolean(),
    isFeatured: v.boolean(),
    bookingEnabled: v.boolean(),
    onlinePaymentsEnabled: v.optional(v.boolean()),
    onlinePaymentRequired: v.optional(v.boolean()),
    paymentHoldMinutes: v.optional(v.number()),
    mercadoPagoConnectionStatus: v.optional(mercadoPagoConnectionStatusValidator),
    allowOfflineMercadoPagoMethods: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished", "isActive"])
    .index("by_city", ["city"])
    .index("by_active", ["isActive"]),

  courts: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),
    description: v.string(),
    courtType: v.string(),
    isCovered: v.boolean(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_club", ["clubId"]),

  bookings: defineTable({
    clubId: v.id("clubs"),
    courtId: v.id("courts"),
    customerId: v.optional(v.id("customers")),
    playerUserId: v.optional(v.id("users")),
    createdByUserId: v.optional(v.id("users")),
    createdByRole: v.optional(userRoleValidator),
    code: v.string(),
    localDate: v.string(),
    startMinutes: v.number(),
    endMinutes: v.number(),
    durationMinutes: v.number(),
    timezone: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    source: sourceValidator,
    paymentMethod: paymentMethodValidator,
    paymentStatus: paymentStatusValidator,
    bookingStatus: bookingStatusValidator,
    paymentId: v.optional(v.id("payments")),
    paymentProvider: v.optional(paymentProviderValidator),
    paymentCheckoutUrl: v.optional(v.string()),
    paymentExpiresAt: v.optional(v.number()),
    value: v.number(),
    internalNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    expiredAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
  })
    .index("by_club_date", ["clubId", "localDate"])
    .index("by_court_date", ["courtId", "localDate"])
    .index("by_code", ["code"])
    .index("by_club_status", ["clubId", "bookingStatus"])
    .index("by_payment_status", ["paymentStatus"])
    .index("by_payment_expires_at", ["paymentExpiresAt"])
    .index("by_payment", ["paymentId"])
    .index("by_player_user", ["playerUserId"])
    .index("by_created_by", ["createdByUserId"]),

  mercadoPagoConnections: defineTable({
    clubId: v.id("clubs"),
    status: mercadoPagoConnectionStatusValidator,
    environment: paymentProviderEnvironmentValidator,
    collectorId: v.string(),
    publicKey: v.optional(v.string()),
    accessTokenEncrypted: v.string(),
    refreshTokenEncrypted: v.string(),
    accessTokenExpiresAt: v.optional(v.number()),
    liveMode: v.boolean(),
    scope: v.optional(v.string()),
    connectedByUserId: v.optional(v.id("users")),
    connectedAt: v.optional(v.number()),
    lastRefreshAt: v.optional(v.number()),
    disconnectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_collector", ["collectorId"]),

  mercadoPagoOAuthStates: defineTable({
    clubId: v.id("clubs"),
    userId: v.id("users"),
    state: v.string(),
    status: mercadoPagoOAuthStateStatusValidator,
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_club", ["clubId"]),

  payments: defineTable({
    clubId: v.id("clubs"),
    bookingId: v.id("bookings"),
    customerId: v.optional(v.id("customers")),
    playerUserId: v.optional(v.id("users")),
    provider: paymentProviderValidator,
    providerEnvironment: paymentProviderEnvironmentValidator,
    providerPreferenceId: v.optional(v.string()),
    providerPaymentId: v.optional(v.string()),
    providerMerchantOrderId: v.optional(v.string()),
    providerCollectorId: v.optional(v.string()),
    externalReference: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: providerPaymentStatusValidator,
    statusDetail: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    sandboxCheckoutUrl: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    paymentType: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    refundedAt: v.optional(v.number()),
    rawLastWebhookEvent: v.optional(v.any()),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_booking", ["bookingId"])
    .index("by_club", ["clubId"])
    .index("by_provider_payment", ["provider", "providerPaymentId"])
    .index("by_preference", ["providerPreferenceId"])
    .index("by_external_reference", ["externalReference"])
    .index("by_status", ["status"]),

  paymentWebhookEvents: defineTable({
    provider: paymentProviderValidator,
    eventId: v.string(),
    clubId: v.optional(v.id("clubs")),
    paymentId: v.optional(v.id("payments")),
    providerPaymentId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    action: v.optional(v.string()),
    rawPayload: v.any(),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_provider_event", ["provider", "eventId"]),

  auditLogs: defineTable({
    clubId: v.optional(v.id("clubs")),
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_user", ["userId"]),
});
