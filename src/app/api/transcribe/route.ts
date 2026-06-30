import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/session";
import { getApiKey } from "@/lib/api-key";
import { saveUpload } from "@/lib/storage";
import { transcribe, VoxtralError } from "@/lib/voxtral";
import { formatTranscript, type VoxtralResponse } from "@/lib/transcript";
import { prisma } from "@/lib/db";
import {
  MAX_FILE_BYTES,
  isAllowedAudio,
  ALLOWED_AUDIO_EXTENSIONS,
  LANGUAGE_CODES,
} from "@/lib/validation";

// Long audio can take a while — give the route a generous budget.
export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Must have an API key configured before we call Mistral.
  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Add your Mistral API key in Settings first.", code: "NO_API_KEY" },
      { status: 400 },
    );
  }

  // Parse multipart form.
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio file was provided." }, { status: 400 });
  }

  // Server-side validation (do not trust the client).
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }
  if (!isAllowedAudio(file.name)) {
    return NextResponse.json(
      { error: `Unsupported file type. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const diarize = formData.get("diarize") !== "false"; // default ON
  const rawLang = (formData.get("language") as string | null)?.trim() || "";
  const language = rawLang && LANGUAGE_CODES.includes(rawLang) ? rawLang : null;

  // Persist the audio to disk.
  const bytes = Buffer.from(await file.arrayBuffer());
  let audioPath: string;
  try {
    audioPath = await saveUpload(file.name, bytes);
  } catch {
    return NextResponse.json({ error: "Could not store the uploaded file." }, { status: 500 });
  }

  // Create the record up-front as "processing".
  const record = await prisma.transcription.create({
    data: {
      userId,
      filename: file.name,
      audioPath,
      language,
      diarized: diarize,
      status: "processing",
    },
  });

  // Call Voxtral with the EXACT params (diarize ⇒ timestamp_granularities handled in the client).
  try {
    const result: VoxtralResponse = await transcribe({
      apiKey,
      file: new Blob([bytes], { type: file.type || "application/octet-stream" }),
      filename: file.name,
      diarize,
      language,
    });

    const formattedText = formatTranscript(result);
    const durationSec = result.usage?.prompt_audio_seconds ?? null;

    const updated = await prisma.transcription.update({
      where: { id: record.id },
      data: {
        status: "done",
        formattedText,
        rawJson: JSON.stringify(result),
        durationSec,
      },
    });

    return NextResponse.json({ id: updated.id, status: "done" }, { status: 200 });
  } catch (err) {
    const userMessage =
      err instanceof VoxtralError ? err.userMessage : "Transcription failed. Please try again.";
    const status = err instanceof VoxtralError ? err.status : 500;

    await prisma.transcription.update({
      where: { id: record.id },
      data: { status: "error", errorMessage: userMessage },
    });

    // 207-ish: the record was created but transcription failed. Use 200 with status so the
    // client can route to the result page and show the error inline, OR surface a toast.
    return NextResponse.json(
      { id: record.id, status: "error", error: userMessage, httpStatus: status },
      { status: 200 },
    );
  }
}
