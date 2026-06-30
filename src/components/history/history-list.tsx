import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { languageLabel } from "@/lib/validation";
import { formatTimestamp } from "@/lib/transcript";

export interface HistoryItem {
  id: string;
  filename: string;
  language: string | null;
  status: string;
  durationSec: number | null;
  createdAt: Date;
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        No transcriptions yet. Upload audio from the dashboard to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="hidden md:table-cell">Language</TableHead>
            <TableHead className="hidden md:table-cell">Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => (
            <TableRow key={t.id} className="group">
              <TableCell className="max-w-[16rem] font-medium">
                <Link href={`/transcription/${t.id}`} className="block truncate hover:underline">
                  {t.filename}
                </Link>
                <span className="text-xs text-muted-foreground sm:hidden">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                {new Date(t.createdAt).toLocaleString()}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {languageLabel(t.language)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {t.durationSec != null ? formatTimestamp(t.durationSec) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={t.status} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/transcription/${t.id}`}
                  aria-label={`Open ${t.filename}`}
                  className="text-muted-foreground transition-colors group-hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
