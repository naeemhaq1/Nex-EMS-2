import { format, parseISO, formatInTimeZone } from 'date-fns-tz';
import { format as formatDate } from 'date-fns';

// Pakistan Standard Time utilities
export const PAKISTAN_TIMEZONE = 'Asia/Karachi';

export function getCurrentPKTTime(): Date {
  return new Date();
}

export function formatPKTTime(date: Date | string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, PAKISTAN_TIMEZONE, formatString);
}

export function formatMobileDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, PAKISTAN_TIMEZONE, 'MMM dd, yyyy');
}

export function formatMobileTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, PAKISTAN_TIMEZONE, 'HH:mm');
}

export function formatMobileDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, PAKISTAN_TIMEZONE, 'MMM dd, HH:mm');
}

export function getPKTNow(): string {
  return formatPKTTime(new Date());
}

export function isPKTBusinessHours(date?: Date): boolean {
  const checkDate = date || new Date();
  const pktTime = formatInTimeZone(checkDate, PAKISTAN_TIMEZONE, 'HH:mm');
  const [hours] = pktTime.split(':').map(Number);
  return hours >= 9 && hours < 18;
}