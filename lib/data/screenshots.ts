import type { SupabaseClient } from "@supabase/supabase-js";
import { SCREENSHOT_MAX_BYTES, SCREENSHOT_ACCEPTED_TYPES } from "@/lib/constants";

const BUCKET = "trade-screenshots";

export interface UploadResult {
  path: string;
}

export function validateScreenshotFile(file: File): string | null {
  if (!SCREENSHOT_ACCEPTED_TYPES.includes(file.type)) {
    return `Unsupported file type "${file.type || "unknown"}". Use PNG, JPG or WEBP.`;
  }
  if (file.size > SCREENSHOT_MAX_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 6 MB.`;
  }
  return null;
}

/**
 * Uploads a file to <bucket>/<userId>/<prefix>/<timestamp>-<rand>.<ext>
 * Returns the storage path (not a URL). Signed URLs are generated on read.
 */
export async function uploadScreenshot(
  supabase: SupabaseClient,
  userId: string,
  prefix: string,
  file: File
): Promise<UploadResult> {
  const invalid = validateScreenshotFile(file);
  if (invalid) throw new Error(invalid);

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${userId}/${prefix}/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw error;
  return { path };
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteScreenshot(
  supabase: SupabaseClient,
  storagePath: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}
