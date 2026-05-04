import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { getCurrentUserClub, requireClubAccess } from "./access";
import {
  bookingSettlementStatusValidator,
  bookingStatusValidator,
  customerMembershipStatusValidator,
  membershipBenefitTypeValidator,
  openingHourValidator,
  paymentMethodValidator,
  paymentStatusValidator,
} from "./validators";

const maxRangeDays = 92;
const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const metricsCourtValidator = v.object({
  id: v.string(),
  name: v.string(),
  isActive: v.boolean(),
  sortOrder: v.number(),
});

const metricsBookingValidator = v.object({
  id: v.string(),
  code: v.string(),
  localDate: v.string(),
  startMinutes: v.number(),
  endMinutes: v.number(),
  durationMinutes: v.number(),
  courtId: v.string(),
  courtName: v.string(),
  customerId: v.optional(v.string()),
  customerName: v.optional(v.string()),
  customerPhone: v.optional(v.string()),
  customerEmail: v.optional(v.string()),
  bookingStatus: bookingStatusValidator,
  paymentStatus: paymentStatusValidator,
  paymentMethod: paymentMethodValidator,
  value: v.number(),
  createdAt: v.number(),
  cancelledAt: v.optional(v.number()),
});

const metricsSettlementMemberChargeValidator = v.object({
  customerId: v.string(),
  customerName: v.string(),
  membershipId: v.string(),
  membershipPlanId: v.string(),
  membershipPlanName: v.string(),
  benefitType: membershipBenefitTypeValidator,
  discountPercent: v.optional(v.number()),
  fixedPrice: v.optional(v.number()),
  benefitApplied: v.boolean(),
  baseShareValue: v.number(),
  chargedValue: v.number(),
  discountValue: v.number(),
});

const metricsSettlementValidator = v.object({
  id: v.string(),
  bookingId: v.string(),
  status: bookingSettlementStatusValidator,
  baseBookingValue: v.number(),
  finalTotalCollectedValue: v.number(),
  discountAbsorbedByClubValue: v.number(),
  manualAdjustmentAmount: v.number(),
  manualAdjustmentReason: v.optional(v.string()),
  paymentMethod: v.optional(paymentMethodValidator),
  memberCharges: v.array(metricsSettlementMemberChargeValidator),
  paidAt: v.optional(v.number()),
  closedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const metricsMembershipValidator = v.object({
  id: v.string(),
  customerId: v.string(),
  customerName: v.string(),
  planId: v.string(),
  planName: v.string(),
  status: customerMembershipStatusValidator,
  startsAt: v.number(),
  endsAt: v.optional(v.number()),
  createdAt: v.number(),
  cancelledAt: v.optional(v.number()),
  monthlyPrice: v.optional(v.number()),
});

function parseLocalDate(localDate: string) {
  if (!localDatePattern.test(localDate)) {
    throw new ConvexError("La fecha debe estar en formato YYYY-MM-DD.");
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);

  if (Number.isNaN(timestamp)) {
    throw new ConvexError("La fecha no es valida.");
  }

  return timestamp;
}

function rangeDays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (start > end) {
    throw new ConvexError("La fecha inicial no puede ser posterior a la final.");
  }

  const days = Math.floor((end - start) / 86400000) + 1;

  if (days > maxRangeDays) {
    throw new ConvexError("El rango maximo permitido es de 92 dias.");
  }

  return days;
}

function addDays(localDate: string, days: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

async function listBookingsForRange(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
  startDate: string,
  days: number,
) {
  const bookings: Doc<"bookings">[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    const localDate = addDays(startDate, offset);
    const dayBookings = await ctx.db
      .query("bookings")
      .withIndex("by_club_date", (q) =>
        q.eq("clubId", clubId).eq("localDate", localDate),
      )
      .collect();

    bookings.push(...dayBookings);
  }

  return bookings;
}

function openingHoursForClub(club: Doc<"clubs">) {
  return club.openingHours
    .slice()
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      isOpen: entry.isOpen,
      openMinutes: entry.openMinutes,
      closeMinutes: entry.closeMinutes,
    }));
}

async function getCustomersById(
  ctx: QueryCtx,
  bookings: Doc<"bookings">[],
  memberships: Doc<"customerMemberships">[],
) {
  const customerIds = new Set<Id<"customers">>();

  for (const booking of bookings) {
    if (booking.customerId) customerIds.add(booking.customerId);
  }

  for (const membership of memberships) {
    customerIds.add(membership.customerId);
  }

  const entries = await Promise.all(
    Array.from(customerIds).map(async (customerId) => [
      customerId,
      await ctx.db.get(customerId),
    ] as const),
  );

  return new Map(entries.filter((entry): entry is [Id<"customers">, Doc<"customers">] =>
    Boolean(entry[1]),
  ));
}

export const getClubMetricsExportData = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.object({
    club: v.object({
      id: v.string(),
      name: v.string(),
      timezone: v.string(),
      openingHours: v.array(openingHourValidator),
    }),
    courts: v.array(metricsCourtValidator),
    bookings: v.array(metricsBookingValidator),
    settlements: v.array(metricsSettlementValidator),
    memberships: v.array(metricsMembershipValidator),
    generatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const days = rangeDays(args.startDate, args.endDate);
    const { club } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
    const [courts, bookings, memberships, plans] = await Promise.all([
      ctx.db
        .query("courts")
        .withIndex("by_club", (q) => q.eq("clubId", club._id))
        .collect(),
      listBookingsForRange(ctx, club._id, args.startDate, days),
      ctx.db
        .query("customerMemberships")
        .withIndex("by_club", (q) => q.eq("clubId", club._id))
        .collect(),
      ctx.db
        .query("membershipPlans")
        .withIndex("by_club", (q) => q.eq("clubId", club._id))
        .collect(),
    ]);
    const courtsById = new Map(courts.map((court) => [court._id, court]));
    const plansById = new Map(plans.map((plan) => [plan._id, plan]));
    const customersById = await getCustomersById(ctx, bookings, memberships);
    const settlements = (
      await Promise.all(
        bookings.map((booking) =>
          ctx.db
            .query("bookingSettlements")
            .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
            .unique(),
        ),
      )
    ).filter((settlement): settlement is Doc<"bookingSettlements"> =>
      Boolean(settlement),
    );

    return {
      club: {
        id: club._id,
        name: club.name,
        timezone: club.timezone,
        openingHours: openingHoursForClub(club),
      },
      courts: courts
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((court) => ({
          id: court._id,
          name: court.name,
          isActive: court.isActive,
          sortOrder: court.sortOrder,
        })),
      bookings: bookings.map((booking) => {
        const court = courtsById.get(booking.courtId);
        const customer = booking.customerId
          ? customersById.get(booking.customerId)
          : null;

        return {
          id: booking._id,
          code: booking.code,
          localDate: booking.localDate,
          startMinutes: booking.startMinutes,
          endMinutes: booking.endMinutes,
          durationMinutes: booking.durationMinutes,
          courtId: booking.courtId,
          courtName: court?.name ?? "Cancha no encontrada",
          customerId: booking.customerId,
          customerName: booking.customerName ?? customer?.fullName,
          customerPhone: booking.customerPhone ?? customer?.phone,
          customerEmail: booking.customerEmail ?? customer?.email,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod,
          value: booking.value,
          createdAt: booking.createdAt,
          cancelledAt: booking.cancelledAt,
        };
      }),
      settlements: settlements.map((settlement) => {
        const booking = bookings.find(
          (candidate) => candidate._id === settlement.bookingId,
        );

        return {
          id: settlement._id,
          bookingId: settlement.bookingId,
          status: settlement.status,
          baseBookingValue: settlement.baseBookingValue,
          finalTotalCollectedValue: settlement.finalTotalCollectedValue,
          discountAbsorbedByClubValue: settlement.discountAbsorbedByClubValue,
          manualAdjustmentAmount: settlement.manualAdjustmentAmount,
          manualAdjustmentReason: settlement.manualAdjustmentReason,
          paymentMethod: booking?.paymentMethod,
          memberCharges: settlement.memberCharges.map((charge) => ({
            customerId: charge.customerId,
            customerName: charge.customerName,
            membershipId: charge.membershipId,
            membershipPlanId: charge.membershipPlanId,
            membershipPlanName: charge.membershipPlanName,
            benefitType: charge.benefitType,
            discountPercent: charge.discountPercent,
            fixedPrice: charge.fixedPrice,
            benefitApplied: charge.benefitApplied,
            baseShareValue: charge.baseShareValue,
            chargedValue: charge.chargedValue,
            discountValue: charge.discountValue,
          })),
          paidAt: settlement.paidAt,
          closedAt: settlement.closedAt,
          createdAt: settlement.createdAt,
          updatedAt: settlement.updatedAt,
        };
      }),
      memberships: memberships.map((membership) => {
        const customer = customersById.get(membership.customerId);
        const plan = plansById.get(membership.membershipPlanId);

        return {
          id: membership._id,
          customerId: membership.customerId,
          customerName: customer?.fullName ?? "Cliente no encontrado",
          planId: membership.membershipPlanId,
          planName: plan?.name ?? "Plan no encontrado",
          status: membership.status,
          startsAt: membership.startsAt,
          endsAt: membership.endsAt,
          createdAt: membership.createdAt,
          cancelledAt: membership.cancelledAt,
          monthlyPrice: plan?.monthlyPrice,
        };
      }),
      generatedAt: Date.now(),
    };
  },
});
