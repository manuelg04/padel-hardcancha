import { ConvexError, v } from "convex/values";

import { BOGOTA_TIMEZONE } from "../lib/bookingRules";
import { internalMutation, query, mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  clubValidator,
  clubWithActiveCourtCountValidator,
  clubUserRoleValidator,
  openingHourValidator,
  pricingValidator,
  publicClubCardValidator,
  roleStatusValidator,
  userPublicValidator,
} from "./validators";
import {
  getCurrentUserClub,
  publicUser,
  requireClubAccess,
  requireSuperAdmin,
} from "./access";

const DEFAULT_PEAK_START_MINUTES = 17 * 60;
const DEFAULT_PEAK_END_MINUTES = 21 * 60;

const defaultOpeningHours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isOpen: true,
  openMinutes: 6 * 60,
  closeMinutes: 23 * 60,
}));

const defaultCoverImageUrl =
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1400&q=80";

const clubMasterValidator = v.union(
  v.object({
    clubUserId: v.id("clubUsers"),
    role: clubUserRoleValidator,
    status: roleStatusValidator,
    user: userPublicValidator,
  }),
  v.null(),
);

type Ctx = QueryCtx | MutationCtx;

function trimOrEmpty(value?: string) {
  return value?.trim() ?? "";
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function required(value: string, message: string) {
  if (!value.trim()) {
    throw new ConvexError({ code: "VALIDATION_ERROR", message });
  }
}

function assertDescription(value: string) {
  if (value.length > 500) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La descripcion no puede superar 500 caracteres.",
    });
  }
}

function assertNonNegativePrice(value: number, message: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({ code: "VALIDATION_ERROR", message });
  }
}

function assertPeakWindow(startMinutes: number, endMinutes: number) {
  if (startMinutes >= endMinutes) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "La hora pico inicial debe ser menor que la hora final.",
    });
  }
}

function assertValidOptionalUrl(value: string, field: string) {
  if (!value.trim()) return;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: `${field} debe ser una URL valida.`,
    });
  }
}

function pricingFromFlat(args: {
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  peakStartMinutes: number;
  peakEndMinutes: number;
}) {
  return {
    normalPricePerHour: args.normalPricePerHour,
    peakPricePerHour: args.peakPricePerHour,
    weekendPricePerHour: args.weekendPricePerHour,
    peakStartMinutes: args.peakStartMinutes,
    peakEndMinutes: args.peakEndMinutes,
  };
}

async function assertSlugAvailable(
  ctx: Ctx,
  slug: string,
  currentClubId?: Id<"clubs">,
) {
  required(slug, "El slug es obligatorio.");

  const existing = await ctx.db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== currentClubId) {
    throw new ConvexError({
      code: "SLUG_TAKEN",
      message: "El slug ya esta en uso.",
    });
  }
}

async function countActiveCourts(ctx: Ctx, clubId: Id<"clubs">) {
  const courts = await ctx.db
    .query("courts")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .collect();

  return courts.filter((court) => court.isActive).length;
}

function assertCreateInput(args: {
  name: string;
  slug: string;
  city: string;
  address: string;
  whatsapp: string;
  description?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  peakStartMinutes?: number;
  peakEndMinutes?: number;
}) {
  required(args.name, "El nombre es obligatorio.");
  required(args.slug, "El slug es obligatorio.");
  required(args.city, "La ciudad es obligatoria.");
  required(args.address, "La direccion es obligatoria.");
  required(args.whatsapp, "El WhatsApp es obligatorio.");
  assertDescription(trimOrEmpty(args.description));
  assertValidOptionalUrl(trimOrEmpty(args.coverImageUrl), "La imagen principal");
  for (const url of args.galleryImageUrls ?? []) {
    assertValidOptionalUrl(url, "Cada imagen de galeria");
  }
  assertNonNegativePrice(
    args.normalPricePerHour,
    "El precio normal debe ser mayor o igual a 0.",
  );
  assertNonNegativePrice(
    args.peakPricePerHour,
    "El precio pico debe ser mayor o igual a 0.",
  );
  assertNonNegativePrice(
    args.weekendPricePerHour,
    "El precio de fin de semana debe ser mayor o igual a 0.",
  );
  assertPeakWindow(
    args.peakStartMinutes ?? DEFAULT_PEAK_START_MINUTES,
    args.peakEndMinutes ?? DEFAULT_PEAK_END_MINUTES,
  );
}

export const listPublishedClubs = query({
  args: {},
  returns: v.array(publicClubCardValidator),
  handler: async (ctx) => {
    const clubs = await ctx.db
      .query("clubs")
      .withIndex("by_published", (q) =>
        q.eq("isPublished", true).eq("isActive", true),
      )
      .collect();

    const result = await Promise.all(
      clubs.map(async (club) => ({
        _id: club._id,
        _creationTime: club._creationTime,
        name: club.name,
        slug: club.slug,
        city: club.city,
        address: club.address,
        whatsapp: club.whatsapp,
        coverImageUrl: club.coverImageUrl,
        openingHoursText: club.openingHoursText,
        normalPricePerHour: club.normalPricePerHour,
        peakPricePerHour: club.peakPricePerHour,
        weekendPricePerHour: club.weekendPricePerHour,
        isFeatured: club.isFeatured,
        bookingEnabled: club.bookingEnabled,
        activeCourtCount: await countActiveCourts(ctx, club._id),
      })),
    );

    return result.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "es");
    });
  },
});

export const getClubBySlug = query({
  args: { slug: v.string() },
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!club || !club.isActive || !club.isPublished) {
      return null;
    }

    return club;
  },
});

export const getOperationalClubBySlug = query({
  args: { slug: v.string() },
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!club || !club.isActive) {
      return null;
    }

    return club;
  },
});

export const getCurrentUserClubForAdmin = query({
  args: {},
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx) => {
    const { club } = await getCurrentUserClub(ctx);
    return club;
  },
});

export const superAdminListClubs = query({
  args: {},
  returns: v.array(clubWithActiveCourtCountValidator),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const clubs = await ctx.db.query("clubs").collect();
    const result = await Promise.all(
      clubs.map(async (club) => ({
        ...club,
        activeCourtCount: await countActiveCourts(ctx, club._id),
      })),
    );

    return result.sort((a, b) => a.name.localeCompare(b.name, "es"));
  },
});

export const superAdminGetClub = query({
  args: { clubId: v.id("clubs") },
  returns: v.union(clubValidator, v.null()),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await ctx.db.get(args.clubId);
  },
});

export const superAdminGetClubMaster = query({
  args: { clubId: v.id("clubs") },
  returns: clubMasterValidator,
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const clubUsers = await ctx.db
      .query("clubUsers")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
    const master = clubUsers.find(
      (clubUser) =>
        clubUser.role === "club_master" && clubUser.status === "active",
    );

    if (!master) {
      return null;
    }

    const user = await ctx.db.get(master.userId);

    if (!user) {
      return null;
    }

    return {
      clubUserId: master._id,
      role: master.role,
      status: master.status,
      user: publicUser(user),
    };
  },
});

type CreateClubArgs = {
  name: string;
  slug: string;
  city: string;
  state?: string;
  country?: string;
  address: string;
  phone?: string;
  whatsapp: string;
  description?: string;
  coverImageUrl?: string;
  galleryImageUrls?: string[];
  openingHoursText?: string;
  normalPricePerHour: number;
  peakPricePerHour: number;
  weekendPricePerHour: number;
  peakStartMinutes?: number;
  peakEndMinutes?: number;
  isActive?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  bookingEnabled?: boolean;
  openingHours?: Doc<"clubs">["openingHours"];
  pricing?: Doc<"clubs">["pricing"];
};

const superAdminCreateClubArgs = {
  name: v.string(),
  slug: v.string(),
  city: v.string(),
  state: v.optional(v.string()),
  country: v.optional(v.string()),
  address: v.string(),
  phone: v.optional(v.string()),
  whatsapp: v.string(),
  description: v.optional(v.string()),
  coverImageUrl: v.optional(v.string()),
  galleryImageUrls: v.optional(v.array(v.string())),
  openingHoursText: v.optional(v.string()),
  normalPricePerHour: v.number(),
  peakPricePerHour: v.number(),
  weekendPricePerHour: v.number(),
  peakStartMinutes: v.optional(v.number()),
  peakEndMinutes: v.optional(v.number()),
  isActive: v.optional(v.boolean()),
  isPublished: v.optional(v.boolean()),
  isFeatured: v.optional(v.boolean()),
  bookingEnabled: v.optional(v.boolean()),
  openingHours: v.optional(v.array(openingHourValidator)),
  pricing: v.optional(pricingValidator),
};

async function createClubRecord(ctx: MutationCtx, args: CreateClubArgs) {
  assertCreateInput(args);

  const slug = normalizeSlug(args.slug);
  await assertSlugAvailable(ctx, slug);

  const now = Date.now();
  const peakStartMinutes = args.peakStartMinutes ?? DEFAULT_PEAK_START_MINUTES;
  const peakEndMinutes = args.peakEndMinutes ?? DEFAULT_PEAK_END_MINUTES;
  const pricing =
    args.pricing ?? pricingFromFlat({ ...args, peakStartMinutes, peakEndMinutes });

  return await ctx.db.insert("clubs", {
    name: args.name.trim(),
    slug,
    city: args.city.trim(),
    state: trimOrEmpty(args.state) || "Santander",
    country: trimOrEmpty(args.country) || "Colombia",
    address: args.address.trim(),
    phone: trimOrEmpty(args.phone),
    whatsapp: args.whatsapp.trim(),
    description: trimOrEmpty(args.description),
    coverImageUrl: trimOrEmpty(args.coverImageUrl) || defaultCoverImageUrl,
    galleryImageUrls: args.galleryImageUrls ?? [],
    openingHoursText:
      trimOrEmpty(args.openingHoursText) ||
      "Lunes a domingo: 6:00 am - 11:00 pm",
    timezone: BOGOTA_TIMEZONE,
    normalPricePerHour: args.normalPricePerHour,
    peakPricePerHour: args.peakPricePerHour,
    weekendPricePerHour: args.weekendPricePerHour,
    peakStartMinutes,
    peakEndMinutes,
    openingHours: args.openingHours ?? defaultOpeningHours,
    pricing,
    isActive: args.isActive ?? true,
    isPublished: args.isPublished ?? false,
    isFeatured: args.isFeatured ?? false,
    bookingEnabled: args.bookingEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  });
}

export const superAdminCreateClub = mutation({
  args: superAdminCreateClubArgs,
  returns: v.id("clubs"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await createClubRecord(ctx, args);
  },
});

export const superAdminCreateClubInternal = internalMutation({
  args: superAdminCreateClubArgs,
  returns: v.id("clubs"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await createClubRecord(ctx, args);
  },
});

export const superAdminUpdateClub = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    galleryImageUrls: v.optional(v.array(v.string())),
    openingHoursText: v.optional(v.string()),
    normalPricePerHour: v.optional(v.number()),
    peakPricePerHour: v.optional(v.number()),
    weekendPricePerHour: v.optional(v.number()),
    peakStartMinutes: v.optional(v.number()),
    peakEndMinutes: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isPublished: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    bookingEnabled: v.optional(v.boolean()),
    openingHours: v.optional(v.array(openingHourValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const club = await ctx.db.get(args.clubId);

    if (!club) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el club.",
      });
    }

    const updates: Partial<Doc<"clubs">> = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      required(args.name, "El nombre es obligatorio.");
      updates.name = args.name.trim();
    }
    if (args.slug !== undefined) {
      const slug = normalizeSlug(args.slug);
      await assertSlugAvailable(ctx, slug, args.clubId);
      updates.slug = slug;
    }
    if (args.city !== undefined) {
      required(args.city, "La ciudad es obligatoria.");
      updates.city = args.city.trim();
    }
    if (args.state !== undefined) updates.state = args.state.trim();
    if (args.country !== undefined) updates.country = args.country.trim();
    if (args.address !== undefined) {
      required(args.address, "La direccion es obligatoria.");
      updates.address = args.address.trim();
    }
    if (args.phone !== undefined) updates.phone = args.phone.trim();
    if (args.whatsapp !== undefined) {
      required(args.whatsapp, "El WhatsApp es obligatorio.");
      updates.whatsapp = args.whatsapp.trim();
    }
    if (args.description !== undefined) {
      assertDescription(args.description.trim());
      updates.description = args.description.trim();
    }
    if (args.coverImageUrl !== undefined) {
      assertValidOptionalUrl(args.coverImageUrl, "La imagen principal");
      updates.coverImageUrl = args.coverImageUrl.trim();
    }
    if (args.galleryImageUrls !== undefined) {
      for (const url of args.galleryImageUrls) {
        assertValidOptionalUrl(url, "Cada imagen de galeria");
      }
      updates.galleryImageUrls = args.galleryImageUrls;
    }
    if (args.openingHoursText !== undefined) {
      updates.openingHoursText = args.openingHoursText.trim();
    }
    if (args.openingHours !== undefined) updates.openingHours = args.openingHours;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.isPublished !== undefined) updates.isPublished = args.isPublished;
    if (args.isFeatured !== undefined) updates.isFeatured = args.isFeatured;
    if (args.bookingEnabled !== undefined) {
      updates.bookingEnabled = args.bookingEnabled;
    }

    const normalPricePerHour =
      args.normalPricePerHour ?? club.normalPricePerHour;
    const peakPricePerHour = args.peakPricePerHour ?? club.peakPricePerHour;
    const weekendPricePerHour =
      args.weekendPricePerHour ?? club.weekendPricePerHour;
    const peakStartMinutes = args.peakStartMinutes ?? club.peakStartMinutes;
    const peakEndMinutes = args.peakEndMinutes ?? club.peakEndMinutes;

    assertNonNegativePrice(
      normalPricePerHour,
      "El precio normal debe ser mayor o igual a 0.",
    );
    assertNonNegativePrice(
      peakPricePerHour,
      "El precio pico debe ser mayor o igual a 0.",
    );
    assertNonNegativePrice(
      weekendPricePerHour,
      "El precio de fin de semana debe ser mayor o igual a 0.",
    );
    assertPeakWindow(peakStartMinutes, peakEndMinutes);

    updates.normalPricePerHour = normalPricePerHour;
    updates.peakPricePerHour = peakPricePerHour;
    updates.weekendPricePerHour = weekendPricePerHour;
    updates.peakStartMinutes = peakStartMinutes;
    updates.peakEndMinutes = peakEndMinutes;
    updates.pricing = pricingFromFlat({
      normalPricePerHour,
      peakPricePerHour,
      weekendPricePerHour,
      peakStartMinutes,
      peakEndMinutes,
    });

    await ctx.db.patch(args.clubId, updates);
    return null;
  },
});

type AssignClubMasterArgs = {
  clubId: Id<"clubs">;
  email: string;
};

const superAdminAssignClubMasterArgs = {
  clubId: v.id("clubs"),
  email: v.string(),
};

async function assignClubMasterRecord(
  ctx: MutationCtx,
  args: AssignClubMasterArgs,
) {
  const [club, user] = await Promise.all([
    ctx.db.get(args.clubId),
    ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique(),
  ]);

  if (!club) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el club.",
    });
  }

  if (!user) {
    throw new ConvexError({
      code: "USER_NOT_FOUND",
      message: "No encontramos un usuario con ese email.",
    });
  }

  const now = Date.now();
  const existing = await ctx.db
    .query("clubUsers")
    .withIndex("by_user_club", (q) =>
      q.eq("userId", user._id).eq("clubId", args.clubId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      role: "club_master",
      status: "active",
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("clubUsers", {
    clubId: args.clubId,
    userId: user._id,
    role: "club_master",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export const superAdminAssignClubMaster = mutation({
  args: superAdminAssignClubMasterArgs,
  returns: v.id("clubUsers"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await assignClubMasterRecord(ctx, args);
  },
});

export const superAdminAssignClubMasterInternal = internalMutation({
  args: superAdminAssignClubMasterArgs,
  returns: v.id("clubUsers"),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    return await assignClubMasterRecord(ctx, args);
  },
});

export const updateClubSettings = mutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    description: v.optional(v.string()),
    openingHours: v.optional(v.array(openingHourValidator)),
    pricing: v.optional(pricingValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!club) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No encontramos el club.",
      });
    }

    await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);

    const updates: Partial<Doc<"clubs">> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.city !== undefined) updates.city = args.city.trim();
    if (args.address !== undefined) updates.address = args.address.trim();
    if (args.whatsapp !== undefined) updates.whatsapp = args.whatsapp.trim();
    if (args.description !== undefined) {
      updates.description = args.description.trim();
    }
    if (args.openingHours !== undefined) updates.openingHours = args.openingHours;
    if (args.pricing !== undefined) {
      updates.pricing = args.pricing;
      updates.normalPricePerHour = args.pricing.normalPricePerHour;
      updates.peakPricePerHour = args.pricing.peakPricePerHour;
      updates.weekendPricePerHour = args.pricing.weekendPricePerHour;
      updates.peakStartMinutes = args.pricing.peakStartMinutes;
      updates.peakEndMinutes = args.pricing.peakEndMinutes;
    }

    await ctx.db.patch(club._id, updates);
    return null;
  },
});

export const superAdminPublishClub = mutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.clubId, {
      isPublished: true,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const superAdminUnpublishClub = mutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.clubId, {
      isPublished: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const superAdminDeactivateClub = mutation({
  args: { clubId: v.id("clubs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    await ctx.db.patch(args.clubId, {
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});
