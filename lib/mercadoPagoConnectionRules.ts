export type MercadoPagoConnectionInput = {
  accessToken: string;
  collectorId?: string;
};

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
