/**
 * Client-side timezone utilities for Pakistan Standard Time (PKT = UTC+5)
 * This ensures consistent Pakistan timezone across frontend components
 */

/**
 * Convert any date to Pakistan timezone (UTC+5)
 */
export function toPakistanTime(date: Date): Date {
  // Add 5 hours for Pakistan Standard Time (UTC+5)
  return new Date(date.getTime() + (5 * 60 * 60 * 1000));
}

/**
 * Get current Pakistan date as YYYY-MM-DD string
 */
export function getCurrentPakistanDate(): string {
  const now = new Date();
  const pktTime = toPakistanTime(now);
  return pktTime.toISOString().split('T')[0];
}

/**
 * Format date string for Pakistan timezone display
 */
export function formatPakistanDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return toPakistanTime(date).toISOString().split('T')[0];
}

/**
 * Get day of week for Pakistan timezone date
 */
export function getPakistanDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00+05:00'); // Noon PKT to avoid timezone shifts
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayNames[date.getDay()];
}

/**
 * Get last N days in Pakistan timezone
 */
export function getLastNDaysPakistan(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const pktNow = toPakistanTime(now);

  for (let i = 0; i < n; i++) {
    const date = new Date(pktNow.getTime() - (i * 24 * 60 * 60 * 1000));
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Check if date string represents today in Pakistan timezone
 */
export function isPakistanToday(dateStr: string): boolean {
  const today = getCurrentPakistanDate();
  return dateStr === today;
}

/**
 * Format time for Pakistan timezone display (HH:MM AM/PM)
 */
export function formatPakistanTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pktTime = toPakistanTime(date);

  return pktTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC' // Already converted to PKT above
  });
}

/**
 * Calculate minutes between two times (for late arrival calculations)
 */
export function getMinutesDifference(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format date/time for Pakistan timezone with custom format
 */
export function formatPKTDateTime(dateInput: string | Date, format: string = "YYYY-MM-DD HH:mm:ss"): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pktTime = toPakistanTime(date);

  // Handle simple time formats
  if (format === "HH:mm:ss") {
    return pktTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC' // Already converted to PKT above
    });
  }

  if (format === "HH:mm") {
    return pktTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC' // Already converted to PKT above
    });
  }

  // Default full datetime format
  const year = pktTime.getFullYear();
  const month = String(pktTime.getMonth() + 1).padStart(2, '0');
  const day = String(pktTime.getDate()).padStart(2, '0');
  const hours = String(pktTime.getHours()).padStart(2, '0');
  const minutes = String(pktTime.getMinutes()).padStart(2, '0');
  const seconds = String(pktTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current Pakistan time (client-side synchronous version)
 */
export function getCurrentPKTTime(): Date {
  return toPakistanTime(new Date());
}

/**
 * Format date for mobile display (simplified format)
 */
export function formatMobileDate(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pktTime = toPakistanTime(date);

  const today = toPakistanTime(new Date());
  const isToday = pktTime.toDateString() === today.toDateString();

  if (isToday) {
    return pktTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC' // Already converted to PKT above
    });
  }

  return pktTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC' // Already converted to PKT above
  });
}

export const formatTime24h = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime12h = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });
};