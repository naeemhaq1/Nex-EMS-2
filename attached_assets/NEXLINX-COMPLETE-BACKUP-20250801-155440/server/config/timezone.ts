// Global timezone configuration for the entire application
// ALL dates and times must use this configuration
// CRITICAL: Enforces Pakistan Time (PKT) throughout the entire system

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Force Pakistan timezone at module load - prevents UTC/browser interference
process.env.TZ = 'Asia/Karachi';

export interface TimezoneConfig {
  timezone: string;
  offset: number; // UTC offset in hours
  displayName: string;
}

// Default timezone setting - Pakistan (IMMUTABLE)
export const DEFAULT_TIMEZONE: TimezoneConfig = {
  timezone: 'Asia/Karachi',
  offset: 5, // UTC+5
  displayName: 'Pakistan Time (PKT)'
};

// Current system timezone - LOCKED to Pakistan Time
// This prevents any accidental timezone changes
let currentTimezone: TimezoneConfig = DEFAULT_TIMEZONE;

// Timezone validation function
function validateTimezone(): void {
  if (currentTimezone.timezone !== 'Asia/Karachi') {
    console.warn('[TIMEZONE WARNING] Detected non-PKT timezone, forcing Pakistan Time');
    currentTimezone = DEFAULT_TIMEZONE;
    process.env.TZ = 'Asia/Karachi';
  }
}

// Get current timezone configuration (always returns PKT)
export function getCurrentTimezone(): TimezoneConfig {
  validateTimezone();
  return currentTimezone;
}

// Set system timezone (RESTRICTED - only allows Pakistan Time)
export function setSystemTimezone(config: TimezoneConfig): void {
  // SECURITY: Only allow Pakistan Time changes
  if (config.timezone === 'Asia/Karachi') {
    currentTimezone = config;
    process.env.TZ = 'Asia/Karachi';
  } else {
    console.warn('[TIMEZONE SECURITY] Attempted to set non-PKT timezone, blocked');
    console.warn('[TIMEZONE SECURITY] Maintaining Pakistan Time (PKT)');
  }
}

// Convert UTC timestamp to system timezone (ALWAYS PKT)
export function toSystemTimezone(date: Date | string): Date {
  validateTimezone();
  const inputDate = new Date(date);
  return toZonedTime(inputDate, 'Asia/Karachi');
}

// Format date in system timezone using date-fns-tz (ALWAYS PKT)
export function formatInSystemTimezone(date: Date | string, format: string): string {
  validateTimezone();
  const inputDate = new Date(date);
  
  // Check if input date is valid
  if (isNaN(inputDate.getTime())) {
    console.error('[TIMEZONE ERROR] Invalid date passed to formatInSystemTimezone:', date);
    return '';
  }
  
  // SECURITY: Always use Asia/Karachi regardless of currentTimezone
  const timezone = 'Asia/Karachi';
  
  switch (format) {
    case 'HH:mm:ss':
      return formatInTimeZone(inputDate, timezone, 'HH:mm:ss');
    case 'yyyy-MM-dd':
      return formatInTimeZone(inputDate, timezone, 'yyyy-MM-dd');
    case 'yyyy-MM-dd HH:mm:ss':
      return formatInTimeZone(inputDate, timezone, 'yyyy-MM-dd HH:mm:ss');
    case 'HH:mm':
      return formatInTimeZone(inputDate, timezone, 'HH:mm');
    case 'MMM dd, yyyy':
      return formatInTimeZone(inputDate, timezone, 'MMM dd, yyyy');
    default:
      return formatInTimeZone(inputDate, timezone, 'yyyy-MM-dd HH:mm:ss');
  }
}

// Get current date in system timezone (ALWAYS PKT)
export function getCurrentSystemDate(): Date {
  validateTimezone();
  return toZonedTime(new Date(), 'Asia/Karachi');
}

// Get today's date string in system timezone (ALWAYS PKT)
export function getTodayInSystemTimezone(): string {
  validateTimezone();
  return formatInTimeZone(new Date(), 'Asia/Karachi', 'yyyy-MM-dd');
}

// Get yesterday's date string in system timezone (ALWAYS PKT)
export function getYesterdayInSystemTimezone(): string {
  validateTimezone();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatInTimeZone(yesterday, 'Asia/Karachi', 'yyyy-MM-dd');
}

// Get start and end of day in system timezone (for database queries) - ALWAYS PKT
export function getSystemDayBounds(dateString: string): { start: Date; end: Date } {
  validateTimezone();
  const date = new Date(dateString + 'T00:00:00.000Z');
  const offsetMs = 5 * 60 * 60 * 1000; // Always PKT offset (UTC+5)
  
  const startUTC = new Date(date.getTime() - offsetMs);
  const endUTC = new Date(date.getTime() + (24 * 60 * 60 * 1000) - offsetMs - 1);
  
  return { start: startUTC, end: endUTC };
}

// Timezone monitoring function - prevents drift
export function monitorTimezone(): void {
  const nodeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const processTimezone = process.env.TZ;
  
  if (nodeTimezone !== 'Asia/Karachi' || processTimezone !== 'Asia/Karachi') {
    console.warn('[TIMEZONE MONITOR] Detected timezone drift:');
    console.warn(`[TIMEZONE MONITOR] Node.js timezone: ${nodeTimezone}`);
    console.warn(`[TIMEZONE MONITOR] Process timezone: ${processTimezone}`);
    console.warn('[TIMEZONE MONITOR] Forcing Pakistan Time (PKT)');
    
    // Force correction
    process.env.TZ = 'Asia/Karachi';
    currentTimezone = DEFAULT_TIMEZONE;
  }
}

// Browser timezone protection (for API responses)
export function getPKTTimestamp(): string {
  return formatInTimeZone(new Date(), 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss');
}

// Get PKT offset information
export function getPKTOffset(): { offset: string; abbreviation: string } {
  return {
    offset: '+05:00',
    abbreviation: 'PKT'
  };
}