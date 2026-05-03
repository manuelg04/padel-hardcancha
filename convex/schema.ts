import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

import {
  bookingSettlementStatusValidator,
  bookingStatusValidator,
  clubUserRoleValidator,
  customerMembershipStatusValidator,
  membershipBenefitTypeValidator,
  openingHourValidator,
  paymentMethodValidator,
  paymentStatusValidator,
  platformRoleValidator,
  pricingValidator,
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
    value: v.number(),
    internalNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
  })
    .index("by_club_date", ["clubId", "localDate"])
    .index("by_court_date", ["courtId", "localDate"])
    .index("by_code", ["code"])
    .index("by_club_status", ["clubId", "bookingStatus"])
    .index("by_player_user", ["playerUserId"])
    .index("by_created_by", ["createdByUserId"]),
});
