"use client";

import * as React from "react";
import { CheckCircle2, X, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, { container: string; icon: React.ReactNode }> = {
  success: {
    container: "border-profit-border bg-profit-bg",
    icon: <CheckCircle2 className="h-4 w-4 text-profit-text" />,
  },
  error: {
    container: "border-loss-border bg-loss-bg",
    icon: <AlertTriangle className="h-4 w-4 text-loss-text" />,
  },
  warning: {
    container: "border-warn-border bg-warn-bg",
    icon: <AlertTriangle className="h-4 w-4 text-warn-text" />,
  },
  info: {
    container: "border-brand-200 bg-brand-50",
    icon: <Info className="h-4 w-4 text-brand-700" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const duration = t.duration ?? 4000;
      setToasts((prev) => [...prev, { ...t, id }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const value: ToastContextValue = React.useMemo(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
      warning: (title, description) => toast({ tone: "warning", title, description }),
      info: (title, description) => toast({ tone: "info", title, description }),
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = toneStyles[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-raised",
                style.container
              )}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-900">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-2xs text-ink-600">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-500 transition-colors hover:bg-white/60 hover:text-ink-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
