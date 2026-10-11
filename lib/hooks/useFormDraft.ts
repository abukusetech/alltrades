"use client";

import * as React from "react";

interface DraftRecord<T> {
  value: T;
  savedAt: number;      // epoch ms
  userId: string;
  recordKey: string;
  version: 1;
}

const STORAGE_PREFIX = "alltrades.draft.";
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Local draft persistence for a single form or record.
 *
 * Keyed by `userId` + `recordKey` so drafts never leak between users
 * or between records.
 *
 * On mount: if a draft exists for the same (user, record) and is newer
 * than `serverSavedAt`, exposes it via `pendingDraft`.
 * The caller decides whether to restore it (usually by showing a prompt).
 */
export function useFormDraft<T>(options: {
  userId: string | null;
  recordKey: string;
  /** epoch ms of the last known server save, or null if never saved */
  serverSavedAt?: number | null;
  /** how long a draft stays valid; default 8 hours */
  ttlMs?: number;
  /** disable entirely (e.g. for non-persistent forms) */
  disabled?: boolean;
}) {
  const { userId, recordKey, serverSavedAt, ttlMs, disabled } = options;
  const ttl = ttlMs ?? DEFAULT_TTL_MS;

  const storageKey = React.useMemo(() => {
    if (disabled || !userId || !recordKey) return null;
    return `${STORAGE_PREFIX}${userId}.${recordKey}`;
  }, [disabled, userId, recordKey]);

  const [pendingDraft, setPendingDraft] = React.useState<{
    value: T;
    savedAt: number;
  } | null>(null);

  const [lastLocalWrite, setLastLocalWrite] = React.useState<number | null>(null);

  // On mount (or when key changes) read any existing draft.
  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftRecord<T>;
      if (parsed.version !== 1) return;
      if (parsed.userId !== userId) return;
      if (parsed.recordKey !== recordKey) return;
      const age = Date.now() - parsed.savedAt;
      if (age > ttl) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      // Only offer a draft if it is newer than what's on the server.
      const serverTime = serverSavedAt ?? 0;
      if (parsed.savedAt > serverTime) {
        setPendingDraft({ value: parsed.value, savedAt: parsed.savedAt });
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Corrupt draft — clear it.
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  /** Write a draft (debounced by the caller). */
  const writeDraft = React.useCallback(
    (value: T) => {
      if (!storageKey || !userId || !recordKey) return;
      try {
        const record: DraftRecord<T> = {
          value,
          savedAt: Date.now(),
          userId,
          recordKey,
          version: 1,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(record));
        setLastLocalWrite(record.savedAt);
      } catch {
        // Quota exceeded or storage disabled — silently ignore.
      }
    },
    [storageKey, userId, recordKey]
  );

  /** Clear the draft (call after a successful server save). */
  const clearDraft = React.useCallback(() => {
    if (!storageKey) return;
    try {
      window.localStorage.removeItem(storageKey);
      setPendingDraft(null);
      setLastLocalWrite(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  /** Accept the pending draft (i.e. user confirmed restore). */
  const acceptDraft = React.useCallback(() => {
    const v = pendingDraft;
    setPendingDraft(null);
    return v?.value ?? null;
  }, [pendingDraft]);

  /** Dismiss the pending draft. */
  const dismissDraft = React.useCallback(() => {
    if (storageKey) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    setPendingDraft(null);
  }, [storageKey]);

  return {
    pendingDraft,
    lastLocalWrite,
    writeDraft,
    clearDraft,
    acceptDraft,
    dismissDraft,
  };
}
