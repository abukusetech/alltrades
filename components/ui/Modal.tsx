"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-ink-950/40"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative mt-2 w-full rounded-lg border border-border bg-white shadow-modal sm:mt-10",
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="text-sm font-semibold text-ink-900"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-2xs text-ink-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — capped at viewport, scrolls on small screens */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 14rem)" }}
        >
          <div className="p-4 sm:p-5">{children}</div>
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
