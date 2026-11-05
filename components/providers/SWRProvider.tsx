"use client";

import * as React from "react";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Serving from cache is instant when navigating back to a page.
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 5 * 60_000, // 5 minutes
        focusThrottleInterval: 30_000,
        keepPreviousData: true,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
        // Serve stale data immediately, refresh in the background.
        // This gives instant navigations with fresh data 300ms later.
      }}
    >
      {children}
    </SWRConfig>
  );
}


