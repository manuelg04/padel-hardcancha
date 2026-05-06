import { describe, expect, test } from "vitest";

import {
  buildMercadoPagoConfigConnectionView,
  buildMercadoPagoConnectionMetadata,
  getMercadoPagoOAuthResultMessage,
} from "../lib/mercadoPagoConfigUiRules";

describe("Mercado Pago config UI status", () => {
  test("labels an OAuth connection as connected", () => {
    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: true,
        mercadoPagoConnectionStatus: "connected",
        connectionSource: "oauth",
      }),
    ).toMatchObject({
      kind: "oauth_connected",
      badgeLabel: "Conectado",
      methodLabel: "OAuth",
      primaryActionLabel: "Reconectar",
    });
  });

  test("labels a manual connection as connected manually", () => {
    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: true,
        mercadoPagoConnectionStatus: "connected",
        connectionSource: "manual",
      }),
    ).toMatchObject({
      kind: "manual_connected",
      badgeLabel: "Conectado manualmente",
      methodLabel: "Manual",
      primaryActionLabel: "Reconectar con OAuth",
    });
  });

  test("treats connected legacy status without a source as manual", () => {
    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: true,
        mercadoPagoConnectionStatus: "connected",
        connectionSource: null,
      }).kind,
    ).toBe("manual_connected");
  });

  test("asks for reconnection when the connection is expired or has refresh errors", () => {
    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: false,
        mercadoPagoConnectionStatus: "expired",
        connectionSource: "oauth",
      }),
    ).toMatchObject({
      kind: "reconnect_required",
      badgeLabel: "Requiere reconexión",
      primaryActionLabel: "Reconectar Mercado Pago",
    });

    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: true,
        mercadoPagoConnectionStatus: "connected",
        connectionSource: "oauth",
        refreshError: "invalid_grant",
      }).kind,
    ).toBe("reconnect_required");
  });

  test("shows the connect CTA when there is no connection", () => {
    expect(
      buildMercadoPagoConfigConnectionView({
        mercadoPagoConnected: false,
        mercadoPagoConnectionStatus: "disconnected",
        connectionSource: null,
      }),
    ).toMatchObject({
      kind: "not_connected",
      badgeLabel: "Sin conectar",
      primaryActionLabel: "Conectar Mercado Pago",
    });
  });
});

describe("Mercado Pago OAuth result messages", () => {
  test("maps success and known failure reasons to safe messages", () => {
    expect(
      getMercadoPagoOAuthResultMessage({
        result: "success",
        reason: null,
      }),
    ).toEqual({
      kind: "success",
      message: "Mercado Pago se conectó correctamente.",
    });

    expect(
      getMercadoPagoOAuthResultMessage({
        result: "error",
        reason: "missing_env",
      }),
    ).toEqual({
      kind: "error",
      message: "Mercado Pago OAuth no está configurado en el servidor.",
    });
  });

  test("uses a safe fallback for unknown failure reasons", () => {
    expect(
      getMercadoPagoOAuthResultMessage({
        result: "error",
        reason: "anything_else",
      }),
    ).toEqual({
      kind: "error",
      message: "No pudimos conectar Mercado Pago. Intenta nuevamente.",
    });
  });
});

describe("Mercado Pago safe metadata", () => {
  test("does not expose token or secret fields even if present in input", () => {
    const metadata = buildMercadoPagoConnectionMetadata(
      {
        mercadoPagoConnected: true,
        connectionSource: "oauth",
        mpUserId: "12345",
        liveMode: true,
        accessTokenExpiresAt: 1_777_777_777_000,
        lastRefreshAt: 1_777_000_000_000,
        accessToken: "APP_USR-secret",
        accessTokenEncrypted: "encrypted-secret",
        refreshToken: "refresh-secret",
        refreshTokenEncrypted: "encrypted-refresh",
        clientSecret: "client-secret",
      },
      { formatDate: (value) => `fecha:${value}` },
    );

    expect(metadata).toEqual([
      { label: "Método", value: "OAuth" },
      { label: "Cuenta Mercado Pago", value: "12345" },
      { label: "Modo", value: "Producción" },
      {
        label: "Token vigente hasta",
        value: "fecha:1777777777000",
      },
      {
        label: "Última renovación",
        value: "fecha:1777000000000",
      },
    ]);
    expect(JSON.stringify(metadata)).not.toContain("secret");
  });
});
