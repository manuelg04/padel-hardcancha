import { ConvexError, v } from "convex/values";

import {
  buildCustomerMembershipRecord,
  findActiveCustomerMembership,
  findOverlappingActiveMembership,
  isMembershipPlanUsable,
  validateMembershipPlanInput,
  type MembershipBenefitType,
} from "../lib/membershipRules";
import { normalizeCustomerPhone } from "../lib/customerRecords";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  customerMembershipStatusValidator,
  customerMembershipValidator,
  customerValidator,
  membershipBenefitTypeValidator,
  membershipPlanValidator,
} from "./validators";
import { getAuthUser, isSuperAdmin, requireClubAccess } from "./access";

type Ctx = QueryCtx | MutationCtx;

const membershipWithDetailsValidator = v.object({
  membership: customerMembershipValidator,
  customer: customerValidator,
  plan: membershipPlanValidator,
});

const optionalPlanFields = {
  description: v.optional(v.string()),
  monthlyPrice: v.optional(v.number()),
  discountPercent: v.optional(v.number()),
  fixedPrice: v.optional(v.number()),
  validDaysOfWeek: v.optional(v.array(v.number())),
  validStartTime: v.optional(v.string()),
  validEndTime: v.optional(v.string()),
};

async function requireClubReadAccess(ctx: Ctx, clubId: Id<"clubs">) {
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

async function requireClubManageAccess(ctx: Ctx, clubId: Id<"clubs">) {
  const auth = await getAuthUser(ctx);

  if (!auth) {
    throw new ConvexError("Debes iniciar sesion.");
  }

  if (await isSuperAdmin(ctx, auth.userId)) {
    return { ...auth, isSuperAdmin: true };
  }

  const access = await requireClubAccess(ctx, clubId, ["club_master"]);
  return { ...access, isSuperAdmin: false };
}

async function getClubOrThrow(ctx: Ctx, clubId: Id<"clubs">) {
  const club = await ctx.db.get(clubId);

  if (!club) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el club.",
    });
  }

  return club;
}

async function getCustomerOrThrow(ctx: Ctx, customerId: Id<"customers">) {
  const customer = await ctx.db.get(customerId);

  if (!customer) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el cliente.",
    });
  }

  return customer;
}

async function getMembershipPlanOrThrow(
  ctx: Ctx,
  planId: Id<"membershipPlans">,
) {
  const plan = await ctx.db.get(planId);

  if (!plan) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el plan de membresia.",
    });
  }

  return plan;
}

function cleanPlanInput(input: {
  name: string;
  description?: string;
  monthlyPrice?: number;
  benefitType: MembershipBenefitType;
  discountPercent?: number;
  fixedPrice?: number;
  appliesAlways: boolean;
  validDaysOfWeek?: number[];
  validStartTime?: string;
  validEndTime?: string;
}) {
  const validDaysOfWeek = input.appliesAlways
    ? undefined
    : Array.from(new Set(input.validDaysOfWeek ?? [])).sort((a, b) => a - b);
  const validStartTime = input.appliesAlways
    ? undefined
    : input.validStartTime?.trim() || undefined;
  const validEndTime = input.appliesAlways
    ? undefined
    : input.validEndTime?.trim() || undefined;
  const cleaned = {
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    monthlyPrice: input.monthlyPrice,
    benefitType: input.benefitType,
    discountPercent:
      input.benefitType === "percentage_discount"
        ? input.discountPercent
        : undefined,
    fixedPrice:
      input.benefitType === "fixed_price" ? input.fixedPrice : undefined,
    appliesAlways: input.appliesAlways,
    validDaysOfWeek:
      validDaysOfWeek && validDaysOfWeek.length > 0 ? validDaysOfWeek : undefined,
    validStartTime,
    validEndTime,
  };
  const errors = validateMembershipPlanInput(cleaned);

  if (errors.length > 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: errors.join(" "),
    });
  }

  return cleaned;
}

function assertMembershipDates({
  startsAt,
  endsAt,
}: {
  startsAt: number;
  endsAt?: number;
}) {
  if (!Number.isFinite(startsAt)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha de inicio no es valida.",
    });
  }

  if (endsAt !== undefined && (!Number.isFinite(endsAt) || endsAt <= startsAt)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La fecha final debe ser posterior a la fecha de inicio.",
    });
  }
}

async function getCurrentActiveMembershipForCustomer(
  ctx: Ctx,
  clubId: Id<"clubs">,
  customerId: Id<"customers">,
  now: number,
) {
  const memberships = await ctx.db
    .query("customerMemberships")
    .withIndex("by_customer_club", (q) =>
      q.eq("customerId", customerId).eq("clubId", clubId),
    )
    .collect();

  return findActiveCustomerMembership(memberships, {
    clubId,
    customerId,
    now,
  });
}

async function getOverlappingActiveMembershipForCustomer(
  ctx: Ctx,
  {
    clubId,
    customerId,
    startsAt,
    endsAt,
    excludeMembershipId,
  }: {
    clubId: Id<"clubs">;
    customerId: Id<"customers">;
    startsAt: number;
    endsAt?: number;
    excludeMembershipId?: Id<"customerMemberships">;
  },
) {
  const memberships = await ctx.db
    .query("customerMemberships")
    .withIndex("by_customer_club", (q) =>
      q.eq("customerId", customerId).eq("clubId", clubId),
    )
    .collect();

  return findOverlappingActiveMembership(
    memberships,
    {
      clubId,
      customerId,
      status: "active",
      startsAt,
      endsAt,
    },
    { excludeMembershipId },
  );
}

async function getMembershipDetails(
  ctx: Ctx,
  membership: Doc<"customerMemberships">,
) {
  const [customer, plan] = await Promise.all([
    ctx.db.get(membership.customerId),
    ctx.db.get(membership.membershipPlanId),
  ]);

  if (!customer || !plan) {
    return null;
  }

  return { membership, customer, plan };
}

export const listMembershipPlansByClub = query({
  args: {
    clubId: v.id("clubs"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(membershipPlanValidator),
  handler: async (ctx, args) => {
    await requireClubReadAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const plans = await ctx.db
      .query("membershipPlans")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return plans
      .filter((plan) => args.includeInactive || plan.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createMembershipPlan = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    benefitType: membershipBenefitTypeValidator,
    appliesAlways: v.boolean(),
    ...optionalPlanFields,
  },
  returns: v.id("membershipPlans"),
  handler: async (ctx, args) => {
    await requireClubManageAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const now = Date.now();
    const cleaned = cleanPlanInput(args);

    return await ctx.db.insert("membershipPlans", {
      clubId: args.clubId,
      ...cleaned,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMembershipPlan = mutation({
  args: {
    membershipPlanId: v.id("membershipPlans"),
    name: v.optional(v.string()),
    benefitType: v.optional(membershipBenefitTypeValidator),
    appliesAlways: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    ...optionalPlanFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await getMembershipPlanOrThrow(ctx, args.membershipPlanId);
    await requireClubManageAccess(ctx, plan.clubId);

    const next = cleanPlanInput({
      name: args.name ?? plan.name,
      description:
        args.description !== undefined ? args.description : plan.description,
      monthlyPrice:
        args.monthlyPrice !== undefined ? args.monthlyPrice : plan.monthlyPrice,
      benefitType: args.benefitType ?? plan.benefitType,
      discountPercent:
        args.discountPercent !== undefined
          ? args.discountPercent
          : plan.discountPercent,
      fixedPrice: args.fixedPrice !== undefined ? args.fixedPrice : plan.fixedPrice,
      appliesAlways: args.appliesAlways ?? plan.appliesAlways,
      validDaysOfWeek:
        args.validDaysOfWeek !== undefined
          ? args.validDaysOfWeek
          : plan.validDaysOfWeek,
      validStartTime:
        args.validStartTime !== undefined
          ? args.validStartTime
          : plan.validStartTime,
      validEndTime:
        args.validEndTime !== undefined ? args.validEndTime : plan.validEndTime,
    });

    await ctx.db.patch(args.membershipPlanId, {
      ...next,
      isActive: args.isActive ?? plan.isActive,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const setMembershipPlanActive = mutation({
  args: {
    membershipPlanId: v.id("membershipPlans"),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await getMembershipPlanOrThrow(ctx, args.membershipPlanId);
    await requireClubManageAccess(ctx, plan.clubId);

    await ctx.db.patch(args.membershipPlanId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const searchCustomersByClub = query({
  args: {
    clubId: v.id("clubs"),
    search: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(customerValidator),
  handler: async (ctx, args) => {
    await requireClubReadAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const normalizedSearch = args.search.trim().toLowerCase();
    const normalizedPhone = normalizeCustomerPhone(args.search);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .take(200);

    const matches = customers.filter((customer) => {
      if (customer.status !== "active") return false;
      if (!normalizedSearch) return true;

      return (
        customer.fullName.toLowerCase().includes(normalizedSearch) ||
        (normalizedPhone ? customer.phone.includes(normalizedPhone) : false) ||
        (customer.email?.toLowerCase().includes(normalizedSearch) ?? false)
      );
    });

    return matches
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, args.limit ?? 20);
  },
});

export const createCustomerMembership = mutation({
  args: {
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
    membershipPlanId: v.id("membershipPlans"),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("customerMemberships"),
  handler: async (ctx, args) => {
    await requireClubManageAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);
    assertMembershipDates(args);

    const [customer, plan] = await Promise.all([
      getCustomerOrThrow(ctx, args.customerId),
      getMembershipPlanOrThrow(ctx, args.membershipPlanId),
    ]);

    if (customer.clubId !== args.clubId) {
      throw new ConvexError("El cliente no pertenece a este club.");
    }

    if (plan.clubId !== args.clubId) {
      throw new ConvexError("El plan no pertenece a este club.");
    }

    if (!isMembershipPlanUsable(plan)) {
      throw new ConvexError({
        code: "INACTIVE_MEMBERSHIP_PLAN",
        message: "No se puede asignar una membresia con un plan inactivo.",
      });
    }

    const now = Date.now();
    const activeMembership = await getOverlappingActiveMembershipForCustomer(ctx, {
      clubId: args.clubId,
      customerId: args.customerId,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
    });

    if (activeMembership) {
      throw new ConvexError({
        code: "DUPLICATE_ACTIVE_MEMBERSHIP",
        message: "Este cliente ya tiene una membresia activa en este club.",
      });
    }

    return await ctx.db.insert(
      "customerMemberships",
      buildCustomerMembershipRecord({
        clubId: args.clubId,
        customerId: args.customerId,
        userId: customer.userId,
        membershipPlanId: args.membershipPlanId,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
        notes: args.notes,
        now,
      }),
    );
  },
});

export const updateCustomerMembership = mutation({
  args: {
    customerMembershipId: v.id("customerMemberships"),
    membershipPlanId: v.optional(v.id("membershipPlans")),
    status: v.optional(customerMembershipStatusValidator),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.customerMembershipId);

    if (!membership) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la membresia.",
      });
    }

    await requireClubManageAccess(ctx, membership.clubId);

    const membershipPlanId = args.membershipPlanId ?? membership.membershipPlanId;
    const startsAt = args.startsAt ?? membership.startsAt;
    const endsAt = args.endsAt ?? membership.endsAt;
    const status = args.status ?? membership.status;
    assertMembershipDates({ startsAt, endsAt });

    if (
      args.membershipPlanId !== undefined ||
      (args.status === "active" && membership.status !== "active")
    ) {
      const plan = await getMembershipPlanOrThrow(ctx, membershipPlanId);
      if (plan.clubId !== membership.clubId) {
        throw new ConvexError("El plan no pertenece a este club.");
      }

      if (!isMembershipPlanUsable(plan)) {
        throw new ConvexError({
          code: "INACTIVE_MEMBERSHIP_PLAN",
          message: "No se puede activar una membresia con un plan inactivo.",
        });
      }
    }

    if (status === "active") {
      const activeMembership = await getOverlappingActiveMembershipForCustomer(ctx, {
        clubId: membership.clubId,
        customerId: membership.customerId,
        startsAt,
        endsAt,
        excludeMembershipId: args.customerMembershipId,
      });

      if (
        activeMembership &&
        activeMembership._id !== args.customerMembershipId
      ) {
        throw new ConvexError({
          code: "DUPLICATE_ACTIVE_MEMBERSHIP",
          message: "Este cliente ya tiene una membresia activa en este club.",
        });
      }
    }

    await ctx.db.patch(args.customerMembershipId, {
      membershipPlanId,
      status,
      startsAt,
      endsAt,
      notes: args.notes !== undefined ? args.notes.trim() || undefined : membership.notes,
      cancelledAt:
        status === "cancelled"
          ? membership.cancelledAt ?? Date.now()
          : membership.cancelledAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateCustomerMembershipStatus = mutation({
  args: {
    customerMembershipId: v.id("customerMemberships"),
    status: customerMembershipStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.customerMembershipId);

    if (!membership) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la membresia.",
      });
    }

    await requireClubManageAccess(ctx, membership.clubId);

    if (args.status === "active") {
      const plan = await getMembershipPlanOrThrow(
        ctx,
        membership.membershipPlanId,
      );

      if (!isMembershipPlanUsable(plan)) {
        throw new ConvexError({
          code: "INACTIVE_MEMBERSHIP_PLAN",
          message: "No se puede activar una membresia con un plan inactivo.",
        });
      }

      const activeMembership = await getOverlappingActiveMembershipForCustomer(ctx, {
        clubId: membership.clubId,
        customerId: membership.customerId,
        startsAt: membership.startsAt,
        endsAt: membership.endsAt,
        excludeMembershipId: args.customerMembershipId,
      });

      if (
        activeMembership &&
        activeMembership._id !== args.customerMembershipId
      ) {
        throw new ConvexError({
          code: "DUPLICATE_ACTIVE_MEMBERSHIP",
          message: "Este cliente ya tiene una membresia activa en este club.",
        });
      }
    }

    await ctx.db.patch(args.customerMembershipId, {
      status: args.status,
      cancelledAt:
        args.status === "cancelled"
          ? membership.cancelledAt ?? Date.now()
          : membership.cancelledAt,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const listCustomerMembershipsByClub = query({
  args: {
    clubId: v.id("clubs"),
    status: v.optional(customerMembershipStatusValidator),
  },
  returns: v.array(membershipWithDetailsValidator),
  handler: async (ctx, args) => {
    await requireClubReadAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const status = args.status;
    const memberships =
      status === undefined
        ? await ctx.db
            .query("customerMemberships")
            .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
            .take(200)
        : await ctx.db
            .query("customerMemberships")
            .withIndex("by_club_status", (q) =>
              q.eq("clubId", args.clubId).eq("status", status),
            )
            .take(200);
    const activeNow = Date.now();
    const details = await Promise.all(
      memberships
        .filter(
          (membership) =>
            args.status !== "active" ||
            findActiveCustomerMembership([membership], {
              clubId: args.clubId,
              customerId: membership.customerId,
              now: activeNow,
            }),
        )
        .map((membership) => getMembershipDetails(ctx, membership)),
    );

    return details
      .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
      .sort((a, b) => b.membership.createdAt - a.membership.createdAt);
  },
});

export const searchActiveCustomerMemberships = query({
  args: {
    clubId: v.id("clubs"),
    search: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(membershipWithDetailsValidator),
  handler: async (ctx, args) => {
    await requireClubReadAccess(ctx, args.clubId);
    await getClubOrThrow(ctx, args.clubId);

    const now = Date.now();
    const normalizedSearch = args.search.trim().toLowerCase();
    const normalizedPhone = normalizeCustomerPhone(args.search);
    const memberships = await ctx.db
      .query("customerMemberships")
      .withIndex("by_club_status", (q) =>
        q.eq("clubId", args.clubId).eq("status", "active"),
      )
      .take(200);
    const details = await Promise.all(
      memberships
        .filter((membership) =>
          findActiveCustomerMembership([membership], {
            clubId: args.clubId,
            customerId: membership.customerId,
            now,
          }),
        )
        .map((membership) => getMembershipDetails(ctx, membership)),
    );

    return details
      .filter((detail): detail is NonNullable<typeof detail> => {
        if (!detail) return false;
        if (!isMembershipPlanUsable(detail.plan)) return false;
        if (!normalizedSearch) return true;

        return (
          detail.customer.fullName.toLowerCase().includes(normalizedSearch) ||
          (normalizedPhone
            ? detail.customer.phone.includes(normalizedPhone)
            : false) ||
          (detail.customer.email?.toLowerCase().includes(normalizedSearch) ??
            false)
        );
      })
      .sort((a, b) => a.customer.fullName.localeCompare(b.customer.fullName))
      .slice(0, args.limit ?? 20);
  },
});

export const getActiveCustomerMembership = query({
  args: {
    clubId: v.id("clubs"),
    customerId: v.id("customers"),
  },
  returns: v.union(membershipWithDetailsValidator, v.null()),
  handler: async (ctx, args) => {
    await requireClubReadAccess(ctx, args.clubId);
    const customer = await getCustomerOrThrow(ctx, args.customerId);

    if (customer.clubId !== args.clubId) {
      throw new ConvexError("El cliente no pertenece a este club.");
    }

    const membership = await getCurrentActiveMembershipForCustomer(
      ctx,
      args.clubId,
      args.customerId,
      Date.now(),
    );

    if (!membership) {
      return null;
    }

    const details = await getMembershipDetails(ctx, membership);

    if (!details || !isMembershipPlanUsable(details.plan)) {
      return null;
    }

    return details;
  },
});
