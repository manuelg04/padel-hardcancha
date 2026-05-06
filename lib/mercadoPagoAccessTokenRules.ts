import { sanitizeMercadoPagoOAuthMessage } from "./mercadoPagoOAuthRules";

export type MercadoPagoConnectionSource = "manual" | "oauth";
export type MercadoPagoConnectionStatus =
  | "connected"
  | "disconnected"
  | "expired"
  | "error";

export const MERCADO_PAGO_REFRESH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const MERCADO_PAGO_RECONNECT_MESSAGE =
  "Mercado Pago no esta conectado o requiere reconexion.";

export type MercadoPagoConnectionTokenLike = {
  status?: MercadoPagoConnectionStatus;
  connectionSource?: MercadoPagoConnectionSource;
  accessToken?: string;
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  accessTokenExpiresAt?: number;
  mpUserId?: string;
  liveMode?: boolean;
  lastRefreshAt?: number;
  refreshError?: string;
  refreshErrorAt?: number;
};

export function getMercadoPagoConnectionSource(
  connection: MercadoPagoConnectionTokenLike | null | undefined,
) {
  if (!connection) return undefined;
  if (connection.connectionSource) return connection.connectionSource;
  if (connection.accessToken?.trim()) return "manual";

  return undefined;
}

export function hasUsableMercadoPagoConnection(
  connection: MercadoPagoConnectionTokenLike | null | undefined,
) {
  if (!connection || connection.status !== "connected") return false;

  const source = getMercadoPagoConnectionSource(connection);

  if (source === "manual") {
    return Boolean(connection.accessToken?.trim());
  }

  if (source === "oauth") {
    return Boolean(connection.accessTokenEncrypted?.trim());
  }

  return false;
}

export function shouldRefreshMercadoPagoOAuthAccessToken(args: {
  now: number;
  expiresAt?: number;
  forceRefresh?: boolean;
}) {
  if (args.forceRefresh) return true;
  if (!Number.isFinite(args.expiresAt)) return true;

  return args.expiresAt! <= args.now + MERCADO_PAGO_REFRESH_WINDOW_MS;
}

export function validateMercadoPagoOAuthTokenFields(
  connection: Pick<
    MercadoPagoConnectionTokenLike,
    "accessTokenEncrypted" | "refreshTokenEncrypted"
  >,
  options: { requireRefreshToken: boolean },
):
  | { ok: true }
  | {
      ok: false;
      code: "MERCADOPAGO_RECONNECT_REQUIRED";
      message: string;
      status: Extract<MercadoPagoConnectionStatus, "expired" | "error">;
    } {
  if (!connection.accessTokenEncrypted?.trim()) {
    return {
      ok: false,
      code: "MERCADOPAGO_RECONNECT_REQUIRED",
      message: MERCADO_PAGO_RECONNECT_MESSAGE,
      status: "expired",
    };
  }

  if (options.requireRefreshToken && !connection.refreshTokenEncrypted?.trim()) {
    return {
      ok: false,
      code: "MERCADOPAGO_RECONNECT_REQUIRED",
      message: MERCADO_PAGO_RECONNECT_MESSAGE,
      status: "expired",
    };
  }

  return { ok: true };
}

export function buildMercadoPagoRefreshSuccessPatch(args: {
  now: number;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresIn: number;
  publicKey?: string;
  liveMode?: boolean;
  mpUserId?: string;
  tokenType?: string;
  scope?: string;
}) {
  if (!Number.isFinite(args.expiresIn) || args.expiresIn <= 0) {
    throw new Error("Mercado Pago OAuth expiration is invalid.");
  }

  return {
    status: "connected" as const,
    connectionSource: "oauth" as const,
    accessToken: undefined,
    accessTokenEncrypted: args.accessTokenEncrypted,
    refreshTokenEncrypted: args.refreshTokenEncrypted,
    accessTokenExpiresAt: args.now + args.expiresIn * 1000,
    ...(args.publicKey !== undefined ? { publicKey: args.publicKey } : {}),
    ...(args.liveMode !== undefined ? { liveMode: args.liveMode } : {}),
    ...(args.mpUserId !== undefined
      ? { mpUserId: args.mpUserId, collectorId: args.mpUserId }
      : {}),
    ...(args.tokenType !== undefined ? { tokenType: args.tokenType } : {}),
    ...(args.scope !== undefined ? { scope: args.scope } : {}),
    lastRefreshAt: args.now,
    refreshError: undefined,
    refreshErrorAt: undefined,
    lastValidatedAt: args.now,
    updatedAt: args.now,
  };
}

export function buildMercadoPagoRefreshFailurePatch(args: {
  now: number;
  status: Extract<MercadoPagoConnectionStatus, "expired" | "error">;
  errorMessage: string;
}) {
  return {
    status: args.status,
    refreshError: sanitizeMercadoPagoOAuthMessage(args.errorMessage),
    refreshErrorAt: args.now,
    lastValidatedAt: args.now,
    updatedAt: args.now,
  };
}

export function classifyMercadoPagoRefreshFailureStatus(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("invalid_grant") ||
    message.includes("invalid refresh") ||
    message.includes("refresh token expired") ||
    message.includes("refresh token revoked") ||
    message.includes("status 401")
  ) {
    return "expired" as const;
  }

  return "error" as const;
}

export function shouldRetryMercadoPagoUnauthorizedOperation(
  connectionSource: MercadoPagoConnectionSource,
) {
  return connectionSource === "oauth";
}

export function buildMercadoPagoSafeConnectionStatusFields(
  connection: MercadoPagoConnectionTokenLike | null | undefined,
) {
  const source = getMercadoPagoConnectionSource(connection);

  return {
    connectionSource: source ?? null,
    mpUserId: connection?.mpUserId ?? null,
    liveMode: connection?.liveMode ?? null,
    accessTokenExpiresAt: connection?.accessTokenExpiresAt ?? null,
    lastRefreshAt: connection?.lastRefreshAt ?? null,
    refreshError: connection?.refreshError ?? null,
    refreshErrorAt: connection?.refreshErrorAt ?? null,
  };
}
