"use client";

import * as React from "react";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60_000,
        keepPreviousData: true,
        errorRetryCount: 1,
      }}
    >
      {children}
    </SWRConfig>
  );
}
