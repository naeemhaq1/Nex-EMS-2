
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const PKT_TIMEZONE = 'Asia/Karachi';

export function getCurrentPKTTime(): Date {
  return toZonedTime(new Date(), PKT_TIMEZONE);
}

export function formatPKTTime(date: Date, formatStr: string = 'PPpp'): string {
  const pktTime = toZonedTime(date, PKT_TIMEZONE);
  return format(pktTime, formatStr);
}

export function formatMobileDate(date: Date): string {
  return formatPKTTime(date, 'MMM dd, yyyy');
}

export function formatMobileTime(date: Date): string {
  return formatPKTTime(date, 'HH:mm');
}

export function formatMobileDateTime(date: Date): string {
  return formatPKTTime(date, 'MMM dd, HH:mm');
}

export function isPKTWorkingHours(date: Date = new Date()): boolean {
  const pktTime = toZonedTime(date, PKT_TIMEZONE);
  const hour = pktTime.getHours();
  const day = pktTime.getDay();
  
  // Monday to Friday, 9 AM to 6 PM PKT
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
}

export function convertToPKT(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(inputDate, PKT_TIMEZONE);
}

export function formatForAPI(date: Date): string {
  return date.toISOString();
}

export function getTimezoneOffset(): string {
  return '+05:00'; // PKT is UTC+5
}

export function isToday(date: Date): boolean {
  const pktToday = getCurrentPKTTime();
  const pktDate = convertToPKT(date);
  
  return pktToday.toDateString() === pktDate.toDateString();
}

export function isYesterday(date: Date): boolean {
  const pktToday = getCurrentPKTTime();
  const pktYesterday = new Date(pktToday);
  pktYesterday.setDate(pktYesterday.getDate() - 1);
  
  const pktDate = convertToPKT(date);
  
  return pktYesterday.toDateString() === pktDate.toDateString();
}

export function getStartOfDay(date: Date = new Date()): Date {
  const pktDate = convertToPKT(date);
  pktDate.setHours(0, 0, 0, 0);
  return pktDate;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const pktDate = convertToPKT(date);
  pktDate.setHours(23, 59, 59, 999);
  return pktDate;
}
