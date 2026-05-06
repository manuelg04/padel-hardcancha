import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

import {
  bookingSettlementStatusValidator,
  bookingStatusValidator,
  academyAttendancePaymentStatusValidator,
  academyAttendanceStatusValidator,
  academyClassTypeValidator,
  academyPackageStatusValidator,
  academyProfessorStatusValidator,
  academySessionStatusValidator,
  clubUserRoleValidator,
  customerMembershipStatusValidator,
  depositModeValidator,
  depositStatusValidator,
  depositTypeValidator,
  financialSnapshotStatusValidator,
  mercadoPagoConnectionStatusValidator,
  mercadoPagoConnectionSourceValidator,
  mercadoPagoOAuthStateStatusValidator,
  membershipBenefitTypeValidator,
  openingHourValidator,
  paymentOptionSelectedValidator,
  paymentMethodValidator,
  paymentProviderEnvironmentValidator,
  paymentStatusValidator,
  platformRoleValidator,
  providerPaymentStatusValidator,
  pricingValidator,
  reservationPaymentProviderValidator,
  reservationPaymentStatusValidator,
  reservationPaymentTypeValidator,
  roleStatusValidator,
  settlementMemberChargeValidator,
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
    allowOfflineMercadoPagoMethods: v.optional(v.boolean()),
    onlineDepositsEnabled: v.optional(v.boolean()),
    depositMode: v.optional(depositModeValidator),
    depositType: v.optional(depositTypeValidator),
    depositPercentage: v.optional(v.number()),
    depositFixedAmount: v.optional(v.union(v.number(), v.null())),
    depositMinAmount: v.optional(v.number()),
    depositMaxAmount: v.optional(v.number()),
    depositRoundingAmount: v.optional(v.number()),
    depositApplyAfterMembershipDiscounts: v.optional(v.boolean()),
    allowPayAtClub: v.optional(v.boolean()),
    mercadoPagoConnectionStatus: v.optional(mercadoPagoConnectionStatusValidator),
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

  membershipPlans: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),
    description: v.optional(v.string()),
    monthlyPrice: v.optional(v.number()),
    benefitType: membershipBenefitTypeValidator,
    discountPercent: v.optional(v.number()),
    fixedPrice: v.optional(v.number()),
    waivesDeposit: v.optional(v.boolean()),
    appliesAlways: v.boolean(),
    validDaysOfWeek: v.optional(v.array(v.number())),
    validStartTime: v.optional(v.string()),
    validEndTime: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_club_active", ["clubId", "isActive"]),

  customerMemberships: defineTable({
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
    userId: v.optional(v.id("users")),
    membershipPlanId: v.id("membershipPlans"),
    status: customerMembershipStatusValidator,
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_club", ["clubId"])
    .index("by_customer_club", ["customerId", "clubId"])
    .index("by_club_status", ["clubId", "status"])
    .index("by_plan", ["membershipPlanId"]),

  bookingSettlements: defineTable({
    bookingId: v.id("bookings"),
    clubId: v.id("clubs"),
    courtId: v.id("courts"),
    createdByUserId: v.id("users"),
    updatedByUserId: v.optional(v.id("users")),
    status: bookingSettlementStatusValidator,
    baseBookingValue: v.number(),
    baseShareValue: v.number(),
    playerSlots: v.number(),
    memberCount: v.number(),
    nonMemberCount: v.number(),
    memberCharges: v.array(settlementMemberChargeValidator),
    nonMemberUnitValue: v.number(),
    nonMemberTotalValue: v.number(),
    calculatedTotalCollectedValue: v.number(),
    manualAdjustmentAmount: v.number(),
    manualAdjustmentReason: v.optional(v.string()),
    finalTotalCollectedValue: v.number(),
    discountAbsorbedByClubValue: v.number(),
    ruleSnapshot: v.array(v.string()),
    paidAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_booking", ["bookingId"])
    .index("by_club", ["clubId"])
    .index("by_club_status", ["clubId", "status"]),

  academyProfessors: defineTable({
    clubId: v.id("clubs"),
    userId: v.optional(v.id("users")),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: academyProfessorStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_club_status", ["clubId", "status"])
    .index("by_user", ["userId"]),

  academyPackagePlans: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),
    classesCount: v.number(),
    price: v.number(),
    validityDays: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_club_active", ["clubId", "active"]),

  academyPackagePurchases: defineTable({
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
    packagePlanId: v.optional(v.id("academyPackagePlans")),
    name: v.string(),
    totalClasses: v.number(),
    usedClasses: v.number(),
    amountPaid: v.number(),
    purchasedAt: v.number(),
    expiresAt: v.optional(v.number()),
    status: academyPackageStatusValidator,
    paymentId: v.optional(v.id("payments")),
    createdByUserId: v.id("users"),
    updatedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_club", ["clubId"])
    .index("by_customer_club", ["customerId", "clubId"])
    .index("by_club_status", ["clubId", "status"])
    .index("by_customer_club_status", ["customerId", "clubId", "status"]),

  academyClassSessions: defineTable({
    clubId: v.id("clubs"),
    professorId: v.id("academyProfessors"),
    localDate: v.string(),
    startTime: v.string(),
    endTime: v.optional(v.string()),
    classType: academyClassTypeValidator,
    notes: v.optional(v.string()),
    status: academySessionStatusValidator,
    createdByUserId: v.id("users"),
    updatedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_club", ["clubId"])
    .index("by_club_date", ["clubId", "localDate"])
    .index("by_club_professor", ["clubId", "professorId"])
    .index("by_club_status", ["clubId", "status"])
    .index("by_club_date_professor", ["clubId", "localDate", "professorId"])
    .index("by_club_date_status", ["clubId", "localDate", "status"]),

  academyClassAttendances: defineTable({
    clubId: v.id("clubs"),
    classSessionId: v.id("academyClassSessions"),
    customerId: v.id("customers"),
    paymentType: v.union(v.literal("single"), v.literal("package")),
    singleClassPrice: v.optional(v.number()),
    packagePurchaseId: v.optional(v.id("academyPackagePurchases")),
    paymentId: v.optional(v.id("payments")),
    paymentStatus: academyAttendancePaymentStatusValidator,
    studentConfirmedAt: v.optional(v.number()),
    studentConfirmedByUserId: v.optional(v.id("users")),
    professorValidatedAt: v.optional(v.number()),
    professorValidatedByUserId: v.optional(v.id("users")),
    packageConsumedAt: v.optional(v.number()),
    packageConsumptionRevertedAt: v.optional(v.number()),
    status: academyAttendanceStatusValidator,
    notes: v.optional(v.string()),
    createdByUserId: v.id("users"),
    updatedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_club", ["clubId"])
    .index("by_session", ["classSessionId"])
    .index("by_club_session", ["clubId", "classSessionId"])
    .index("by_club_customer", ["clubId", "customerId"])
    .index("by_club_status", ["clubId", "status"])
    .index("by_club_customer_status", ["clubId", "customerId", "status"])
    .index("by_club_session_status", ["clubId", "classSessionId", "status"]),

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
    paymentProvider: v.optional(reservationPaymentProviderValidator),
    paymentCheckoutUrl: v.optional(v.string()),
    paymentExpiresAt: v.optional(v.number()),
    value: v.number(),
    basePrice: v.optional(v.number()),
    estimatedMembershipDiscount: v.optional(v.number()),
    estimatedTotal: v.optional(v.number()),
    depositSuggestedAmount: v.optional(v.number()),
    depositPaidAmount: v.optional(v.number()),
    depositStatus: v.optional(depositStatusValidator),
    paymentOptionSelected: v.optional(paymentOptionSelectedValidator),
    estimatedBalanceDue: v.optional(v.number()),
    membershipSnapshot: v.optional(v.any()),
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
    .index("by_deposit_status", ["depositStatus"])
    .index("by_player_user", ["playerUserId"])
    .index("by_created_by", ["createdByUserId"]),

  mercadoPagoConnections: defineTable({
    clubId: v.id("clubs"),
    status: mercadoPagoConnectionStatusValidator,
    connectionSource: v.optional(mercadoPagoConnectionSourceValidator),
    environment: v.optional(paymentProviderEnvironmentValidator),
    collectorId: v.optional(v.string()),
    mpUserId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    accessTokenEncrypted: v.optional(v.string()),
    refreshTokenEncrypted: v.optional(v.string()),
    publicKey: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    liveMode: v.optional(v.boolean()),
    scope: v.optional(v.string()),
    connectedByUserId: v.optional(v.id("users")),
    connectedAt: v.optional(v.number()),
    lastRefreshAt: v.optional(v.number()),
    refreshError: v.optional(v.string()),
    refreshErrorAt: v.optional(v.number()),
    lastValidatedAt: v.optional(v.number()),
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
    redirectAfterSuccess: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_club", ["clubId"]),

  payments: defineTable({
    clubId: v.id("clubs"),
    bookingId: v.id("bookings"),
    customerId: v.optional(v.id("customers")),
    playerUserId: v.optional(v.id("users")),
    provider: reservationPaymentProviderValidator,
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

  reservationPayments: defineTable({
    reservationId: v.id("bookings"),
    clubId: v.id("clubs"),
    userId: v.optional(v.id("users")),
    provider: reservationPaymentProviderValidator,
    type: reservationPaymentTypeValidator,
    status: reservationPaymentStatusValidator,
    amount: v.number(),
    grossAmount: v.optional(v.number()),
    gatewayFeeAmount: v.optional(v.number()),
    taxWithholdingAmount: v.optional(v.number()),
    totalDeductionsAmount: v.optional(v.number()),
    netReceivedAmount: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    paymentMethodId: v.optional(v.string()),
    installments: v.optional(v.number()),
    providerMerchantOrderId: v.optional(v.string()),
    dateApproved: v.optional(v.string()),
    moneyReleaseDate: v.optional(v.string()),
    financialSnapshotStatus: v.optional(financialSnapshotStatusValidator),
    financialSnapshotCapturedAt: v.optional(v.number()),
    financialSnapshotWarning: v.optional(v.string()),
    currency: v.string(),
    mercadoPagoPreferenceId: v.optional(v.string()),
    mercadoPagoPaymentId: v.optional(v.string()),
    mercadoPagoStatus: v.optional(v.string()),
    mercadoPagoStatusDetail: v.optional(v.string()),
    initPoint: v.optional(v.string()),
    sandboxInitPoint: v.optional(v.string()),
    externalReference: v.string(),
    metadata: v.optional(v.any()),
    paidAt: v.optional(v.number()),
    rawProviderResponse: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reservation", ["reservationId"])
    .index("by_club", ["clubId"])
    .index("by_external_reference", ["externalReference"])
    .index("by_provider_payment", ["provider", "mercadoPagoPaymentId"])
    .index("by_preference", ["mercadoPagoPreferenceId"])
    .index("by_status", ["status"]),

  paymentWebhookEvents: defineTable({
    provider: reservationPaymentProviderValidator,
    eventId: v.string(),
    clubId: v.optional(v.id("clubs")),
    paymentId: v.optional(v.id("payments")),
    providerPaymentId: v.optional(v.string()),
    reservationPaymentId: v.optional(v.id("reservationPayments")),
    mercadoPagoPaymentId: v.optional(v.string()),
    eventType: v.optional(v.string()),
    action: v.optional(v.string()),
    rawPayload: v.any(),
    processingWarning: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_provider_event", ["provider", "eventId"])
    .index("by_payment", ["reservationPaymentId"])
    .index("by_mercadopago_payment", ["mercadoPagoPaymentId"]),

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
