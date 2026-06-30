import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// AES-256-GCM encryption for the Mistral API key at rest (spec §3, §10).
// Key comes from APP_ENCRYPTION_KEY (base64-encoded 32 bytes — generate with
// `npm run gen-keys` or `openssl rand -base64 32`).
//
// Stored format (single string): `${ivB64}:${tagB64}:${ciphertextB64}`.

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, recommended for GCM

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set. Run `npm run gen-keys`.");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

/** Encrypt a plaintext string. Returns `iv:tag:ciphertext` (all base64). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/** Decrypt a value produced by `encrypt`. Throws if tampered or wrong key. */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload.");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}

/**
 * Mask a secret for display — never reveal more than the last 4 chars.
 * e.g. "abcd1234efgh5678" -> "••••••••5678".
 */
export function maskSecret(secret: string): string {
  const last4 = secret.slice(-4);
  return `${"•".repeat(8)}${last4}`;
}

/** Constant-time string compare (used where we compare secrets). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
