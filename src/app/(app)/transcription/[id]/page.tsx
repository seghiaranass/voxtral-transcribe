import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileAudio,
  Calendar,
  Languages,
  Clock,
  Users,
} from "lucide-react";
import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { languageLabel } from "@/lib/validation";
import { parseStoredJson, formatTimestamp } from "@/lib/transcript";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { TranscriptView } from "@/components/transcript/transcript-view";
import { AlertCircle, Loader2 } from "lucide-react";

export const metadata = { title: "Transcription — Voxtral" };

function MetaItem({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      {children}
    </span>
  );
}

export default async function TranscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  const { id } = await params;
  const t = await prisma.transcription.findFirst({ where: { id, userId } });
  if (!t) notFound();

  const parsed = parseStoredJson(t.rawJson);
  const created = new Date(t.createdAt).toLocaleString();

  return (
    <div className="space-y-6">
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to history
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 break-all">
                <FileAudio className="h-5 w-5 shrink-0 text-primary" />
                {t.filename}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <MetaItem icon={Calendar}>{created}</MetaItem>
                <MetaItem icon={Languages}>{languageLabel(t.language)}</MetaItem>
                {t.durationSec != null && (
                  <MetaItem icon={Clock}>{formatTimestamp(t.durationSec)}</MetaItem>
                )}
                <MetaItem icon={Users}>{t.diarized ? "Diarized" : "Plain"}</MetaItem>
              </div>
            </div>
            <StatusBadge status={t.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {t.status === "processing" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing… refresh in a moment.
            </div>
          )}

          {t.status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Transcription failed</AlertTitle>
              <AlertDescription>
                {t.errorMessage ?? "An unknown error occurred."}
              </AlertDescription>
            </Alert>
          )}

          {t.status === "done" && (
            <>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/transcriptions/${t.id}/download?format=txt`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download className="h-4 w-4" />
                  Download .txt
                </a>
                <a
                  href={`/api/transcriptions/${t.id}/download?format=json`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download className="h-4 w-4" />
                  Download .json
                </a>
              </div>

              <TranscriptView segments={parsed?.segments} plainText={t.formattedText} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
