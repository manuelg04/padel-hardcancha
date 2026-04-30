import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

import { TOKEN_REFRESH_WINDOW_MS } from "../../lib/paymentRules";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import {
  refreshMercadoPagoToken,
} from "../mercadoPagoClient";
import {
  decryptMercadoPagoToken,
  encryptMercadoPagoToken,
} from "../mercadoPagoCrypto";
import type { ConnectionSecret } from "./types";

type Ctx = QueryCtx | MutationCtx;

export async function getActiveConnection(ctx: Ctx, clubId: Id<"clubs">) {
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .unique();

  if (!connection || connection.status !== "connected") {
    throw new ConvexError({
      code: "MERCADOPAGO_NOT_CONNECTED",
      message: "Este club aun no tiene Mercado Pago conectado.",
    });
  }

  return connection;
}

export async function getSellerAccessToken(
  ctx: ActionCtx,
  connection: {
    clubId: Id<"clubs">;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    accessTokenExpiresAt?: number;
  },
) {
  if (
    connection.accessTokenExpiresAt &&
    connection.accessTokenExpiresAt < Date.now() + TOKEN_REFRESH_WINDOW_MS
  ) {
    const refreshToken = await decryptMercadoPagoToken(
      connection.refreshTokenEncrypted,
    );
    const refreshed = await refreshMercadoPagoToken(refreshToken);
    const accessTokenEncrypted = await encryptMercadoPagoToken(
      refreshed.access_token,
    );
    const refreshTokenEncrypted = await encryptMercadoPagoToken(
      refreshed.refresh_token,
    );
    const accessTokenExpiresAt =
      Date.now() + (refreshed.expires_in ?? 15552000) * 1000;

    await ctx.runMutation(internal.payments._storeRefreshedConnection, {
      clubId: connection.clubId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      accessTokenExpiresAt,
      publicKey: refreshed.public_key,
      liveMode: refreshed.live_mode,
      scope: refreshed.scope,
    });

    return refreshed.access_token;
  }

  return await decryptMercadoPagoToken(connection.accessTokenEncrypted);
}

export const storeRefreshedConnectionHandler = async (
  ctx: MutationCtx,
  args: {
    clubId: Id<"clubs">;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    accessTokenExpiresAt: number;
    publicKey?: string;
    liveMode: boolean;
    scope?: string;
  },
) => {
  const connection = await getActiveConnection(ctx, args.clubId);
  await ctx.db.patch(connection._id, {
    accessTokenEncrypted: args.accessTokenEncrypted,
    refreshTokenEncrypted: args.refreshTokenEncrypted,
    accessTokenExpiresAt: args.accessTokenExpiresAt,
    publicKey: args.publicKey ?? connection.publicKey,
    liveMode: args.liveMode,
    scope: args.scope ?? connection.scope,
    lastRefreshAt: Date.now(),
    updatedAt: Date.now(),
  });
  return null;
};

export const refreshMercadoPagoConnectionInternalHandler = async (
  ctx: ActionCtx,
  args: { clubId: Id<"clubs"> },
) => {
  const connection = (await ctx.runQuery(
    internal.payments._getConnectionForWebhook,
    { clubId: args.clubId },
  )) as ConnectionSecret | null;
  if (!connection) return null;

  try {
    await getSellerAccessToken(ctx, connection);
  } catch {
    await ctx.runMutation(internal.payments._markConnectionExpired, {
      clubId: args.clubId,
    });
  }

  return null;
};

export const refreshMercadoPagoConnectionHandler = async (ctx: ActionCtx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Debes iniciar sesion.");
  const { club } = await ctx.runQuery(internal.payments._getUserFirstClub, {
    userId: userId as Id<"users">,
  });
  await ctx.runAction(internal.payments.refreshMercadoPagoConnectionInternal, {
    clubId: club._id,
  });
  return null;
};

export const markConnectionExpiredHandler = async (
  ctx: MutationCtx,
  args: { clubId: Id<"clubs"> },
) => {
  const connection = await ctx.db
    .query("mercadoPagoConnections")
    .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
    .unique();
  const now = Date.now();

  if (connection) {
    await ctx.db.patch(connection._id, {
      status: "expired",
      updatedAt: now,
    });
  }
  await ctx.db.patch(args.clubId, {
    mercadoPagoConnectionStatus: "expired",
    onlinePaymentsEnabled: false,
    updatedAt: now,
  });
  return null;
};

export const listConnectionsNeedingRefreshHandler = async (
  ctx: QueryCtx,
  args: { before: number },
) => {
  const connections = await ctx.db.query("mercadoPagoConnections").collect();

  return connections
    .filter(
      (connection) =>
        connection.status === "connected" &&
        connection.accessTokenExpiresAt !== undefined &&
        connection.accessTokenExpiresAt < args.before,
    )
    .map((connection) => connection.clubId);
};

export const refreshMercadoPagoTokensCronHandler = async (ctx: ActionCtx) => {
  const clubIds = await ctx.runQuery(
    internal.payments._listConnectionsNeedingRefresh,
    { before: Date.now() + TOKEN_REFRESH_WINDOW_MS },
  );

  for (const clubId of clubIds) {
    await ctx.runAction(internal.payments.refreshMercadoPagoConnectionInternal, {
      clubId,
    });
  }

  return null;
};

export const getUserFirstClubHandler = async (
  ctx: QueryCtx,
  args: { userId: Id<"users"> },
) => {
  const clubUsers = await ctx.db
    .query("clubUsers")
    .withIndex("by_user", (q) => q.eq("userId", args.userId))
    .collect();
  const activeClubUser = clubUsers.find((entry) => entry.status === "active");

  if (!activeClubUser) {
    throw new ConvexError("No tienes acceso a ningun club.");
  }

  return { club: { _id: activeClubUser.clubId } };
};
