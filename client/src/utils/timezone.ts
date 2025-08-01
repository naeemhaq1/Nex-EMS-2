import { format, addHours } from 'date-fns';

// Pakistan timezone is UTC+5
const PKT_OFFSET = 5;

export const getCurrentPKTTime = (): Date => {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  return addHours(utc, PKT_OFFSET);
};

export const formatPKTTime = (date: Date, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string => {
  const pktTime = getCurrentPKTTime();
  return format(pktTime, formatString);
};

export const formatMobileDate = (date: Date): string => {
  return formatPKTTime(date, 'MMM dd, yyyy');
};

export const formatMobileTime = (date: Date): string => {
  return formatPKTTime(date, 'HH:mm');
};

export const formatMobileDateTime = (date: Date): string => {
  return formatPKTTime(date, 'MMM dd, HH:mm');
};

export const getPKTTimestamp = (): string => {
  return getCurrentPKTTime().toISOString();
};

export const convertToPKT = (utcDate: Date): Date => {
  return addHours(utcDate, PKT_OFFSET);
};

export const convertToUTC = (pktDate: Date): Date => {
  return addHours(pktDate, -PKT_OFFSET);
};