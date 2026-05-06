import { v } from "convex/values";

export const bookingStatusValidator = v.union(
  v.literal("payment_pending"),
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("blocked"),
);

export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
  v.literal("refunded"),
  v.literal("no_payment_required"),
);

export const paymentMethodValidator = v.union(
  v.literal("club"),
  v.literal("transfer"),
  v.literal("mercadopago"),
  v.literal("cash"),
  v.literal("other"),
);

export const depositModeValidator = v.union(v.literal("optional"));

export const depositTypeValidator = v.union(
  v.literal("percentage"),
  v.literal("fixed"),
);

export const depositStatusValidator = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded"),
);

export const paymentOptionSelectedValidator = v.union(
  v.literal("pay_at_club"),
  v.literal("deposit_online"),
  v.literal("full_payment_online"),
);

export const reservationPaymentProviderValidator = v.union(
  v.literal("mercadopago"),
);

export const paymentProviderEnvironmentValidator = v.union(
  v.literal("sandbox"),
  v.literal("production"),
);

export const reservationPaymentTypeValidator = v.union(
  v.literal("deposit"),
  v.literal("full_payment"),
);

export const reservationPaymentStatusValidator = v.union(
  v.literal("created"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("cancelled"),
  v.literal("refunded"),
  v.literal("failed"),
  v.literal("superseded"),
);

export const mercadoPagoConnectionStatusValidator = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("expired"),
  v.literal("error"),
);

export const mercadoPagoConnectionSourceValidator = v.union(
  v.literal("manual"),
  v.literal("oauth"),
);

export const mercadoPagoOAuthStateStatusValidator = v.union(
  v.literal("pending"),
  v.literal("used"),
  v.literal("expired"),
  v.literal("cancelled"),
);

export const providerPaymentStatusValidator = v.union(
  v.literal("created"),
  v.literal("pending"),
  v.literal("approved"),
  v.literal("in_process"),
  v.literal("rejected"),
  v.literal("cancelled"),
  v.literal("expired"),
  v.literal("refunded"),
  v.literal("charged_back"),
  v.literal("error"),
);

export const financialSnapshotStatusValidator = v.union(
  v.literal("complete"),
  v.literal("partial"),
  v.literal("unavailable"),
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

export const academyProfessorStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

export const academyPackageStatusValidator = v.union(
  v.literal("active"),
  v.literal("exhausted"),
  v.literal("expired"),
  v.literal("cancelled"),
);

export const academySessionStatusValidator = v.union(
  v.literal("registered"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const academyAttendanceStatusValidator = v.union(
  v.literal("registered"),
  v.literal("student_confirmed"),
  v.literal("professor_validated"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const academyPaymentTypeValidator = v.union(
  v.literal("single"),
  v.literal("package"),
);

export const academyAttendancePaymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("not_required"),
);

export const academyClassTypeValidator = v.union(
  v.literal("private"),
  v.literal("group"),
  v.literal("other"),
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
  waivesDeposit: v.optional(v.boolean()),
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

export const academyProfessorValidator = v.object({
  _id: v.id("academyProfessors"),
  _creationTime: v.number(),
  clubId: v.id("clubs"),
  userId: v.optional(v.id("users")),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  status: academyProfessorStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const academyPackagePlanValidator = v.object({
  _id: v.id("academyPackagePlans"),
  _creationTime: v.number(),
  clubId: v.id("clubs"),
  name: v.string(),
  classesCount: v.number(),
  price: v.number(),
  validityDays: v.optional(v.number()),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const academyPackagePurchaseValidator = v.object({
  _id: v.id("academyPackagePurchases"),
  _creationTime: v.number(),
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
});

export const academyClassSessionValidator = v.object({
  _id: v.id("academyClassSessions"),
  _creationTime: v.number(),
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
});

export const academyClassAttendanceValidator = v.object({
  _id: v.id("academyClassAttendances"),
  _creationTime: v.number(),
  clubId: v.id("clubs"),
  classSessionId: v.id("academyClassSessions"),
  customerId: v.id("customers"),
  paymentType: academyPaymentTypeValidator,
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
  waivesDeposit: v.optional(v.boolean()),
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

export const reservationPaymentValidator = v.object({
  _id: v.id("reservationPayments"),
  _creationTime: v.number(),
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
});
