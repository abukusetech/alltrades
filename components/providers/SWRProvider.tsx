"use client";

import * as React from "react";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Serving from cache is instant when navigating back to a page.
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 5 * 60_000, // 5 minutes
        keepPreviousData: true,
        errorRetryCount: 1,
        errorRetryInterval: 3000,
        // Serve stale data immediately, refresh in the background.
        // This gives instant navigations with fresh data 300ms later.
        focusThrottleInterval: 5 * 60_000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
