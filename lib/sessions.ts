// ALLTRADES — Session & Kill Zone math
// All calculations based on America/New_York time.

export type SessionStatus = "OPEN" | "UPCOMING" | "CLOSED";

export interface SessionDef {
  key: string;
  name: string;
  openHour: number; // 24h format in NY time
  closeHour: number;
  openTimeStr: string;
  closeTimeStr: string;
}

export const SESSIONS: SessionDef[] = [
  { key: "sydney", name: "Sydney", openHour: 17, closeHour: 2, openTimeStr: "17:00", closeTimeStr: "02:00" },
  { key: "tokyo", name: "Asian (Tokyo)", openHour: 19, closeHour: 4, openTimeStr: "19:00", closeTimeStr: "04:00" },
  { key: "london", name: "London", openHour: 3, closeHour: 12, openTimeStr: "03:00", closeTimeStr: "12:00" },
  { key: "newyork", name: "New York", openHour: 8, closeHour: 17, openTimeStr: "08:00", closeTimeStr: "17:00" },
];

export const KILL_ZONES = [
  { key: "asia", name: "Asian Kill Zone", openHour: 20, closeHour: 0, openTimeStr: "20:00", closeTimeStr: "00:00" },
  { key: "london", name: "London Kill Zone", openHour: 2, closeHour: 5, openTimeStr: "02:00", closeTimeStr: "05:00" },
  { key: "nyam", name: "NY AM Kill Zone", openHour: 7, closeHour: 10, openTimeStr: "07:00", closeTimeStr: "10:00" },
  { key: "nypm", name: "NY PM Kill Zone", openHour: 13, closeHour: 16, openTimeStr: "13:30", closeTimeStr: "16:00" },
];

export function getNyTimeParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return { hours: get("hour"), minutes: get("minute"), seconds: get("second") };
}

export function calculateSessionStatus(
  openHour: number,
  closeHour: number,
  now: Date
): { status: SessionStatus; elapsedSecs: number; remainingSecs: number; nextOpenSecs: number } {
  const ny = getNyTimeParts(now);
  const nowSecs = ny.hours * 3600 + ny.minutes * 60 + ny.seconds;
  const openSecs = openHour * 3600;
  const closeSecs = closeHour * 3600;
  
  // 1. Check for Weekend (Forex is closed from Friday 17:00 NY to Sunday 17:00 NY)
  const nyDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayOfWeek = nyDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  
  const isWeekend = 
    (dayOfWeek === 6) || 
    (dayOfWeek === 0 && nowSecs < 17 * 3600) || 
    (dayOfWeek === 5 && nowSecs >= 17 * 3600);

  if (isWeekend) {
    // If it's the weekend, all sessions are closed. 
    // We just return a basic countdown to the next Monday (using a safe fallback).
    return {
      status: "CLOSED",
      elapsedSecs: 0,
      remainingSecs: 0,
      nextOpenSecs: 0, // The UI will override this with "Market Closed"
    };
  }

  let isOpen = false;
  let elapsedSecs = 0;
  let remainingSecs = 0;
  let nextOpenSecs = 0;

  // Handle midnight-crossing sessions (e.g. Sydney 17:00 to 02:00)
  if (openHour > closeHour) {
    if (nowSecs >= openSecs) {
      isOpen = true;
      elapsedSecs = nowSecs - openSecs;
      remainingSecs = (24 * 3600) - nowSecs + closeSecs;
    } else if (nowSecs < closeSecs) {
      isOpen = true;
      elapsedSecs = (24 * 3600) - openSecs + nowSecs;
      remainingSecs = closeSecs - nowSecs;
    } else {
      nextOpenSecs = openSecs - nowSecs;
    }
  } else {
    // Normal session (e.g. London 03:00 to 12:00)
    if (nowSecs >= openSecs && nowSecs < closeSecs) {
      isOpen = true;
      elapsedSecs = nowSecs - openSecs;
      remainingSecs = closeSecs - nowSecs;
    } else if (nowSecs < openSecs) {
      nextOpenSecs = openSecs - nowSecs;
    } else {
      nextOpenSecs = (24 * 3600) - nowSecs + openSecs;
    }
  }

  return {
    status: isOpen ? "OPEN" : "CLOSED",
    elapsedSecs,
    remainingSecs,
    nextOpenSecs,
  };
}

export function formatSecs(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Helper to get the exact start/end times for a session in NY time
export function getSessionWindow(sessionKey: string, date: Date) {
  const session = SESSIONS.find((s) => s.key === sessionKey);
  if (!session) return null;

  // We need to format the current date in NY to find the current session day
  const nyDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const [year, month, day] = nyDateStr.split("-").map(Number);

  // Create start time in NY time
  const start = new Date(Date.UTC(year, month - 1, day, session.openHour - 5, 0, 0)); // Simplified offset (adjusting for DST requires a library, but this works for now)
  
  return { start, end: new Date(start.getTime() + 8 * 60 * 60 * 1000) }; // 8 hours duration
}

