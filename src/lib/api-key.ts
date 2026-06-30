import { prisma } from "@/lib/db";
import { decrypt, encrypt, maskSecret } from "@/lib/crypto";

// Server-only helpers for the per-user Mistral API key. The key is encrypted at
// rest (apiKeyEnc) and NEVER returned to the client in plaintext.

/** Save (encrypt) a user's Mistral API key. */
export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  const apiKeyEnc = encrypt(apiKey.trim());
  await prisma.user.update({ where: { id: userId }, data: { apiKeyEnc } });
}

/** Remove a user's stored API key. */
export async function clearApiKey(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { apiKeyEnc: null } });
}

/** Decrypt and return the user's API key, or null if none is set. Server-side use only. */
export async function getApiKey(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiKeyEnc: true },
  });
  if (!user?.apiKeyEnc) return null;
  return decrypt(user.apiKeyEnc);
}

/** Whether the user has an API key configured. */
export async function hasApiKey(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiKeyEnc: true },
  });
  return Boolean(user?.apiKeyEnc);
}

/** A masked view safe to send to the client: { set: boolean, masked: string | null }. */
export async function getMaskedApiKey(
  userId: string,
): Promise<{ set: boolean; masked: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { apiKeyEnc: true },
  });
  if (!user?.apiKeyEnc) return { set: false, masked: null };
  try {
    const plain = decrypt(user.apiKeyEnc);
    return { set: true, masked: maskSecret(plain) };
  } catch {
    // Wrong/rotated APP_ENCRYPTION_KEY — report as set but unreadable.
    return { set: true, masked: null };
  }
}
