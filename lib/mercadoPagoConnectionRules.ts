export type MercadoPagoConnectionInput = {
  accessToken: string;
  collectorId?: string;
};

export type MercadoPagoConnectionSource = "manual" | "oauth";

export type MercadoPagoConnectionResult =
  | {
      ok: true;
      accessToken: string;
      collectorId?: string;
    }
  | {
      ok: false;
      message: string;
    };

export function normalizeMercadoPagoConnectionInput(
  input: MercadoPagoConnectionInput,
): MercadoPagoConnectionResult {
  const accessToken = input.accessToken.trim();

  if (!accessToken) {
    return {
      ok: false,
      message: "Ingresa el access token de Mercado Pago del club.",
    };
  }

  const collectorId = input.collectorId?.trim();

  if (collectorId) {
    return { ok: true, accessToken, collectorId };
  }

  return { ok: true, accessToken };
}

export function buildManualMercadoPagoConnectionPatch<UserId extends string>(args: {
  accessToken: string;
  collectorId?: string;
  userId?: UserId;
  now: number;
  existingConnectedAt?: number;
}) {
  const patch = {
    status: "connected" as const,
    accessToken: args.accessToken,
    connectionSource: "manual" as const,
    connectedByUserId: args.userId,
    connectedAt: args.existingConnectedAt ?? args.now,
    accessTokenEncrypted: undefined,
    refreshTokenEncrypted: undefined,
    accessTokenExpiresAt: undefined,
    refreshTokenExpiresAt: undefined,
    publicKey: undefined,
    liveMode: undefined,
    scope: undefined,
    mpUserId: undefined,
    tokenType: undefined,
    refreshError: undefined,
    refreshErrorAt: undefined,
    lastRefreshAt: undefined,
    lastValidatedAt: undefined,
    disconnectedAt: undefined,
    updatedAt: args.now,
  };

  if (args.collectorId) {
    return { ...patch, collectorId: args.collectorId };
  }

  return patch;
}

export function buildMercadoPagoDisconnectPatch(now: number) {
  return {
    status: "disconnected" as const,
    collectorId: undefined,
    accessToken: undefined,
    accessTokenEncrypted: undefined,
    refreshTokenEncrypted: undefined,
    publicKey: undefined,
    accessTokenExpiresAt: undefined,
    refreshTokenExpiresAt: undefined,
    liveMode: undefined,
    scope: undefined,
    mpUserId: undefined,
    tokenType: undefined,
    lastRefreshAt: undefined,
    refreshError: undefined,
    refreshErrorAt: undefined,
    lastValidatedAt: undefined,
    disconnectedAt: now,
    updatedAt: now,
  };
}
