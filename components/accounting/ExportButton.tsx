"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ExportButtonProps {
  filename: string;
  rows: Record<string, unknown>[];
  label?: string;
  className?: string;
  disabled?: boolean;
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ExportButton({
  filename,
  rows,
  label = "Export CSV",
  className,
  disabled,
}: ExportButtonProps) {
  function onExport() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")),
    ];
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled || rows.length === 0}
      leftIcon={<Download className="h-3.5 w-3.5" />}
      className={cn(className)}
    >
      {label}
    </Button>
  );
}
