import { currentUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getExtension } from "@/lib/validation";

// Streams a transcript download.
//   ?format=txt  → human-readable formatted transcript
//   ?format=json → raw Mistral API response
// Filename = original audio base name + .txt/.json (e.g. interview.mp3 → interview.txt).

function baseName(filename: string): string {
  const ext = getExtension(filename);
  return ext ? filename.slice(0, -ext.length) : filename;
}

// RFC 5987 / 6266 safe Content-Disposition with an ASCII fallback.
function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "txt";

  const record = await prisma.transcription.findFirst({
    where: { id, userId }, // ownership enforced here
  });
  if (!record) return new Response("Not found", { status: 404 });

  const base = baseName(record.filename);

  if (format === "json") {
    const body = record.rawJson ?? "{}";
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": contentDisposition(`${base}.json`),
        "Cache-Control": "no-store",
      },
    });
  }

  const body = record.formattedText ?? "";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": contentDisposition(`${base}.txt`),
      "Cache-Control": "no-store",
    },
  });
}
