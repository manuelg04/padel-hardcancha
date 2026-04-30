const TOKEN_PREFIX = "v1";

function getEncryptionSecret() {
  const secret = process.env.MP_TOKEN_ENCRYPTION_KEY;

  if (!secret || secret.length < 16) {
    throw new Error("MP_TOKEN_ENCRYPTION_KEY is required.");
  }

  return secret;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function getAesKey() {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(getEncryptionSecret()),
  );

  return await crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMercadoPagoToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );

  return `${TOKEN_PREFIX}:${bytesToBase64(iv)}:${bytesToBase64(
    new Uint8Array(encrypted),
  )}`;
}

export async function decryptMercadoPagoToken(encryptedToken: string) {
  const [prefix, ivValue, encryptedValue] = encryptedToken.split(":");

  if (prefix !== TOKEN_PREFIX || !ivValue || !encryptedValue) {
    throw new Error("Invalid Mercado Pago token format.");
  }

  const key = await getAesKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivValue) },
    key,
    base64ToBytes(encryptedValue),
  );

  return new TextDecoder().decode(decrypted);
}
