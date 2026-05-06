const ENCRYPTION_KEY_ENV = "MERCADOPAGO_TOKEN_ENCRYPTION_KEY";
const LEGACY_ENCRYPTION_KEY_ENV = "MP_TOKEN_ENCRYPTION_KEY";
const SECRET_FORMAT_VERSION = "v1";
const AES_GCM_IV_BYTES = 12;
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export async function encryptSecretString(value: string) {
  const key = await importEncryptionKey();
  const iv = new Uint8Array(AES_GCM_IV_BYTES);
  getCrypto().getRandomValues(iv);
  const encoded = new TextEncoder().encode(value);
  const encrypted = await getCrypto().subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return `${SECRET_FORMAT_VERSION}:${bytesToBase64(iv)}:${bytesToBase64(
    new Uint8Array(encrypted),
  )}`;
}

export async function decryptSecretString(value: string) {
  const key = await importEncryptionKey();
  const parts = value.split(":");

  if (parts.length !== 3 || parts[0] !== SECRET_FORMAT_VERSION) {
    throw new Error("Encrypted secret payload is invalid.");
  }

  try {
    const iv = base64ToBytes(parts[1]);
    const encrypted = base64ToBytes(parts[2]);
    const decrypted = await getCrypto().subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Encrypted secret payload is invalid.");
  }
}

async function importEncryptionKey() {
  const keyBytes = getEncryptionKeyBytes();

  return await getCrypto().subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

function getEncryptionKeyBytes() {
  const raw =
    process.env[ENCRYPTION_KEY_ENV]?.trim() ||
    process.env[LEGACY_ENCRYPTION_KEY_ENV]?.trim();

  if (!raw) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} or ${LEGACY_ENCRYPTION_KEY_ENV} is required.`,
    );
  }

  try {
    const keyBytes = base64ToBytes(raw);

    if (keyBytes.byteLength !== 32) {
      throw new Error("invalid-length");
    }

    return keyBytes;
  } catch {
    throw new Error(`${ENCRYPTION_KEY_ENV} must be base64-encoded 32 bytes.`);
  }
}

function getCrypto() {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.subtle || !cryptoApi.getRandomValues) {
    throw new Error("Web Crypto AES-GCM is required.");
  }

  return cryptoApi;
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

function base64ToBytes(value: string) {
  const normalized = value.trim();

  if (
    normalized.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new Error("invalid-base64");
  }

  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of normalized.replace(/=+$/, "")) {
    const value = BASE64_ALPHABET.indexOf(character);

    if (value === -1) {
      throw new Error("invalid-base64");
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 255);
    }
  }

  return new Uint8Array(output);
}
