"use client";

import * as React from "react";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
        dedupingInterval: 5 * 60_000, // 5 minutes
        keepPreviousData: true,
        errorRetryCount: 1,
        errorRetryInterval: 3000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
