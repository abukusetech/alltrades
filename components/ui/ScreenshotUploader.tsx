"use client";

import * as React from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCREENSHOT_ACCEPTED_TYPES,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MAX_COUNT,
} from "@/lib/constants";
import { validateScreenshotFile } from "@/lib/data/screenshots";

export interface UploadedScreenshot {
  /** Local preview object URL or remote signed URL. */
  url: string;
  /** Storage path (when saved to Supabase) — null until saved. */
  storagePath?: string | null;
  /** The original File object when it's a pending upload. */
  file?: File | null;
  /** Row id, when this screenshot was already saved. */
  id?: string | null;
  /** Whether this URL was revocable (pending uploads). */
  revocable?: boolean;
}

export interface ScreenshotUploaderProps {
  value: UploadedScreenshot[];
  onChange: (next: UploadedScreenshot[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  maxCount?: number;
}

export function ScreenshotUploader({
  value,
  onChange,
  label = "Screenshots",
  hint,
  disabled,
  maxCount = SCREENSHOT_MAX_COUNT,
}: ScreenshotUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Revoke preview URLs on unmount
  React.useEffect(() => {
    return () => {
      value.forEach((s) => {
        if (s.revocable && s.url.startsWith("blob:")) {
          URL.revokeObjectURL(s.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPick() {
    inputRef.current?.click();
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = maxCount - value.length;
    if (remaining <= 0) {
      setError(`Maximum of ${maxCount} images reached.`);
      return;
    }

    const picked = Array.from(files).slice(0, remaining);
    const accepted: UploadedScreenshot[] = [];
    for (const f of picked) {
      const invalid = validateScreenshotFile(f);
      if (invalid) {
        setError(invalid);
        continue;
      }
      accepted.push({
        url: URL.createObjectURL(f),
        file: f,
        storagePath: null,
        id: null,
        revocable: true,
      });
    }
    if (accepted.length > 0) onChange([...value, ...accepted]);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(idx: number) {
    const next = [...value];
    const [removed] = next.splice(idx, 1);
    if (removed && removed.revocable && removed.url.startsWith("blob:")) {
      URL.revokeObjectURL(removed.url);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-2xs font-medium uppercase tracking-wide text-ink-600">
          {label}
        </label>
        <span className="text-3xs text-ink-500">
          {value.length} / {maxCount}
        </span>
      </div>

      {hint && <p className="mt-1 text-3xs text-ink-500">{hint}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        {value.map((s, i) => (
          <div
            key={(s.id ?? s.storagePath ?? s.url) + i}
            className="group relative h-20 w-24 overflow-hidden rounded border border-border bg-ink-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={`Screenshot ${i + 1}`}
              className="h-full w-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove screenshot"
                className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded bg-ink-950/70 text-white group-hover:flex hover:bg-ink-950"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {value.length < maxCount && !disabled && (
          <button
            type="button"
            onClick={onPick}
            disabled={busy}
            className={cn(
              "flex h-20 w-24 flex-col items-center justify-center gap-1 rounded border border-dashed border-border-strong bg-surface-soft text-3xs text-ink-500 transition-colors hover:border-ink-400 hover:text-ink-700",
              busy && "cursor-wait"
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>Add image</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SCREENSHOT_ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <p className="mt-1.5 text-3xs text-ink-400">
        PNG, JPG or WEBP. Maximum {(SCREENSHOT_MAX_BYTES / 1024 / 1024).toFixed(0)} MB per image.
      </p>

      {error && <p className="mt-1 text-3xs text-loss-text">{error}</p>}
    </div>
  );
}
