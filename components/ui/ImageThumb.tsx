"use client";

import * as React from "react";
import { ZoomIn, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageThumbProps {
  src: string;
  alt?: string;
  caption?: string;
  onClick?: () => void;
  onDownload?: (e: React.MouseEvent) => void;
  className?: string;
  aspect?: "square" | "video" | "wide";
}

export function ImageThumb({
  src,
  alt = "Screenshot",
  caption,
  onClick,
  onDownload,
  className,
  aspect = "video",
}: ImageThumbProps) {
  const aspectClass =
    aspect === "square"
      ? "aspect-square"
      : aspect === "wide"
        ? "aspect-[16/7]"
        : "aspect-video";

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded border border-border bg-ink-100",
        aspectClass,
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={caption ? `View ${caption}` : "View screenshot"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-ink-950/0 opacity-0 transition-all group-hover:bg-ink-950/40 group-hover:opacity-100">
        <div className="flex items-center gap-1.5 rounded bg-white/95 px-2.5 py-1 text-3xs font-medium text-ink-900 shadow">
          <ZoomIn className="h-3 w-3" />
          View
        </div>
      </div>

      {/* Download button top-right */}
      {onDownload && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(e);
          }}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded bg-white/95 text-ink-700 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100"
          aria-label="Download"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}

      {caption && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-950/80 to-transparent px-2 py-1 text-3xs text-white">
          {caption}
        </div>
      )}
    </div>
  );
}
