import type { VoxtralResponse } from "@/lib/transcript";

// Mistral Voxtral transcription client — EXACT verified params (spec §4).
//   POST https://api.mistral.ai/v1/audio/transcriptions
//   Authorization: Bearer <user key>
//   multipart/form-data: file, model=voxtral-mini-latest,
//     [diarize=true + timestamp_granularities=segment], [language]
//
// CRITICAL: when diarize=true you MUST also send timestamp_granularities=segment,
// or the API returns 422. We always send them together below.

const ENDPOINT = "https://api.mistral.ai/v1/audio/transcriptions";
const MODEL = "voxtral-mini-latest";

export class VoxtralError extends Error {
  status: number;
  /** Safe, user-facing message (never contains the API key). */
  userMessage: string;
  constructor(status: number, userMessage: string, internal?: string) {
    super(internal ?? userMessage);
    this.name = "VoxtralError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

export interface TranscribeParams {
  apiKey: string;
  file: Blob;
  filename: string;
  diarize: boolean;
  /** ISO code like "de"; omit/empty → auto-detect. */
  language?: string | null;
}

/** Map an HTTP status from Mistral to a clear, key-free user message. */
function messageForStatus(status: number, bodySnippet: string): string {
  switch (status) {
    case 401:
    case 403:
      return "Your Mistral API key was rejected — check it in Settings.";
    case 413:
      return "The audio file is too large for the Mistral API.";
    case 422:
      return `The request was rejected by Mistral (422). ${bodySnippet}`.trim();
    case 429:
      return "Rate limit reached on your Mistral account. Please wait and try again.";
    default:
      if (status >= 500) return "Mistral had a server error. Please try again shortly.";
      return `Transcription failed (HTTP ${status}). ${bodySnippet}`.trim();
  }
}

export async function transcribe(params: TranscribeParams): Promise<VoxtralResponse> {
  const { apiKey, file, filename, diarize, language } = params;

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", MODEL);
  if (diarize) {
    form.append("diarize", "true");
    // REQUIRED alongside diarize=true — see note above.
    form.append("timestamp_granularities", "segment");
  }
  if (language && language.trim()) {
    form.append("language", language.trim());
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    // Network/DNS/timeout — do not echo anything that could include the key.
    throw new VoxtralError(0, "Could not reach the Mistral API. Check your connection and try again.");
  }

  if (!res.ok) {
    let bodySnippet = "";
    try {
      const text = await res.text();
      // Trim to avoid leaking large payloads into UI; never includes the key (it's a header).
      bodySnippet = text.slice(0, 300);
    } catch {
      // ignore
    }
    throw new VoxtralError(res.status, messageForStatus(res.status, bodySnippet), bodySnippet);
  }

  const data = (await res.json()) as VoxtralResponse;
  return data;
}
