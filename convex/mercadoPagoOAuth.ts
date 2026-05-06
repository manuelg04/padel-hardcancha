import { ConvexError, v } from "convex/values";

import {
  buildMercadoPagoOAuthConnectionPatch,
  buildMercadoPagoOAuthStateErrorPatch,
  buildMercadoPagoOAuthStateExpiredPatch,
  buildMercadoPagoOAuthStateInsert,
  buildMercadoPagoOAuthStateUsedPatch,
  generateMercadoPagoOAuthState,
  validateMercadoPagoOAuthStateForConsumption,
} from "../lib/mercadoPagoOAuthRules";
import { internalMutation, mutation } from "./_generated/server";
import { getCurrentUserClub, requireClubAccess } from "./access";
import { encryptSecretString } from "./secretCrypto";

export const createMercadoPagoOAuthState = mutation({
  args: {
    redirectAfterSuccess: v.optional(v.string()),
  },
  returns: v.object({
    state: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const { club, userId } = await getCurrentUserClub(ctx);
    await requireClubAccess(ctx, club._id, ["club_master"]);
    const now = Date.now();
    const state = generateMercadoPagoOAuthState();
    const insert = buildMercadoPagoOAuthStateInsert({
      clubId: club._id,
      userId,
      state,
      now,
      redirectAfterSuccess: args.redirectAfterSuccess,
    });

    await ctx.db.insert("mercadoPagoOAuthStates", insert);

    return {
      state,
      expiresAt: insert.expiresAt,
    };
  },
});

export const consumeMercadoPagoOAuthState = internalMutation({
  args: {
    state: v.string(),
  },
  returns: v.object({
    clubId: v.id("clubs"),
    userId: v.id("users"),
    redirectAfterSuccess: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("mercadoPagoOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    const now = Date.now();
    const result = validateMercadoPagoOAuthStateForConsumption(record, now);

    if (!result.ok) {
      if (record && result.expired) {
        await ctx.db.patch(record._id, buildMercadoPagoOAuthStateExpiredPatch());
      }

      throw new ConvexError({
        code: result.code,
        message: result.message,
      });
    }

    await ctx.db.patch(record!._id, buildMercadoPagoOAuthStateUsedPatch(now));

    return {
      clubId: result.clubId,
      userId: result.userId,
      redirectAfterSuccess: result.redirectAfterSuccess,
    };
  },
});

export const markMercadoPagoOAuthStateError = internalMutation({
  args: {
    state: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("mercadoPagoOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();

    if (!record) return null;

    await ctx.db.patch(
      record._id,
      buildMercadoPagoOAuthStateErrorPatch({
        now: Date.now(),
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
      }),
    );

    return null;
  },
});

export const saveMercadoPagoOAuthConnection = internalMutation({
  args: {
    clubId: v.id("clubs"),
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    publicKey: v.optional(v.string()),
    liveMode: v.optional(v.boolean()),
    mpUserId: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    expiresIn: v.number(),
    scope: v.optional(v.string()),
  },
  returns: v.object({
    connectionId: v.id("mercadoPagoConnections"),
    status: v.literal("connected"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const [accessTokenEncrypted, refreshTokenEncrypted] = await Promise.all([
      encryptSecretString(args.accessToken),
      encryptSecretString(args.refreshToken),
    ]);
    const patch = buildMercadoPagoOAuthConnectionPatch({
      now,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      publicKey: args.publicKey,
      liveMode: args.liveMode,
      mpUserId: args.mpUserId,
      tokenType: args.tokenType,
      expiresIn: args.expiresIn,
      scope: args.scope,
      userId: args.userId,
    });
    const existing = await ctx.db
      .query("mercadoPagoConnections")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .unique();

    let connectionId;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      connectionId = existing._id;
    } else {
      connectionId = await ctx.db.insert("mercadoPagoConnections", {
        clubId: args.clubId,
        ...patch,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.clubId, {
      mercadoPagoConnectionStatus: "connected",
      updatedAt: now,
    });

    return {
      connectionId,
      status: "connected" as const,
    };
  },
});
