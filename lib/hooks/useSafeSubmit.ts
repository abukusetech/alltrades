"use client";

import * as React from "react";

/**
 * Wrap an async submit handler so it can never run twice in parallel.
 * Useful for save buttons that could be double-clicked or triggered by
 * keyboard Enter twice.
 */
export function useSafeSubmit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  const inFlightRef = React.useRef(false);
  const [submitting, setSubmitting] = React.useState(false);

  const call = React.useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setSubmitting(true);
      try {
        return await fn(...args);
      } finally {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [fn]
  );

  return { submit: call, submitting };
}
