export type MercadoPagoConfigConnectionSource = "manual" | "oauth";

export type MercadoPagoConfigStatusInput = {
  mercadoPagoConnected: boolean;
  mercadoPagoConnectionStatus?: string | null;
  connectionSource?: MercadoPagoConfigConnectionSource | null;
  collectorId?: string | null;
  mpUserId?: string | null;
  liveMode?: boolean | null;
  accessTokenExpiresAt?: number | null;
  lastRefreshAt?: number | null;
  refreshError?: string | null;
  refreshErrorAt?: number | null;
  [key: string]: unknown;
};

export type MercadoPagoConfigConnectionView = {
  kind:
    | "not_connected"
    | "oauth_connected"
    | "manual_connected"
    | "reconnect_required";
  badgeLabel: string;
  methodLabel: string;
  message: string;
  primaryActionLabel: string;
};

export type MercadoPagoOAuthResultMessage = {
  kind: "success" | "error";
  message: string;
};

const oauthErrorMessages: Record<string, string> = {
  missing_state: "No pudimos verificar la conexión. Intenta nuevamente.",
  missing_code: "Mercado Pago no devolvió la autorización. Intenta nuevamente.",
  invalid_state: "La solicitud de conexión no es válida. Intenta nuevamente.",
  expired_state: "La conexión expiró. Intenta nuevamente.",
  used_state: "Esta solicitud de conexión ya fue procesada.",
  provider_error: "Mercado Pago no autorizó la conexión.",
  token_exchange_failed: "No pudimos completar la conexión con Mercado Pago.",
  save_connection_failed: "No pudimos guardar la conexión.",
  missing_env: "Mercado Pago OAuth no está configurado en el servidor.",
  unauthorized: "Debes iniciar sesión para conectar Mercado Pago.",
  forbidden: "No tienes permisos para conectar Mercado Pago.",
};

export function buildMercadoPagoConfigConnectionView(
  status: MercadoPagoConfigStatusInput,
): MercadoPagoConfigConnectionView {
  if (requiresMercadoPagoReconnect(status)) {
    return {
      kind: "reconnect_required",
      badgeLabel: "Requiere reconexión",
      methodLabel: formatMercadoPagoConnectionSourceLabel(
        resolveMercadoPagoConnectionSource(status),
      ),
      message:
        "La conexión con Mercado Pago requiere reconexión. Para continuar recibiendo pagos online, vuelve a conectar la cuenta del club.",
      primaryActionLabel: "Reconectar Mercado Pago",
    };
  }

  if (!status.mercadoPagoConnected) {
    return {
      kind: "not_connected",
      badgeLabel: "Sin conectar",
      methodLabel: "No disponible",
      message:
        "Conecta tu cuenta de Mercado Pago para recibir directamente los anticipos y pagos online de tus reservas. El dinero va a la cuenta del club; la plataforma solo registra el estado de la transacción para conciliación.",
      primaryActionLabel: "Conectar Mercado Pago",
    };
  }

  const source = resolveMercadoPagoConnectionSource(status);

  if (source === "oauth") {
    return {
      kind: "oauth_connected",
      badgeLabel: "Conectado",
      methodLabel: "OAuth",
      message:
        "Tu cuenta Mercado Pago está conectada de forma segura. Los pagos online se procesan directamente en la cuenta del club.",
      primaryActionLabel: "Reconectar",
    };
  }

  return {
    kind: "manual_connected",
    badgeLabel: "Conectado manualmente",
    methodLabel: "Manual",
    message:
      "Esta conexión usa un access token pegado manualmente. Funciona, pero recomendamos reconectar con OAuth para mayor seguridad y renovación automática.",
    primaryActionLabel: "Reconectar con OAuth",
  };
}

export function getMercadoPagoOAuthResultMessage(args: {
  result?: string | null;
  reason?: string | null;
}): MercadoPagoOAuthResultMessage | null {
  if (args.result === "success") {
    return {
      kind: "success",
      message: "Mercado Pago se conectó correctamente.",
    };
  }

  if (args.result !== "error") return null;

  return {
    kind: "error",
    message:
      oauthErrorMessages[args.reason ?? ""] ??
      "No pudimos conectar Mercado Pago. Intenta nuevamente.",
  };
}

export function buildMercadoPagoConnectionMetadata(
  status: MercadoPagoConfigStatusInput,
  options: { formatDate?: (value: number | null | undefined) => string } = {},
) {
  const source = resolveMercadoPagoConnectionSource(status);
  const formatDate = options.formatDate ?? formatMercadoPagoConfigDate;
  const accountId = status.mpUserId?.trim() || status.collectorId?.trim() || null;

  if (source === "oauth") {
    return [
      { label: "Método", value: "OAuth" },
      {
        label: "Cuenta Mercado Pago",
        value: accountId ?? "No disponible",
      },
      {
        label: "Modo",
        value:
          status.liveMode === true
            ? "Producción"
            : status.liveMode === false
              ? "Sandbox"
              : "No disponible",
      },
      {
        label: "Token vigente hasta",
        value: formatDate(status.accessTokenExpiresAt),
      },
      {
        label: "Última renovación",
        value: formatDate(status.lastRefreshAt),
      },
    ];
  }

  if (source === "manual") {
    return [
      { label: "Método", value: "Manual" },
      {
        label: "Cuenta Mercado Pago",
        value: accountId ?? "No disponible",
      },
    ];
  }

  return [{ label: "Método", value: "No disponible" }];
}

export function formatMercadoPagoConfigDate(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

export function formatMercadoPagoConnectionStatusLabel(
  value: string | null | undefined,
) {
  const labels: Record<string, string> = {
    connected: "Conectado",
    disconnected: "Desconectado",
    expired: "Expirado",
    error: "Error",
  };
  const status = value?.trim();

  if (!status) return "No disponible";

  return labels[status] ?? readableLabel(status);
}

export function formatMercadoPagoConnectionSourceLabel(
  value: MercadoPagoConfigConnectionSource | null | undefined,
) {
  if (value === "oauth") return "OAuth";
  if (value === "manual") return "Manual";
  return "No disponible";
}

export function requiresMercadoPagoReconnect(status: MercadoPagoConfigStatusInput) {
  const connectionStatus = status.mercadoPagoConnectionStatus?.trim();

  return (
    connectionStatus === "expired" ||
    connectionStatus === "error" ||
    Boolean(status.refreshError?.trim())
  );
}

export function resolveMercadoPagoConnectionSource(
  status: MercadoPagoConfigStatusInput,
): MercadoPagoConfigConnectionSource | null {
  if (status.connectionSource === "oauth" || status.connectionSource === "manual") {
    return status.connectionSource;
  }

  if (status.mercadoPagoConnected) return "manual";

  return null;
}

function readableLabel(value: string) {
  const readable = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return readable ? readable[0].toUpperCase() + readable.slice(1) : "No disponible";
}
