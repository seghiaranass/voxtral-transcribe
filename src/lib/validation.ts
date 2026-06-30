import { z } from "zod";

// ----- Auth -----
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ----- Mistral / Voxtral supported languages (spec §4) -----
// `value: ""` means auto-detect (omit the `language` param).
export const LANGUAGES = [
  { value: "", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
] as const;

export const LANGUAGE_CODES = LANGUAGES.filter((l) => l.value !== "").map((l) => l.value);

// ----- Audio upload constraints (spec §3) -----
export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".flac",
  ".webm",
] as const;

// MIME types we accept (browsers vary; we also validate by extension server-side).
export const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
  "video/webm",
] as const;

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function isAllowedAudio(filename: string): boolean {
  return (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(getExtension(filename));
}
