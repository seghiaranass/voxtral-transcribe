// Types for the Voxtral transcription response + rendering helpers (spec §4).

export interface VoxtralSegment {
  text: string;
  start: number; // seconds (float)
  end: number; // seconds (float)
  speaker_id?: string | null; // e.g. "speaker_1"
  type?: string;
}

export interface VoxtralUsage {
  prompt_audio_seconds?: number;
  total_tokens?: number;
  request_count?: number;
}

export interface VoxtralResponse {
  model?: string;
  text: string;
  language?: string | null;
  segments?: VoxtralSegment[];
  usage?: VoxtralUsage;
}

/** Convert seconds (float) to "mm:ss" (or "h:mm:ss" past an hour). */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "speaker_1" -> "Speaker 1"; falls back gracefully for unexpected ids. */
export function speakerLabel(speakerId?: string | null): string {
  if (!speakerId) return "Speaker";
  const m = speakerId.match(/(\d+)\s*$/);
  return m ? `Speaker ${m[1]}` : speakerId.replace(/_/g, " ");
}

/**
 * Stable 1-based speaker number for colour-coding in the UI.
 * Maps "speaker_1" -> 1, "speaker_2" -> 2, etc.; unknown ids hash to a small bucket.
 */
export function speakerNumber(speakerId?: string | null): number {
  if (!speakerId) return 1;
  const m = speakerId.match(/(\d+)\s*$/);
  if (m) return parseInt(m[1], 10);
  let h = 0;
  for (const ch of speakerId) h = (h + ch.charCodeAt(0)) % 8;
  return h + 1;
}

/**
 * Render the human-readable transcript (used for inline display and the .txt download).
 * - With segments → one line per segment: "[mm:ss] Speaker N: text"
 * - Without segments → the flat `text` field.
 */
export function formatTranscript(res: VoxtralResponse): string {
  if (res.segments && res.segments.length > 0) {
    return res.segments
      .map((seg) => {
        const ts = formatTimestamp(seg.start);
        const who = speakerLabel(seg.speaker_id);
        return `[${ts}] ${who}: ${seg.text.trim()}`;
      })
      .join("\n");
  }
  return (res.text ?? "").trim();
}
