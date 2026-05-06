import { afterEach, describe, expect, test, vi } from "vitest";

import {
  decryptSecretString,
  encryptSecretString,
} from "../convex/secretCrypto";

const validKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

describe("Mercado Pago token encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("encrypts and decrypts a sensitive string", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", validKey);

    const encrypted = await encryptSecretString("APP_USR-secret-token");

    await expect(decryptSecretString(encrypted)).resolves.toBe(
      "APP_USR-secret-token",
    );
  });

  test("uses a random IV for each encryption", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", validKey);

    const first = await encryptSecretString("APP_USR-secret-token");
    const second = await encryptSecretString("APP_USR-secret-token");

    expect(first).not.toBe(second);
  });

  test("does not include the original secret in the ciphertext", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", validKey);

    const encrypted = await encryptSecretString("APP_USR-secret-token");

    expect(encrypted).not.toContain("APP_USR-secret-token");
  });

  test("fails when the encryption key is missing", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", "");

    await expect(encryptSecretString("APP_USR-secret-token")).rejects.toThrow(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY is required.",
    );
  });

  test("fails when the encryption key is invalid", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", "not-valid-base64");

    await expect(encryptSecretString("APP_USR-secret-token")).rejects.toThrow(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY must be base64-encoded 32 bytes.",
    );
  });

  test("fails when the encrypted payload is corrupt", async () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", validKey);

    await expect(decryptSecretString("v1:not-base64:still-bad")).rejects.toThrow(
      "Encrypted secret payload is invalid.",
    );
  });
});
