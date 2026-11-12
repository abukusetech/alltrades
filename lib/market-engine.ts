// ALLTRADES — Centralized Market Engine
// Every component MUST use this for market status, sessions, and kill zones.

export interface MarketStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime: Date | null;
  nextCloseTime: Date | null;
}

// Helper to get accurate time parts in a specific timezone
export function getTzParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  
  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    hour: parseInt(get("hour")),
    minute: parseInt(get("minute")),
    second: parseInt(get("second")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

/**
 * Returns the exact UTC Date object representing a specific wall-clock time
 * in the given timezone. Handles DST correctly.
 *
 * Example: zonedTimeToUtc(2026, 11, 8, 17, 0, "America/New_York")
 *          → Date object at 2026-11-08 22:00:00 UTC (which is 17:00 EST)
 */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Step 1: Create a date interpreted as UTC with the desired wall-clock values
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Step 2: Ask what time that instant is in the target zone
  const zonedParts = getTzParts(new Date(utcGuess), timeZone);
  const zonedAsUtc = Date.UTC(
    zonedParts.year,
    zonedParts.month - 1,
    zonedParts.day,
    zonedParts.hour,
    zonedParts.minute,
    zonedParts.second
  );

  // Step 3: The difference tells us how much to adjust
  const offset = zonedAsUtc - utcGuess;

  // Step 4: Subtract the offset to get the true UTC moment
  return new Date(utcGuess - offset);
}

// Helper to format Date to EAT string (HH:MM)
export function formatEat(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" });
}

// Helper to format Date to full string
export function formatEatFull(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleString("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * Determines Global Forex Market Status.
 * Opens: Sunday 17:00 New York time.
 * Closes: Friday 17:00 New York time.
 */
export function getGlobalMarketStatus(now: Date): MarketStatus {
  const ny = getTzParts(now, "America/New_York");
  
  // Friday 17:00 NY is the weekly close
  const isFridayAfterClose = ny.weekday === 5 && ny.hour >= 17;
  // Saturday is completely closed
  const isSaturday = ny.weekday === 6;
  // Sunday before 17:00 NY is closed
  const isSundayBeforeOpen = ny.weekday === 0 && ny.hour < 17;

  if (isFridayAfterClose || isSaturday || isSundayBeforeOpen) {
    // Calculate the date of the upcoming Sunday
    let daysUntilSunday: number;
    if (isFridayAfterClose) {
      daysUntilSunday = 2;
    } else if (isSaturday) {
      daysUntilSunday = 1;
    } else {
      // Sunday before open
      daysUntilSunday = 0;
    }

    // Get the current NY date
    const nyDate = new Date(
      Date.UTC(ny.year, ny.month - 1, ny.day)
    );
    nyDate.setUTCDate(nyDate.getUTCDate() + daysUntilSunday);

    const targetYear = nyDate.getUTCFullYear();
    const targetMonth = nyDate.getUTCMonth() + 1;
    const targetDay = nyDate.getUTCDate();

    // Compute the exact UTC moment for Sunday 17:00 NY
    const nextOpenUtc = zonedTimeToUtc(targetYear, targetMonth, targetDay, 17, 0, "America/New_York");
    
    return {
      isOpen: false,
      statusText: "WEEKEND MARKET CLOSURE",
      nextOpenTime: nextOpenUtc,
      nextCloseTime: null,
    };
  }

  // Market is OPEN — calculate next Friday 17:00 NY
  const daysUntilFriday = (5 - ny.weekday + 7) % 7;
  const nyDate = new Date(
    Date.UTC(ny.year, ny.month - 1, ny.day)
  );
  nyDate.setUTCDate(nyDate.getUTCDate() + daysUntilFriday);

  const targetYear = nyDate.getUTCFullYear();
  const targetMonth = nyDate.getUTCMonth() + 1;
  const targetDay = nyDate.getUTCDate();

  const nextCloseUtc = zonedTimeToUtc(targetYear, targetMonth, targetDay, 17, 0, "America/New_York");

  return {
    isOpen: true,
    statusText: "FOREX MARKET OPEN",
    nextOpenTime: null,
    nextCloseTime: nextCloseUtc,
  };
}

/**
 * Calculates Session Status.
 * Sessions are defined in their LOCAL timezones.
 */
export interface SessionDef {
  key: string;
  name: string;
  timezone: string;
  openHour: number;
  closeHour: number;
}

export const SESSIONS: SessionDef[] = [
  { key: "sydney", name: "Sydney", timezone: "Australia/Sydney", openHour: 8, closeHour: 17 },
  { key: "tokyo", name: "Asian (Tokyo)", timezone: "Asia/Tokyo", openHour: 9, closeHour: 18 },
  { key: "london", name: "London", timezone: "Europe/London", openHour: 8, closeHour: 17 },
  { key: "newyork", name: "New York", timezone: "America/New_York", openHour: 8, closeHour: 17 },
];

/** Exact session boundaries for the current local session date, converted to UTC. */
export function getSessionWindow(session: SessionDef, now: Date) {
  const local = getTzParts(now, session.timezone);
  return {
    openAt: zonedTimeToUtc(local.year, local.month, local.day, session.openHour, 0, session.timezone),
    closeAt: zonedTimeToUtc(local.year, local.month, local.day, session.closeHour, 0, session.timezone),
  };
}

export function getSessionStatus(session: SessionDef, now: Date) {
  const local = getTzParts(now, session.timezone);
  const nowSecs = local.hour * 3600 + local.minute * 60 + local.second;
  const openSecs = session.openHour * 3600;
  const closeSecs = session.closeHour * 3600;

  let isOpen = false;
  let elapsed = 0;
  let remaining = 0;

  if (nowSecs >= openSecs && nowSecs < closeSecs) {
    isOpen = true;
    elapsed = nowSecs - openSecs;
    remaining = closeSecs - nowSecs;
  }

  return {
    status: isOpen ? "OPEN" : "CLOSED",
    elapsedSecs: elapsed,
    remainingSecs: remaining,
  };
}

/**
 * ICT Kill Zones (Defined in NY time)
 */
export const KILL_ZONES = [
  { key: "asia", name: "Asian Kill Zone", open: 19, close: 23 }, // 7pm - 11pm
  { key: "london", name: "London Kill Zone", open: 2, close: 5 },
  { key: "nyam", name: "NY AM Kill Zone", open: 7, close: 10 },
  { key: "nypm", name: "NY PM Kill Zone", open: 13.5, close: 16 },
];

export function getKillZoneStatus(kz: typeof KILL_ZONES[number], now: Date) {
  const ny = getTzParts(now, "America/New_York");
  const nowSecs = ny.hour * 3600 + ny.minute * 60 + ny.second;
  const openHour = Math.floor(kz.open);
  const openMinute = Math.round((kz.open - openHour) * 60);
  const closeHour = Math.floor(kz.close);
  const closeMinute = Math.round((kz.close - closeHour) * 60);
  const openSecs = kz.open * 3600;
  const closeSecs = kz.close * 3600;
  const active = nowSecs >= openSecs && nowSecs < closeSecs;
  const nextDate = new Date(Date.UTC(ny.year, ny.month - 1, ny.day));
  if (!active && nowSecs >= closeSecs) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextOpenAt = zonedTimeToUtc(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate(), openHour, openMinute, "America/New_York");
  const closeAt = zonedTimeToUtc(ny.year, ny.month, ny.day, closeHour, closeMinute, "America/New_York");
  return {
    status: active ? "ACTIVE" : "UPCOMING",
    remainingSecs: active ? Math.max(0, Math.floor((closeAt.getTime() - now.getTime()) / 1000)) : 0,
    untilOpenSecs: active ? 0 : Math.max(0, Math.floor((nextOpenAt.getTime() - now.getTime()) / 1000)),
  };
}
