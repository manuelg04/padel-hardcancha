import { createAccount } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { validateNewClubAdminAccount } from "../lib/clubAdminRules";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
  openingHourValidator,
  pricingValidator,
} from "./validators";

export const superAdminCreateClubWithAdmin = action({
  args: {
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
    masterName: v.string(),
    masterEmail: v.string(),
    masterPhone: v.string(),
    masterPassword: v.string(),
  },
  returns: v.id("clubs"),
  handler: async (ctx, args): Promise<Id<"clubs">> => {
    const adminValidation = validateNewClubAdminAccount({
      name: args.masterName,
      email: args.masterEmail,
      phone: args.masterPhone,
      password: args.masterPassword,
    });

    if (!adminValidation.ok) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: adminValidation.message,
      });
    }

    const admin = adminValidation.account;
    const existingAdmin = await ctx.runQuery(
      internal.users.superAdminFindUserByEmailInternal,
      {
        email: admin.email,
      },
    );

    if (existingAdmin) {
      throw new ConvexError({
        code: "ADMIN_EMAIL_EXISTS",
        message:
          "Ese email ya tiene una cuenta. Usa un email nuevo para el admin del club.",
      });
    }

    const clubId: Id<"clubs"> = await ctx.runMutation(
      internal.clubs.superAdminCreateClubInternal,
      {
        name: args.name,
        slug: args.slug,
        city: args.city,
        state: args.state,
        country: args.country,
        address: args.address,
        phone: args.phone,
        whatsapp: args.whatsapp,
        description: args.description,
        coverImageUrl: args.coverImageUrl,
        galleryImageUrls: args.galleryImageUrls,
        openingHoursText: args.openingHoursText,
        normalPricePerHour: args.normalPricePerHour,
        peakPricePerHour: args.peakPricePerHour,
        weekendPricePerHour: args.weekendPricePerHour,
        peakStartMinutes: args.peakStartMinutes,
        peakEndMinutes: args.peakEndMinutes,
        isActive: args.isActive,
        isPublished: args.isPublished,
        isFeatured: args.isFeatured,
        bookingEnabled: args.bookingEnabled,
        openingHours: args.openingHours,
        pricing: args.pricing,
      },
    );
    const now = Date.now();

    await createAccount(ctx, {
      provider: "password",
      account: {
        id: admin.email,
        secret: admin.password,
      },
      profile: {
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        createdAt: now,
        updatedAt: now,
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });
    await ctx.runMutation(internal.clubs.superAdminAssignClubMasterInternal, {
      clubId,
      email: admin.email,
    });

    return clubId;
  },
});
