
// Pakistan Standard Time utilities
export const PAKISTAN_TIMEZONE = 'Asia/Karachi';

/**
 * Get current Pakistan time
 */
export function getCurrentPKTTime(): Date {
  const now = new Date();
  // Convert to Pakistan time
  const pktTime = new Date(now.toLocaleString("en-US", {timeZone: PAKISTAN_TIMEZONE}));
  return pktTime;
}

/**
 * Format date for mobile display in Pakistan time
 */
export function formatMobileDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('en-US', {
    timeZone: PAKISTAN_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format time only for mobile display
 */
export function formatMobileTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('en-US', {
    timeZone: PAKISTAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get Pakistan date string (YYYY-MM-DD)
 */
export function getPKTDateString(): string {
  const pktTime = getCurrentPKTTime();
  return pktTime.toISOString().split('T')[0];
}

/**
 * Convert UTC date to Pakistan time
 */
export function utcToPKT(utcDate: Date | string): Date {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(dateObj.toLocaleString("en-US", {timeZone: PAKISTAN_TIMEZONE}));
}

/**
 * Get timezone offset for Pakistan
 */
export function getPKTOffset(): number {
  const pktTime = getCurrentPKTTime();
  return pktTime.getTimezoneOffset() * -1; // Convert to positive offset
}
