import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getExtension } from "@/lib/validation";

// Local-disk storage for uploaded audio. Lives under UPLOAD_DIR
// (./data/uploads in dev, /data/uploads in Docker — a persistent volume).
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || "./data/uploads";
}

/** Persist an uploaded file; returns the stored path (kept in DB as audioPath). */
export async function saveUpload(originalName: string, bytes: Buffer): Promise<string> {
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const ext = getExtension(originalName);
  const stored = `${randomUUID()}${ext}`;
  const fullPath = path.join(dir, stored);
  await writeFile(fullPath, bytes);
  return fullPath;
}

export async function readUpload(storedPath: string): Promise<Buffer> {
  return readFile(storedPath);
}

export async function deleteUpload(storedPath: string): Promise<void> {
  try {
    await unlink(storedPath);
  } catch {
    // already gone — ignore
  }
}
