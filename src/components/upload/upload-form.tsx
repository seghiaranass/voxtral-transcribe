"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UploadCloud, FileAudio, X, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LANGUAGES,
  MAX_FILE_BYTES,
  ALLOWED_AUDIO_EXTENSIONS,
  isAllowedAudio,
} from "@/lib/validation";

const AUTO = "auto";
const LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value === "" ? AUTO : l.value, l.label]),
);

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadForm({ hasApiKey }: { hasApiKey: boolean }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [language, setLanguage] = React.useState<string>(AUTO);
  const [diarize, setDiarize] = React.useState(true);
  const [dragging, setDragging] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!isAllowedAudio(f.name)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}.`);
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`File is too large. Max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an audio file first.");
      return;
    }
    setSubmitting(true);

    const body = new FormData();
    body.append("file", file);
    body.append("diarize", diarize ? "true" : "false");
    body.append("language", language === AUTO ? "" : language);

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body });
      const data = (await res.json()) as {
        id?: string;
        status?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (data.code === "NO_API_KEY") {
          toast.error("No Mistral API key set. Add one in Settings.");
        } else {
          toast.error(data.error ?? "Upload failed.");
        }
        setSubmitting(false);
        return;
      }

      // Record created (status done or error) — go to the result page to view it.
      if (data.id) {
        if (data.status === "error") {
          toast.error(data.error ?? "Transcription failed.");
        }
        router.push(`/transcription/${data.id}`);
        router.refresh();
        return;
      }
      setSubmitting(false);
    } catch {
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New transcription</CardTitle>
        <CardDescription>Upload audio and transcribe it with Mistral Voxtral.</CardDescription>
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5">
          {!hasApiKey && (
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertTitle>No API key configured</AlertTitle>
              <AlertDescription>
                Add your Mistral API key in{" "}
                <Link href="/settings" className="font-medium text-primary hover:underline">
                  Settings
                </Link>{" "}
                before transcribing.
              </AlertDescription>
            </Alert>
          )}

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_AUDIO_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <FileAudio className="h-6 w-6 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{humanSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag &amp; drop audio here, or click to browse</p>
                <p className="text-xs text-muted-foreground">
                  {ALLOWED_AUDIO_EXTENSIONS.join(", ")} · up to{" "}
                  {Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB
                </p>
              </>
            )}
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as string)}>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue>{LABELS[language] ?? "Auto-detect"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => {
                    const v = l.value === "" ? AUTO : l.value;
                    return (
                      <SelectItem key={v} value={v}>
                        {l.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diarize">Speaker diarization</Label>
              <div className="flex h-8 items-center gap-2">
                <Switch id="diarize" checked={diarize} onCheckedChange={setDiarize} />
                <span className="text-sm text-muted-foreground">
                  {diarize ? "On — label each speaker" : "Off — plain transcript"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button type="submit" disabled={submitting || !file}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Transcribing…" : "Transcribe"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
