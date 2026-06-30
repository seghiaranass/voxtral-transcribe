import { cn } from "@/lib/utils";
import {
  formatTimestamp,
  speakerLabel,
  speakerNumber,
  type VoxtralSegment,
} from "@/lib/transcript";

// Colour palette for speaker labels (static classes so Tailwind keeps them).
const SPEAKER_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-amber-600 dark:text-amber-400",
  "text-pink-600 dark:text-pink-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-rose-600 dark:text-rose-400",
  "text-teal-600 dark:text-teal-400",
];

function speakerColor(speakerId?: string | null): string {
  const n = speakerNumber(speakerId);
  return SPEAKER_COLORS[(n - 1) % SPEAKER_COLORS.length];
}

export function TranscriptView({
  segments,
  plainText,
}: {
  segments?: VoxtralSegment[] | null;
  plainText?: string | null;
}) {
  // Diarized / segmented view.
  if (segments && segments.length > 0) {
    return (
      <div className="rounded-lg border bg-muted/20">
        <ol className="divide-y">
          {segments.map((seg, i) => (
            <li key={i} className="flex gap-3 px-4 py-2.5 text-sm leading-relaxed">
              <span className="shrink-0 select-none pt-0.5 font-mono text-xs text-muted-foreground">
                [{formatTimestamp(seg.start)}]
              </span>
              <span className="min-w-0">
                <span className={cn("mr-2 font-semibold", speakerColor(seg.speaker_id))}>
                  {speakerLabel(seg.speaker_id)}:
                </span>
                <span className="text-foreground">{seg.text.trim()}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Plain (no diarization / no segments).
  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3">
      <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {plainText?.trim() || "No transcript text."}
      </p>
    </div>
  );
}
