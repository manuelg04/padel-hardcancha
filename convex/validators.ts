import { v } from "convex/values";

export const bookingStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("blocked"),
);

export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
);

export const paymentMethodValidator = v.union(
  v.literal("club"),
  v.literal("transfer"),
  v.literal("cash"),
  v.literal("other"),
);

export const sourceValidator = v.union(
  v.literal("online"),
  v.literal("manual"),
  v.literal("whatsapp"),
  v.literal("walk_in"),
  v.literal("phone"),
);

export const platformRoleValidator = v.union(v.literal("super_admin"));

export const clubUserRoleValidator = v.union(
  v.literal("club_master"),
  v.literal("club_staff"),
);

export const userRoleValidator = v.union(
  v.literal("super_admin"),
  v.literal("club_master"),
  v.literal("club_staff"),
  v.literal("player"),
);

export const roleStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

export const membershipBenefitTypeValidator = v.union(
  v.literal("free"),
  v.literal("percentage_discount"),
  v.literal("fixed_price"),
);

export const customerMembershipStatusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("cancelled"),
  v.literal("expired"),
);

export const bookingSettlementStatusValidator = v.union(
  v.literal("draft"),
  v.literal("closed"),
  v.literal("paid"),
  v.literal("cancelled"),
);

export const openingHourValidator = v.object({
  dayOfWeek: v.number(),
  isOpen: v.boolean(),
  openMinutes: v.number(),
  closeMinutes: v.number(),
});

export const pricingValidator = v.object({
  normalPricePerHour: v.number(),
  peakPricePerHour: v.number(),
  weekendPricePerHour: v.number(),
  peakStartMinutes: v.number(),
  peakEndMinutes: v.number(),
});

const clubFields = {
  _id: v.id("clubs"),
  _creationTime: v.number(),
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
};

export const clubValidator = v.object(clubFields);

export const clubWithActiveCourtCountValidator = v.object({
  ...clubFields,
  activeCourtCount: v.number(),
});

export const publicClubCardValidator = v.object({
  _id: v.id("clubs"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  city: v.string(),
  address: v.string(),
  whatsapp: v.string(),
  coverImageUrl: v.string(),
  openingHoursText: v.string(),
  normalPricePerHour: v.number(),
  peakPricePerHour: v.number(),
  weekendPricePerHour: v.number(),
  isFeatured: v.boolean(),
  bookingEnabled: v.boolean(),
  activeCourtCount: v.number(),
});

export const courtValidator = v.object({
  _id: v.id("courts"),
  _creationTime: v.number(),
  clubId: v.id("clubs"),
  name: v.string(),
  description: v.string(),
  courtType: v.string(),
  isCovered: v.boolean(),
  isActive: v.boolean(),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const bookingValidator = v.object({
  _id: v.id("bookings"),
  _creationTime: v.number(),
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
});

export const userPublicValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  image: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

export const clubAccessValidator = v.object({
  clubId: v.id("clubs"),
  clubName: v.string(),
  role: clubUserRoleValidator,
});

export const customerValidator = v.object({
  _id: v.id("customers"),
  _creationTime: v.number(),
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
});

export const membershipPlanValidator = v.object({
  _id: v.id("membershipPlans"),
  _creationTime: v.number(),
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
});

export const customerMembershipValidator = v.object({
  _id: v.id("customerMemberships"),
  _creationTime: v.number(),
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
});

export const settlementMemberChargeValidator = v.object({
  customerId: v.id("customers"),
  customerName: v.string(),
  membershipId: v.id("customerMemberships"),
  membershipPlanId: v.id("membershipPlans"),
  membershipPlanName: v.string(),
  benefitType: membershipBenefitTypeValidator,
  discountPercent: v.optional(v.number()),
  fixedPrice: v.optional(v.number()),
  benefitApplied: v.boolean(),
  benefitNotAppliedReason: v.optional(v.literal("outside_schedule")),
  baseShareValue: v.number(),
  chargedValue: v.number(),
  discountValue: v.number(),
});

export const bookingSettlementValidator = v.object({
  _id: v.id("bookingSettlements"),
  _creationTime: v.number(),
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
});

export const bookingSettlementPreviewValidator = v.object({
  bookingId: v.id("bookings"),
  clubId: v.id("clubs"),
  courtId: v.id("courts"),
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
});
