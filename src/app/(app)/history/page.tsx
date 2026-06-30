import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { HistoryList } from "@/components/history/history-list";
import { cn } from "@/lib/utils";

export const metadata = { title: "History — Voxtral" };

const PAGE_SIZE = 20;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [total, items] = await Promise.all([
    prisma.transcription.count({ where: { userId } }),
    prisma.transcription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground">
          {total} transcription{total === 1 ? "" : "s"}, newest first.
        </p>
      </div>

      <HistoryList items={items} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Link
            href={`/history?page=${page - 1}`}
            aria-disabled={page <= 1}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page <= 1 && "pointer-events-none opacity-50",
            )}
          >
            Previous
          </Link>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Link
            href={`/history?page=${page + 1}`}
            aria-disabled={page >= totalPages}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              page >= totalPages && "pointer-events-none opacity-50",
            )}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
