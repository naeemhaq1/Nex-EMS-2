
import { format, toZonedTime } from 'date-fns-tz';

const PKT_TIMEZONE = 'Asia/Karachi';

export const getCurrentPKTTime = (): Date => {
  return toZonedTime(new Date(), PKT_TIMEZONE);
};

export const formatToPKT = (date: Date, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string => {
  const zonedDate = toZonedTime(date, PKT_TIMEZONE);
  return format(zonedDate, formatString, { timeZone: PKT_TIMEZONE });
};

export const formatMobileDate = (date: Date): string => {
  return formatToPKT(date, 'MMM dd, yyyy');
};

export const formatMobileTime = (date: Date): string => {
  return formatToPKT(date, 'HH:mm');
};

export const formatMobileDateTime = (date: Date): string => {
  return formatToPKT(date, 'MMM dd, HH:mm');
};

export const getPKTTimestamp = (): string => {
  return formatToPKT(new Date(), 'yyyy-MM-dd HH:mm:ss');
};

export const convertToPKT = (utcDate: Date): Date => {
  return toZonedTime(utcDate, PKT_TIMEZONE);
};

// Default export for backward compatibility
export default {
  getCurrentPKTTime,
  formatToPKT,
  formatMobileDate,
  formatMobileTime,
  formatMobileDateTime,
  getPKTTimestamp,
  convertToPKT,
};
