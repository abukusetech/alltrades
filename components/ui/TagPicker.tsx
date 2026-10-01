"use client";

import * as React from "react";
import { X, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagPickerProps {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  allowCustom?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function TagPicker({
  label,
  options,
  value,
  onChange,
  allowCustom = false,
  disabled,
  hint,
}: TagPickerProps) {
  const [custom, setCustom] = React.useState("");
  const [showCustom, setShowCustom] = React.useState(false);

  function toggle(tag: string) {
    if (disabled) return;
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  }

  function addCustom() {
    const t = custom.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setCustom("");
    setShowCustom(false);
  }

  // Custom tags already selected that aren't in the preset list
  const customSelected = value.filter((t) => !options.includes(t));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-2xs font-medium uppercase tracking-wide text-ink-600">
          {label}
        </label>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-3xs text-ink-500 hover:text-loss-text"
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-3xs text-ink-500">{hint}</p>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((tag) => {
          const active = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-3xs transition-colors",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-border text-ink-600 hover:bg-surface-muted",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {tag}
            </button>
          );
        })}

        {customSelected.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded border border-brand-600 bg-brand-50 px-2 py-0.5 text-3xs text-brand-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => toggle(tag)}
              disabled={disabled}
              className="hover:text-loss-text"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {allowCustom && !disabled && (
          showCustom ? (
            <span className="inline-flex items-center gap-1">
              <input
                autoFocus
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  } else if (e.key === "Escape") {
                    setShowCustom(false);
                    setCustom("");
                  }
                }}
                className="h-6 w-28 rounded border border-border-strong px-2 text-3xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Custom…"
              />
              <button
                type="button"
                onClick={addCustom}
                className="text-3xs text-brand-700 hover:underline"
              >
                Add
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-1 rounded border border-dashed border-border-strong px-2 py-0.5 text-3xs text-ink-500 hover:border-ink-400 hover:text-ink-800"
            >
              <Plus className="h-3 w-3" /> Custom
            </button>
          )
        )}
      </div>
    </div>
  );
}
