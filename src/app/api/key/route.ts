import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/session";
import { saveApiKey, clearApiKey, getMaskedApiKey } from "@/lib/api-key";

const saveSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(8, "That doesn't look like a valid API key.")
    .refine((v) => !/\s/.test(v), "API key must not contain whitespace."),
});

// GET → masked status of the stored key. Never returns the plaintext key.
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const masked = await getMaskedApiKey(userId);
  return NextResponse.json(masked);
}

// POST → encrypt and store the key. Returns only the masked view.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  await saveApiKey(userId, parsed.data.apiKey);
  const masked = await getMaskedApiKey(userId);
  return NextResponse.json(masked, { status: 200 });
}

// DELETE → remove the stored key.
export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await clearApiKey(userId);
  return NextResponse.json({ set: false, masked: null });
}
