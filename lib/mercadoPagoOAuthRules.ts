export type MercadoPagoOAuthStateStatus =
  | "pending"
  | "used"
  | "expired"
  | "cancelled";

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export type MercadoPagoOAuthStateLike<ClubId extends string, UserId extends string> = {
  status: MercadoPagoOAuthStateStatus;
  expiresAt: number;
  clubId: ClubId;
  userId: UserId;
  redirectAfterSuccess?: string;
};

export function generateMercadoPagoOAuthState() {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random generation is required for Mercado Pago OAuth.");
  }

  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);

  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildMercadoPagoOAuthStateInsert<
  ClubId extends string,
  UserId extends string,
>(args: {
  clubId: ClubId;
  userId: UserId;
  state: string;
  now: number;
  redirectAfterSuccess?: string;
}) {
  const redirectAfterSuccess = normalizeRedirectAfterSuccess(
    args.redirectAfterSuccess,
  );
  const insert = {
    clubId: args.clubId,
    userId: args.userId,
    state: args.state,
    status: "pending" as const,
    expiresAt: args.now + 10 * 60 * 1000,
    createdAt: args.now,
  };

  if (redirectAfterSuccess) {
    return { ...insert, redirectAfterSuccess };
  }

  return insert;
}

export function validateMercadoPagoOAuthStateForConsumption<
  ClubId extends string,
  UserId extends string,
>(
  state: MercadoPagoOAuthStateLike<ClubId, UserId> | null,
  now: number,
):
  | {
      ok: true;
      clubId: ClubId;
      userId: UserId;
      redirectAfterSuccess?: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      expired?: boolean;
    } {
  if (!state) {
    return {
      ok: false,
      code: "OAUTH_STATE_INVALID",
      message: "La solicitud de Mercado Pago no es valida.",
    };
  }

  if (state.status !== "pending") {
    return {
      ok: false,
      code: "OAUTH_STATE_NOT_PENDING",
      message: "La solicitud de Mercado Pago ya fue procesada.",
    };
  }

  if (state.expiresAt <= now) {
    return {
      ok: false,
      code: "OAUTH_STATE_EXPIRED",
      message: "La solicitud de Mercado Pago expiro.",
      expired: true,
    };
  }

  return {
    ok: true,
    clubId: state.clubId,
    userId: state.userId,
    redirectAfterSuccess: state.redirectAfterSuccess,
  };
}

export function buildMercadoPagoOAuthStateUsedPatch(now: number) {
  return {
    status: "used" as const,
    usedAt: now,
  };
}

export function buildMercadoPagoOAuthStateExpiredPatch() {
  return {
    status: "expired" as const,
  };
}

export function buildMercadoPagoOAuthStateErrorPatch(args: {
  now: number;
  errorCode: string;
  errorMessage: string;
}) {
  return {
    status: "cancelled" as const,
    errorCode: sanitizeMercadoPagoOAuthErrorCode(args.errorCode),
    errorMessage: sanitizeMercadoPagoOAuthMessage(args.errorMessage),
    cancelledAt: args.now,
  };
}

export function buildMercadoPagoOAuthConnectionPatch<UserId extends string>(args: {
  now: number;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  publicKey?: string;
  liveMode?: boolean;
  mpUserId?: string;
  tokenType?: string;
  expiresIn: number;
  scope?: string;
  userId: UserId;
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
    refreshTokenExpiresAt: undefined,
    publicKey: args.publicKey,
    liveMode: args.liveMode,
    scope: args.scope,
    mpUserId: args.mpUserId,
    collectorId: args.mpUserId,
    tokenType: args.tokenType,
    connectedByUserId: args.userId,
    connectedAt: args.now,
    lastRefreshAt: undefined,
    refreshError: undefined,
    refreshErrorAt: undefined,
    lastValidatedAt: args.now,
    disconnectedAt: undefined,
    updatedAt: args.now,
  };
}

export function sanitizeMercadoPagoOAuthErrorCode(value: string) {
  const safe = value.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
  return safe || "oauth_error";
}

export function sanitizeMercadoPagoOAuthMessage(value: string) {
  return value
    .replace(/\b(client_secret|access_token|refresh_token|code)=[^\s&]+/gi, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, "[redacted]")
    .replace(/\b(APP_USR|TEST|APP)-[A-Za-z0-9._-]+/g, "[redacted]")
    .trim()
    .slice(0, 280);
}

function normalizeRedirectAfterSuccess(value?: string) {
  const redirect = value?.trim();

  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return undefined;
  }

  return redirect.slice(0, 240);
}

function bytesToBase64(bytes: Uint8Array) {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    output += BASE64_ALPHABET[first >> 2];
    output += BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output +=
      second === undefined
        ? "="
        : BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : BASE64_ALPHABET[third & 63];
  }

  return output;
}
