"use client";

import * as React from "react";
import { Check, Loader2, AlertTriangle, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function SaveStatus({
  state,
  errorMessage,
  className,
}: {
  state: SaveState;
  errorMessage?: string | null;
  className?: string;
}) {
  const icon =
    state === "saving" ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : state === "saved" ? (
      <Check className="h-3 w-3" />
    ) : state === "error" ? (
      <AlertTriangle className="h-3 w-3" />
    ) : state === "dirty" ? (
      <Cloud className="h-3 w-3" />
    ) : null;

  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "error"
          ? "Save failed"
          : state === "dirty"
            ? "Unsaved changes"
            : "";

  const tone =
    state === "saved"
      ? "border-profit-border bg-profit-bg text-profit-text"
      : state === "error"
        ? "border-loss-border bg-loss-bg text-loss-text"
        : state === "dirty"
          ? "border-warn-border bg-warn-bg text-warn-text"
          : "border-border bg-surface-soft text-ink-600";

  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-1 text-3xs",
        tone,
        className
      )}
      title={state === "error" && errorMessage ? errorMessage : undefined}
    >
      {icon}
      {label}
    </span>
  );
}
