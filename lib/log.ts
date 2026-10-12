// ALLTRADES — Lightweight logger
// Silences logs in production builds to reduce overhead.

const isDev = process.env.NODE_ENV !== "production";

export const log = {
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors are always logged
    console.error(...args);
  },
};
