import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_ACCEPTED_TYPES,
} from "@/lib/constants";
import { compressImage } from "@/lib/image-compress";

const BUCKET = "trade-screenshots";

export interface UploadResult {
  path: string;
  originalSize: number;
  compressedSize: number;
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function validateScreenshotFile(file: File): string | null {
  if (!SCREENSHOT_ACCEPTED_TYPES.includes(file.type)) {
    return `Unsupported file type "${file.type || "unknown"}". Use PNG, JPG or WEBP.`;
  }
  if (file.size > SCREENSHOT_MAX_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 6 MB.`;
  }
  return null;
}

export async function uploadScreenshot(
  supabase: SupabaseClient,
  userId: string,
  prefix: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  console.log("[ALLTRADES] uploadScreenshot start", {
    userId,
    prefix,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  const invalid = validateScreenshotFile(file);
  if (invalid) {
    console.error("[ALLTRADES] uploadScreenshot validation failed:", invalid);
    throw new Error(invalid);
  }

  onProgress?.(5);

  let compressed: File;
  let originalSize = file.size;
  let compressedSize = file.size;
  try {
    const result = await compressImage(file);
    compressed = result.file;
    originalSize = result.originalSize;
    compressedSize = result.compressedSize;
    console.log("[ALLTRADES] compression done", {
      originalSize,
      compressedSize,
      ratio: result.ratio,
      newFileName: compressed.name,
      newFileType: compressed.type,
    });
  } catch (e) {
    console.error("[ALLTRADES] compression FAILED", e);
    throw e;
  }

  onProgress?.(25);

  const ext = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${prefix}/${Date.now()}-${rand}.${ext}`;

  console.log("[ALLTRADES] uploading to storage", {
    bucket: BUCKET,
    path,
    contentType: compressed.type,
    size: compressed.size,
  });

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, {
      cacheControl: "31536000",
      upsert: false,
      contentType: compressed.type,
    });

  if (error) {
    console.error("[ALLTRADES] storage upload FAILED", {
      message: error.message,
      name: error.name,
      error,
    });
    throw new Error(
      `Storage upload failed: ${error.message} (bucket: ${BUCKET}, path: ${path})`
    );
  }

  console.log("[ALLTRADES] storage upload succeeded", { path, data });

  onProgress?.(100);
  return { path, originalSize, compressedSize };
}

export async function uploadScreenshotsParallel(
  supabase: SupabaseClient,
  userId: string,
  prefix: string,
  files: File[],
  concurrency = 3
): Promise<{
  successes: { file: File; path: string }[];
  failures: { file: File; error: string }[];
}> {
  const successes: { file: File; path: string }[] = [];
  const failures: { file: File; error: string }[] = [];
  const queue = [...files];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length));

  await Promise.all(
    Array.from({ length: workerCount }).map(async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        try {
          const { path } = await uploadScreenshot(supabase, userId, prefix, next);
          successes.push({ file: next, path });
        } catch (e) {
          failures.push({
            file: next,
            error: e instanceof Error ? e.message : "Upload failed",
          });
        }
      }
    })
  );

  return { successes, failures };
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const cached = signedUrlCache.get(storagePath);
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("[ALLTRADES] getSignedUrl FAILED", { storagePath, error });
    return null;
  }

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: now + expiresInSeconds * 1000,
  });
  return data.signedUrl;
}

export async function getSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
  expiresInSeconds = 3600
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  await Promise.all(
    paths.map(async (p) => {
      result[p] = await getSignedUrl(supabase, p, expiresInSeconds);
    })
  );
  return result;
}

export async function deleteScreenshot(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  signedUrlCache.delete(storagePath);
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}
