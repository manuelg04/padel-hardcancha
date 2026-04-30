import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { courtValidator } from "./validators";
import {
  getAuthUser,
  isSuperAdmin,
  requireClubAccess,
  requireSuperAdmin,
} from "./access";

export const listCourtsByClub = query({
  args: {
    clubId: v.id("clubs"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(courtValidator),
  handler: async (ctx, args) => {
    const auth = await getAuthUser(ctx);

    if (!auth) {
      throw new ConvexError("Debes iniciar sesion.");
    }

    if (!(await isSuperAdmin(ctx, auth.userId))) {
      await requireClubAccess(ctx, args.clubId, ["club_master", "club_staff"]);
    }

    const courts = await ctx.db
      .query("courts")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return courts
      .filter((court) => args.includeInactive || court.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listActiveCourtsByClub = query({
  args: {
    clubId: v.id("clubs"),
  },
  returns: v.array(courtValidator),
  handler: async (ctx, args) => {
    const courts = await ctx.db
      .query("courts")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();

    return courts
      .filter((court) => court.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

function assertCourtInput(args: {
  name: string;
  description: string;
  courtType: string;
  sortOrder: number;
}) {
  if (!args.name.trim()) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El nombre de la cancha es obligatorio.",
    });
  }

  if (!args.description.trim()) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La descripcion de la cancha es obligatoria.",
    });
  }

  if (!args.courtType.trim()) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El tipo de cancha es obligatorio.",
    });
  }

  if (!Number.isFinite(args.sortOrder) || args.sortOrder < 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El orden debe ser mayor o igual a 0.",
    });
  }
}

export const createCourt = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    description: v.string(),
    courtType: v.string(),
    isCovered: v.boolean(),
    sortOrder: v.number(),
  },
  returns: v.id("courts"),
  handler: async (ctx, args) => {
    await requireClubAccess(ctx, args.clubId, ["club_master", "club_staff"]);
    assertCourtInput(args);
    const now = Date.now();

    return await ctx.db.insert("courts", {
      clubId: args.clubId,
      name: args.name.trim(),
      description: args.description.trim(),
      courtType: args.courtType.trim(),
      isCovered: args.isCovered,
      isActive: true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const superAdminCreateCourt = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    description: v.string(),
    courtType: v.string(),
    isCovered: v.boolean(),
    isActive: v.optional(v.boolean()),
    sortOrder: v.number(),
  },
  returns: v.id("courts"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    assertCourtInput(args);

    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el club.",
      });
    }

    const now = Date.now();

    return await ctx.db.insert("courts", {
      clubId: args.clubId,
      name: args.name.trim(),
      description: args.description.trim(),
      courtType: args.courtType.trim(),
      isCovered: args.isCovered,
      isActive: args.isActive ?? true,
      sortOrder: args.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCourt = mutation({
  args: {
    courtId: v.id("courts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    courtType: v.optional(v.string()),
    isCovered: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const court = await ctx.db.get(args.courtId);

    if (!court) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la cancha.",
      });
    }

    await requireClubAccess(ctx, court.clubId, ["club_master", "club_staff"]);

    const updates: Partial<Doc<"courts">> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.description !== undefined) {
      updates.description = args.description.trim();
    }
    if (args.courtType !== undefined) updates.courtType = args.courtType.trim();
    if (args.isCovered !== undefined) updates.isCovered = args.isCovered;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.courtId, updates);
    return null;
  },
});

export const superAdminUpdateCourt = mutation({
  args: {
    courtId: v.id("courts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    courtType: v.optional(v.string()),
    isCovered: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const court = await ctx.db.get(args.courtId);

    if (!court) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la cancha.",
      });
    }

    const name = args.name ?? court.name;
    const description = args.description ?? court.description;
    const courtType = args.courtType ?? court.courtType;
    const sortOrder = args.sortOrder ?? court.sortOrder;

    assertCourtInput({ name, description, courtType, sortOrder });

    const updates: Partial<Doc<"courts">> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.description !== undefined) {
      updates.description = args.description.trim();
    }
    if (args.courtType !== undefined) updates.courtType = args.courtType.trim();
    if (args.isCovered !== undefined) updates.isCovered = args.isCovered;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.courtId, updates);
    return null;
  },
});

export const deactivateCourt = mutation({
  args: { courtId: v.id("courts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const court = await ctx.db.get(args.courtId);

    if (!court) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos la cancha.",
      });
    }

    await requireClubAccess(ctx, court.clubId, ["club_master", "club_staff"]);
    await ctx.db.patch(args.courtId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const superAdminDeactivateCourt = mutation({
  args: { courtId: v.id("courts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.courtId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});
