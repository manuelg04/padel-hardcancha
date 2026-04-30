import { ConvexError } from "convex/values";

import {
  getPaymentHoldMinutes,
  OAUTH_STATE_TTL_MS,
} from "../../lib/paymentRules";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import {
  getCurrentUserClub,
  requireClubAccess,
  requireSuperAdmin,
} from "../access";
import {
  buildMercadoPagoOAuthUrl,
  exchangeMercadoPagoOAuthCode,
  getMercadoPagoEnvironment,
} from "../mercadoPagoClient";
import { encryptMercadoPagoToken } from "../mercadoPagoCrypto";
import type { PendingOAuthState } from "./types";

export const getClubMercadoPagoStatusHandler = async (ctx: QueryCtx) => {
  const { club, clubUser } = await getCurrentUserClub(ctx);
  await requireClubAccess(ctx, club._id, ["club_master", "club_staff"]);
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", club._id))
    .unique();

  return {
    clubId: club._id,
    onlinePaymentsEnabled: club.onlinePaymentsEnabled ?? false,
    onlinePaymentRequired: club.onlinePaymentRequired ?? false,
    paymentHoldMinutes: getPaymentHoldMinutes(club.paymentHoldMinutes),
    allowOfflineMercadoPagoMethods:
      club.allowOfflineMercadoPagoMethods ?? false,
    status:
      connection?.status ?? club.mercadoPagoConnectionStatus ?? "disconnected",
    environment: connection?.environment,
    collectorId: connection?.collectorId,
    connectedAt: connection?.connectedAt,
    lastRefreshAt: connection?.lastRefreshAt,
    accessTokenExpiresAt: connection?.accessTokenExpiresAt,
    canManageConnection: clubUser.role === "club_master",
  };
};

export const getClubMercadoPagoPublicStatusHandler = async (
  ctx: QueryCtx,
  args: { clubSlug: string },
) => {
  const club = await ctx.db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", args.clubSlug))
    .unique();

  if (!club || !club.isActive || !club.isPublished) {
    return {
      onlinePaymentsEnabled: false,
      onlinePaymentRequired: false,
      paymentHoldMinutes: getPaymentHoldMinutes(),
      connected: false,
    };
  }

  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", club._id))
    .unique();
  const connected = connection?.status === "connected";

  return {
    onlinePaymentsEnabled: (club.onlinePaymentsEnabled ?? false) && connected,
    onlinePaymentRequired: club.onlinePaymentRequired ?? false,
    paymentHoldMinutes: getPaymentHoldMinutes(club.paymentHoldMinutes),
    connected,
  };
};

export const updateClubPaymentSettingsHandler = async (
  ctx: MutationCtx,
  args: {
    onlinePaymentsEnabled: boolean;
    onlinePaymentRequired: boolean;
    paymentHoldMinutes: number;
    allowOfflineMercadoPagoMethods: boolean;
  },
) => {
  const { club } = await getCurrentUserClub(ctx);
  await requireClubAccess(ctx, club._id, ["club_master"]);

  if (args.paymentHoldMinutes < 5 || args.paymentHoldMinutes > 60) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "El tiempo de pago debe estar entre 5 y 60 minutos.",
    });
  }

  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", club._id))
    .unique();

  if (args.onlinePaymentsEnabled && connection?.status !== "connected") {
    throw new ConvexError({
      code: "MERCADOPAGO_NOT_CONNECTED",
      message: "Conecta Mercado Pago antes de activar pagos online.",
    });
  }

  await ctx.db.patch(club._id, {
    onlinePaymentsEnabled: args.onlinePaymentsEnabled,
    onlinePaymentRequired: args.onlinePaymentRequired,
    paymentHoldMinutes: args.paymentHoldMinutes,
    allowOfflineMercadoPagoMethods: args.allowOfflineMercadoPagoMethods,
    updatedAt: Date.now(),
  });

  return null;
};

export const startMercadoPagoOAuthHandler = async (
  ctx: MutationCtx,
  args: { state: string },
) => {
  if (args.state.length < 24) {
    throw new ConvexError({
      code: "INVALID_STATE",
      message: "No pudimos iniciar la conexion de Mercado Pago.",
    });
  }

  const { club, userId } = await getCurrentUserClub(ctx);
  await requireClubAccess(ctx, club._id, ["club_master"]);
  const now = Date.now();

  await ctx.db.insert("mercadoPagoOAuthStates", {
    clubId: club._id,
    userId,
    state: args.state,
    status: "pending",
    expiresAt: now + OAUTH_STATE_TTL_MS,
    createdAt: now,
  });
  await ctx.db.insert("auditLogs", {
    clubId: club._id,
    userId,
    action: "mercadopago.oauth_started",
    entityType: "club",
    entityId: club._id,
    createdAt: now,
  });

  return { authUrl: buildMercadoPagoOAuthUrl(args.state) };
};

export const disconnectMercadoPagoHandler = async (ctx: MutationCtx) => {
  const { club, userId } = await getCurrentUserClub(ctx);
  await requireClubAccess(ctx, club._id, ["club_master"]);
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", club._id))
    .unique();
  const now = Date.now();

  if (connection) {
    await ctx.db.patch(connection._id, {
      status: "disconnected",
      disconnectedAt: now,
      updatedAt: now,
    });
  }

  await ctx.db.patch(club._id, {
    mercadoPagoConnectionStatus: "disconnected",
    onlinePaymentsEnabled: false,
    onlinePaymentRequired: false,
    updatedAt: now,
  });
  await ctx.db.insert("auditLogs", {
    clubId: club._id,
    userId,
    action: "mercadopago.disconnected",
    entityType: "mercadoPagoConnection",
    entityId: connection?._id,
    createdAt: now,
  });

  return null;
};

export const completeMercadoPagoOAuthHandler = async (
  ctx: ActionCtx,
  args: { code: string; state: string },
): Promise<{ clubId: Id<"clubs"> }> => {
  const state = (await ctx.runQuery(internal.payments._getPendingOAuthState, {
    state: args.state,
    now: Date.now(),
  })) as PendingOAuthState | null;

  if (!state) {
    throw new Error("Invalid or expired Mercado Pago OAuth state.");
  }

  const tokenResponse = await exchangeMercadoPagoOAuthCode(args.code);
  const [accessTokenEncrypted, refreshTokenEncrypted] = await Promise.all([
    encryptMercadoPagoToken(tokenResponse.access_token),
    encryptMercadoPagoToken(tokenResponse.refresh_token),
  ]);

  await ctx.runMutation(internal.payments._completeOAuthConnection, {
    oauthStateId: state._id,
    clubId: state.clubId,
    userId: state.userId,
    collectorId: String(tokenResponse.user_id),
    publicKey: tokenResponse.public_key,
    accessTokenEncrypted,
    refreshTokenEncrypted,
    accessTokenExpiresAt:
      Date.now() + (tokenResponse.expires_in ?? 15552000) * 1000,
    liveMode: tokenResponse.live_mode,
    scope: tokenResponse.scope,
    environment: getMercadoPagoEnvironment(),
  });

  return { clubId: state.clubId };
};

export const getPendingOAuthStateHandler = async (
  ctx: QueryCtx,
  args: { state: string; now: number },
) => {
  const state = await ctx.db
    .query("mercadoPagoOAuthStates")
    .withIndex("by_state", (q) => q.eq("state", args.state))
    .unique();

  if (!state || state.status !== "pending") return null;
  if (state.expiresAt < args.now) return null;

  return {
    _id: state._id,
    clubId: state.clubId,
    userId: state.userId,
  };
};

export const completeOAuthConnectionHandler = async (
  ctx: MutationCtx,
  args: {
    oauthStateId: Id<"mercadoPagoOAuthStates">;
    clubId: Id<"clubs">;
    userId: Id<"users">;
    collectorId: string;
    publicKey?: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    accessTokenExpiresAt: number;
    liveMode: boolean;
    scope?: string;
    environment: "sandbox" | "production";
  },
) => {
  const now = Date.now();
  const existing = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
    .unique();

  const connection = {
    clubId: args.clubId,
    status: "connected" as const,
    environment: args.environment,
    collectorId: args.collectorId,
    publicKey: args.publicKey,
    accessTokenEncrypted: args.accessTokenEncrypted,
    refreshTokenEncrypted: args.refreshTokenEncrypted,
    accessTokenExpiresAt: args.accessTokenExpiresAt,
    liveMode: args.liveMode,
    scope: args.scope,
    connectedByUserId: args.userId,
    connectedAt: now,
    disconnectedAt: undefined,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, connection);
  } else {
    await ctx.db.insert("mercadoPagoConnections", {
      ...connection,
      createdAt: now,
    });
  }

  await ctx.db.patch(args.oauthStateId, {
    status: "used",
    usedAt: now,
  });
  await ctx.db.patch(args.clubId, {
    mercadoPagoConnectionStatus: "connected",
    updatedAt: now,
  });
  await ctx.db.insert("auditLogs", {
    clubId: args.clubId,
    userId: args.userId,
    action: "mercadopago.connected",
    entityType: "mercadoPagoConnection",
    metadata: { collectorId: args.collectorId, environment: args.environment },
    createdAt: now,
  });

  return null;
};

export const superAdminGetClubPaymentStatusHandler = async (
  ctx: QueryCtx,
  args: { clubId: Id<"clubs"> },
) => {
  await requireSuperAdmin(ctx);
  const club = await ctx.db.get(args.clubId);
  if (!club) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "No encontramos el club.",
    });
  }
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
    .unique();

  return {
    status:
      connection?.status ?? club.mercadoPagoConnectionStatus ?? "disconnected",
    onlinePaymentsEnabled: club.onlinePaymentsEnabled ?? false,
    onlinePaymentRequired: club.onlinePaymentRequired ?? false,
    paymentHoldMinutes: getPaymentHoldMinutes(club.paymentHoldMinutes),
    collectorId: connection?.collectorId,
    connectedAt: connection?.connectedAt,
    lastRefreshAt: connection?.lastRefreshAt,
  };
};
