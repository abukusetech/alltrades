"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-loss-border bg-loss-bg">
        <AlertTriangle className="h-5 w-5 text-loss-text" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-ink-900">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-center text-xs text-ink-500">
        An unexpected error occurred. You can try again or return to the
        dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 text-3xs text-ink-400">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex items-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
