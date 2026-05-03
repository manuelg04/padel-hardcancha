import { ConvexError, v } from "convex/values";

import {
  calculateBookingSettlement,
  type BookingSettlementCalculation,
  type SettlementMemberInput,
} from "../lib/settlementRules";
import {
  findActiveCustomerMembership,
  isMembershipPlanUsable,
} from "../lib/membershipRules";
import { normalizeCustomerPhone } from "../lib/customerRecords";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUser, isSuperAdmin, requireClubAccess } from "./access";
import {
  bookingSettlementPreviewValidator,
  bookingSettlementValidator,
  customerMembershipValidator,
  customerValidator,
  membershipPlanValidator,
} from "./validators";

type Ctx = QueryCtx | MutationCtx;

const settlementInputArgs = {
  bookingId: v.id("bookings"),
  selectedMemberCustomerIds: v.array(v.id("customers")),
  manualAdjustmentAmount: v.optional(v.number()),
  manualAdjustmentReason: v.optional(v.string()),
};

const settlementMemberOptionValidator = v.object({
  membership: customerMembershipValidator,
  customer: customerValidator,
  plan: membershipPlanValidator,
});

async function requireSettlementAccess(ctx: Ctx, clubId: Id<"clubs">) {
  const auth = await getAuthUser(ctx);

  if (!auth) {
    throw new ConvexError("Debes iniciar sesion.");
  }

  if (await isSuperAdmin(ctx, auth.userId)) {
    return { ...auth, isSuperAdmin: true };
  }

  const access = await requireClubAccess(ctx, clubId, [
    "club_master",
    "club_staff",
  ]);

  return { ...access, isSuperAdmin: false };
}

async function getBookingOrThrow(ctx: Ctx, bookingId: Id<"bookings">) {
  const booking = await ctx.db.get(bookingId);

  if (!booking) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos la reserva.",
    });
  }

  return booking;
}

function assertLiquidatableBooking(booking: Doc<"bookings">) {
  if (booking.bookingStatus === "cancelled") {
    throw new ConvexError({
      code: "INVALID_BOOKING",
      message: "No se puede liquidar una reserva cancelada.",
    });
  }

  if (booking.bookingStatus === "blocked") {
    throw new ConvexError({
      code: "INVALID_BOOKING",
      message: "No se puede liquidar un bloqueo.",
    });
  }
}

function bookingStartTimestamp(booking: Doc<"bookings">) {
  const hours = Math.floor(booking.startMinutes / 60);
  const minutes = booking.startMinutes % 60;
  const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}`;

  return new Date(`${booking.localDate}T${time}:00-05:00`).getTime();
}

function assertSelectedCustomers(customerIds: Id<"customers">[]) {
  if (customerIds.length > 4) {
    throw new ConvexError({
      code: "TOO_MANY_MEMBERS",
      message: "No puedes seleccionar mas miembros que cupos.",
    });
  }

  const uniqueIds = new Set(customerIds);
  if (uniqueIds.size !== customerIds.length) {
    throw new ConvexError({
      code: "DUPLICATE_CUSTOMER",
      message: "No puedes seleccionar el mismo cliente dos veces.",
    });
  }
}

async function getActiveMembershipForBookingStart(
  ctx: Ctx,
  booking: Doc<"bookings">,
  customerId: Id<"customers">,
) {
  const memberships = await ctx.db
    .query("customerMemberships")
    .withIndex("by_customer_club", (q) =>
      q.eq("customerId", customerId).eq("clubId", booking.clubId),
    )
    .collect();

  return findActiveCustomerMembership(memberships, {
    clubId: booking.clubId,
    customerId,
    now: bookingStartTimestamp(booking),
  });
}

async function buildSelectedMemberSnapshots(
  ctx: Ctx,
  booking: Doc<"bookings">,
  customerIds: Id<"customers">[],
) {
  assertSelectedCustomers(customerIds);

  const members: SettlementMemberInput[] = [];

  for (const customerId of customerIds) {
    const customer = await ctx.db.get(customerId);
    if (!customer) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el cliente.",
      });
    }

    if (customer.clubId !== booking.clubId) {
      throw new ConvexError("El cliente no pertenece a este club.");
    }

    const membership = await getActiveMembershipForBookingStart(
      ctx,
      booking,
      customerId,
    );

    if (!membership) {
      throw new ConvexError({
        code: "NO_ACTIVE_MEMBERSHIP",
        message: "El cliente no tiene membresia activa para esta reserva.",
      });
    }

    const plan = await ctx.db.get(membership.membershipPlanId);
    if (!plan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el plan de membresia.",
      });
    }

    if (plan.clubId !== booking.clubId) {
      throw new ConvexError("El plan no pertenece a este club.");
    }

    if (!isMembershipPlanUsable(plan)) {
      throw new ConvexError({
        code: "INACTIVE_MEMBERSHIP_PLAN",
        message:
          "El plan de membresia esta inactivo y no puede aplicarse a esta liquidacion.",
      });
    }

    members.push({
      customerId,
      displayName: customer.fullName,
      membershipId: membership._id,
      membershipPlanId: plan._id,
      membershipPlanName: plan.name,
      benefitType: plan.benefitType,
      discountPercent: plan.discountPercent,
      fixedPrice: plan.fixedPrice,
      appliesAlways: plan.appliesAlways,
      validDaysOfWeek: plan.validDaysOfWeek,
      validStartTime: plan.validStartTime,
      validEndTime: plan.validEndTime,
    });
  }

  return members;
}

async function getSettlementMemberOption(
  ctx: Ctx,
  membership: Doc<"customerMemberships">,
) {
  const [customer, plan] = await Promise.all([
    ctx.db.get(membership.customerId),
    ctx.db.get(membership.membershipPlanId),
  ]);

  if (!customer || !plan || customer.clubId !== membership.clubId) {
    return null;
  }

  if (plan.clubId !== membership.clubId) {
    return null;
  }

  if (!isMembershipPlanUsable(plan)) {
    return null;
  }

  return { membership, customer, plan };
}

function toSettlementSnapshot(calculation: BookingSettlementCalculation) {
  return {
    baseBookingValue: calculation.baseBookingValue,
    baseShareValue: calculation.baseShareValue,
    playerSlots: calculation.playerSlots,
    memberCount: calculation.memberCount,
    nonMemberCount: calculation.nonMemberCount,
    memberCharges: calculation.memberCharges.map((charge) => ({
      customerId: charge.customerId as Id<"customers">,
      customerName: charge.customerName,
      membershipId: charge.membershipId as Id<"customerMemberships">,
      membershipPlanId: charge.membershipPlanId as Id<"membershipPlans">,
      membershipPlanName: charge.membershipPlanName,
      benefitType: charge.benefitType,
      discountPercent: charge.discountPercent,
      fixedPrice: charge.fixedPrice,
      benefitApplied: charge.benefitApplied,
      benefitNotAppliedReason: charge.benefitNotAppliedReason,
      baseShareValue: charge.baseShareValue,
      chargedValue: charge.chargedValue,
      discountValue: charge.discountValue,
    })),
    nonMemberUnitValue: calculation.nonMemberUnitValue,
    nonMemberTotalValue: calculation.nonMemberTotalValue,
    calculatedTotalCollectedValue: calculation.calculatedTotalCollectedValue,
    manualAdjustmentAmount: calculation.manualAdjustmentAmount,
    manualAdjustmentReason: calculation.manualAdjustmentReason,
    finalTotalCollectedValue: calculation.finalTotalCollectedValue,
    discountAbsorbedByClubValue: calculation.discountAbsorbedByClubValue,
    ruleSnapshot: calculation.ruleSnapshot,
  };
}

function settlementErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    const data = error.data;

    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (typeof data === "string") {
      return data;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No pudimos calcular la liquidacion.";
}

async function buildSettlementPreview(
  ctx: Ctx,
  args: {
    bookingId: Id<"bookings">;
    selectedMemberCustomerIds: Id<"customers">[];
    manualAdjustmentAmount?: number;
    manualAdjustmentReason?: string;
  },
) {
  const booking = await getBookingOrThrow(ctx, args.bookingId);
  await requireSettlementAccess(ctx, booking.clubId);
  assertLiquidatableBooking(booking);

  const selectedMembers = await buildSelectedMemberSnapshots(
    ctx,
    booking,
    args.selectedMemberCustomerIds,
  );
  const calculation = calculateBookingSettlement({
    bookingValue: booking.value,
    bookingDate: booking.localDate,
    bookingStartMinutes: booking.startMinutes,
    selectedMembers,
    manualAdjustmentAmount: args.manualAdjustmentAmount,
    manualAdjustmentReason: args.manualAdjustmentReason,
  });

  return {
    booking,
    snapshot: toSettlementSnapshot(calculation),
  };
}

async function getExistingSettlement(ctx: Ctx, bookingId: Id<"bookings">) {
  return await ctx.db
    .query("bookingSettlements")
    .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
    .unique();
}

export const previewBookingSettlement = query({
  args: settlementInputArgs,
  returns: bookingSettlementPreviewValidator,
  handler: async (ctx, args) => {
    const { booking, snapshot } = await buildSettlementPreview(ctx, args);

    return {
      bookingId: booking._id,
      clubId: booking.clubId,
      courtId: booking.courtId,
      ...snapshot,
    };
  },
});

export const previewBookingSettlementResult = query({
  args: settlementInputArgs,
  returns: v.union(
    v.object({
      ok: v.literal(true),
      preview: bookingSettlementPreviewValidator,
    }),
    v.object({
      ok: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    try {
      const { booking, snapshot } = await buildSettlementPreview(ctx, args);

      return {
        ok: true as const,
        preview: {
          bookingId: booking._id,
          clubId: booking.clubId,
          courtId: booking.courtId,
          ...snapshot,
        },
      };
    } catch (error) {
      return {
        ok: false as const,
        error: settlementErrorMessage(error),
      };
    }
  },
});

export const searchSettlementMemberOptions = query({
  args: {
    bookingId: v.id("bookings"),
    search: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(settlementMemberOptionValidator),
  handler: async (ctx, args) => {
    const booking = await getBookingOrThrow(ctx, args.bookingId);
    await requireSettlementAccess(ctx, booking.clubId);
    assertLiquidatableBooking(booking);

    const bookingStart = bookingStartTimestamp(booking);
    const normalizedSearch = args.search.trim().toLowerCase();
    const normalizedPhone = normalizeCustomerPhone(args.search);
    const memberships = await ctx.db
      .query("customerMemberships")
      .withIndex("by_club_status", (q) =>
        q.eq("clubId", booking.clubId).eq("status", "active"),
      )
      .take(200);
    const details = await Promise.all(
      memberships
        .filter((membership) =>
          findActiveCustomerMembership([membership], {
            clubId: booking.clubId,
            customerId: membership.customerId,
            now: bookingStart,
          }),
        )
        .map((membership) => getSettlementMemberOption(ctx, membership)),
    );

    return details
      .filter((detail): detail is NonNullable<typeof detail> => {
        if (!detail) return false;
        if (!normalizedSearch) return true;

        return (
          detail.customer.fullName.toLowerCase().includes(normalizedSearch) ||
          (normalizedPhone
            ? detail.customer.phone.includes(normalizedPhone)
            : false) ||
          (detail.customer.email?.toLowerCase().includes(normalizedSearch) ??
            false) ||
          detail.plan.name.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => a.customer.fullName.localeCompare(b.customer.fullName))
      .slice(0, args.limit ?? 8);
  },
});

export const createOrUpdateBookingSettlement = mutation({
  args: {
    ...settlementInputArgs,
    notes: v.optional(v.string()),
  },
  returns: v.id("bookingSettlements"),
  handler: async (ctx, args) => {
    const { booking, snapshot } = await buildSettlementPreview(ctx, args);
    const access = await requireSettlementAccess(ctx, booking.clubId);
    const existing = await getExistingSettlement(ctx, booking._id);
    const now = Date.now();
    const notes = args.notes?.trim() || undefined;

    if (existing?.status === "paid") {
      throw new ConvexError({
        code: "SETTLEMENT_PAID",
        message: "No se puede editar una liquidacion pagada.",
      });
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...snapshot,
        status: "closed",
        updatedByUserId: access.userId,
        closedAt: existing.closedAt ?? now,
        updatedAt: now,
        notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("bookingSettlements", {
      bookingId: booking._id,
      clubId: booking.clubId,
      courtId: booking.courtId,
      createdByUserId: access.userId,
      status: "closed",
      ...snapshot,
      closedAt: now,
      createdAt: now,
      updatedAt: now,
      notes,
    });
  },
});

export const getBookingSettlement = query({
  args: {
    bookingId: v.id("bookings"),
  },
  returns: v.union(bookingSettlementValidator, v.null()),
  handler: async (ctx, args) => {
    const booking = await getBookingOrThrow(ctx, args.bookingId);
    await requireSettlementAccess(ctx, booking.clubId);

    return await getExistingSettlement(ctx, args.bookingId);
  },
});

export const markBookingSettlementPaid = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await getBookingOrThrow(ctx, args.bookingId);
    const access = await requireSettlementAccess(ctx, booking.clubId);
    assertLiquidatableBooking(booking);
    const settlement = await getExistingSettlement(ctx, args.bookingId);

    if (!settlement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la liquidacion.",
      });
    }

    if (settlement.status === "cancelled") {
      throw new ConvexError({
        code: "SETTLEMENT_CANCELLED",
        message: "No se puede pagar una liquidacion cancelada.",
      });
    }

    if (settlement.status === "paid") {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(settlement._id, {
      status: "paid",
      paidAt: now,
      updatedByUserId: access.userId,
      updatedAt: now,
    });

    if (booking.paymentStatus !== "paid") {
      await ctx.db.patch(args.bookingId, {
        paymentStatus: "paid",
        paidAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const cancelBookingSettlement = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const booking = await getBookingOrThrow(ctx, args.bookingId);
    const access = await requireSettlementAccess(ctx, booking.clubId);
    const settlement = await getExistingSettlement(ctx, args.bookingId);

    if (!settlement) {
      return null;
    }

    if (settlement.status === "paid") {
      throw new ConvexError({
        code: "SETTLEMENT_PAID",
        message: "No se puede cancelar una liquidacion pagada.",
      });
    }

    await ctx.db.patch(settlement._id, {
      status: "cancelled",
      updatedByUserId: access.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});
