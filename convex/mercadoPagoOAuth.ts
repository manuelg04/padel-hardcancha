import { ConvexError, v } from "convex/values";

import {
  mapMercadoPagoOAuthStateErrorReason,
  type MercadoPagoOAuthFailureReason,
} from "../lib/mercadoPagoOAuthRouteRules";
import {
  buildMercadoPagoOAuthConnectionPatch,
  buildMercadoPagoOAuthStateErrorPatch,
  buildMercadoPagoOAuthStateExpiredPatch,
  buildMercadoPagoOAuthStateInsert,
  buildMercadoPagoOAuthStateUsedPatch,
  generateMercadoPagoOAuthState,
  validateMercadoPagoOAuthStateForConsumption,
} from "../lib/mercadoPagoOAuthRules";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { getCurrentUserClub, requireClubAccess } from "./access";
import { exchangeMercadoPagoAuthorizationCode } from "./mercadoPagoOAuthClient";
import { encryptSecretString } from "./secretCrypto";

const mercadoPagoOAuthFailureReasonValidator = v.union(
  v.literal("missing_state"),
  v.literal("missing_code"),
  v.literal("invalid_state"),
  v.literal("expired_state"),
  v.literal("used_state"),
  v.literal("provider_error"),
  v.literal("token_exchange_failed"),
  v.literal("save_connection_failed"),
  v.literal("missing_env"),
  v.literal("unauthorized"),
  v.literal("forbidden"),
);

const completeCallbackResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    redirectAfterSuccess: v.optional(v.string()),
  }),
  v.object({
    ok: v.literal(false),
    reason: mercadoPagoOAuthFailureReasonValidator,
    redirectAfterSuccess: v.optional(v.string()),
  }),
);

type CompleteMercadoPagoOAuthCallbackResult =
  | {
      ok: true;
      redirectAfterSuccess?: string;
    }
  | {
      ok: false;
      reason: MercadoPagoOAuthFailureReason;
      redirectAfterSuccess?: string;
    };

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

export const recordMercadoPagoOAuthCallbackError = mutation({
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

export const completeMercadoPagoOAuthCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
    redirectUri: v.string(),
  },
  returns: completeCallbackResultValidator,
  handler: async (ctx, args): Promise<CompleteMercadoPagoOAuthCallbackResult> => {
    let stateResult;

    try {
      stateResult = await ctx.runMutation(
        internal.mercadoPagoOAuth.consumeMercadoPagoOAuthState,
        { state: args.state },
      );
    } catch (error) {
      return {
        ok: false as const,
        reason: mapMercadoPagoOAuthStateErrorReason(readConvexErrorCode(error)),
      };
    }

    let tokens;

    try {
      tokens = await exchangeMercadoPagoAuthorizationCode({
        code: args.code,
        state: args.state,
        redirectUri: args.redirectUri,
      });
    } catch (error) {
      const reason = isMissingEnvError(error)
        ? "missing_env"
        : "token_exchange_failed";
      await markCallbackError(ctx, args.state, reason, error);

      return {
        ok: false as const,
        reason,
        redirectAfterSuccess: stateResult.redirectAfterSuccess,
      };
    }

    if (!tokens.refreshToken) {
      await markCallbackError(
        ctx,
        args.state,
        "token_exchange_failed",
        new Error("Mercado Pago did not return a refresh token."),
      );

      return {
        ok: false as const,
        reason: "token_exchange_failed" as const,
        redirectAfterSuccess: stateResult.redirectAfterSuccess,
      };
    }

    try {
      await ctx.runMutation(
        internal.mercadoPagoOAuth.saveMercadoPagoOAuthConnection,
        {
          clubId: stateResult.clubId,
          userId: stateResult.userId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          publicKey: tokens.publicKey,
          liveMode: tokens.liveMode,
          mpUserId: tokens.mpUserId,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn,
          scope: tokens.scope,
        },
      );
    } catch (error) {
      const reason = isMissingEnvError(error)
        ? "missing_env"
        : "save_connection_failed";
      await markCallbackError(ctx, args.state, reason, error);

      return {
        ok: false as const,
        reason,
        redirectAfterSuccess: stateResult.redirectAfterSuccess,
      };
    }

    return {
      ok: true as const,
      redirectAfterSuccess: stateResult.redirectAfterSuccess,
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

async function markCallbackError(
  ctx: ActionCtx,
  state: string,
  reason: MercadoPagoOAuthFailureReason,
  error: unknown,
) {
  await ctx.runMutation(internal.mercadoPagoOAuth.markMercadoPagoOAuthStateError, {
    state,
    errorCode: reason,
    errorMessage:
      error instanceof Error ? error.message : "Mercado Pago OAuth failed.",
  });
}

function readConvexErrorCode(error: unknown) {
  if (error instanceof ConvexError && typeof error.data === "object") {
    const data = error.data as { code?: unknown };
    return typeof data.code === "string" ? data.code : undefined;
  }

  return undefined;
}

function isMissingEnvError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("MERCADOPAGO_CLIENT_ID is required") ||
    error.message.includes("MERCADOPAGO_CLIENT_SECRET is required") ||
    error.message.includes("MERCADOPAGO_TOKEN_ENCRYPTION_KEY")
  );
}

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
