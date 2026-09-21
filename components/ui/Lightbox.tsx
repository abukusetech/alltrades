"use client";

import * as React from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  alt?: string;
  caption?: string;
  /** Suggested filename when the user downloads. */
  filename?: string;
}

export interface LightboxProps {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const [zoom, setZoom] = React.useState<"fit" | "actual">("fit");

  const open = index !== null && index >= 0 && index < images.length;
  const current = open ? images[index] : null;

  // Reset zoom when image changes
  React.useEffect(() => {
    setZoom("fit");
  }, [index]);

  // Body scroll lock
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Keyboard
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && index! > 0)
        onIndexChange(index! - 1);
      else if (e.key === "ArrowRight" && index! < images.length - 1)
        onIndexChange(index! + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images.length, onClose, onIndexChange]);

  if (!open || !current) return null;

  const hasPrev = index! > 0;
  const hasNext = index! < images.length - 1;

  async function onDownload() {
    if (!current) return;
    try {
      // Fetch the image and trigger a download with a friendly filename
      const res = await fetch(current.url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = current.filename ?? `alltrades-screenshot-${index! + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    } catch {
      // Fallback: open in new tab
      window.open(current.url, "_blank", "noopener");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[200] flex flex-col bg-ink-950/95"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">
            {current.caption ?? current.alt ?? `Image ${index! + 1}`}
          </div>
          <div className="text-3xs text-white/60">
            {index! + 1} of {images.length}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => (z === "fit" ? "actual" : "fit"))}
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={zoom === "fit" ? "Zoom to actual size" : "Fit to screen"}
            title={zoom === "fit" ? "Actual size" : "Fit to screen"}
          >
            {zoom === "fit" ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Download image"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close viewer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onIndexChange(index! - 1)}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur transition-colors hover:bg-ink-950/90"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt ?? "Screenshot"}
          className={cn(
            "select-none",
            zoom === "fit"
              ? "max-h-full max-w-full object-contain"
              : "max-h-none max-w-none"
          )}
          style={
            zoom === "actual"
              ? { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none" }
              : undefined
          }
        />

        {hasNext && (
          <button
            type="button"
            onClick={() => onIndexChange(index! + 1)}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur transition-colors hover:bg-ink-950/90"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Bottom hint */}
      <div className="border-t border-white/10 px-4 py-2 text-center text-3xs text-white/50">
        ← → to navigate · Esc to close · {zoom === "fit" ? "Fit to screen" : "Actual size"}
      </div>
    </div>
  );
}
