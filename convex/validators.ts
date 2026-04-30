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
