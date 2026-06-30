import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { hasApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/db";
import { UploadForm } from "@/components/upload/upload-form";
import { HistoryList } from "@/components/history/history-list";

export default async function DashboardPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const [keySet, recent] = await Promise.all([
    hasApiKey(userId),
    prisma.transcription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        filename: true,
        language: true,
        status: true,
        durationSec: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Upload audio to transcribe with Voxtral.</p>
      </div>

      <UploadForm hasApiKey={keySet} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent</h2>
          {recent.length > 0 && (
            <Link href="/history" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        <HistoryList items={recent} />
      </section>
    </div>
  );
}
