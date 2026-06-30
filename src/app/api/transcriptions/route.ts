import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";

// GET /api/transcriptions?page=1&pageSize=20 → the user's history, newest first.
export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20),
  );

  const [total, items] = await Promise.all([
    prisma.transcription.count({ where: { userId } }),
    prisma.transcription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        filename: true,
        language: true,
        diarized: true,
        status: true,
        durationSec: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
