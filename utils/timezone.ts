/**
 * Pakistan timezone utilities for consistent date/time calculations
 * Always use these functions instead of browser/system timezone
 */

export function getCurrentPakistanDate(): string {
  const now = new Date();
  // Convert to Pakistan timezone (UTC+5)
  const pktTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return pktTime.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

export function formatPakistanDate(date: Date): string {
  // Convert to Pakistan timezone (UTC+5)
  const pktTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
  return pktTime.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

export function getCurrentPKTTime(): Date {
  const now = new Date();
  // Return current time adjusted for Pakistan timezone
  return new Date(now.getTime() + (5 * 60 * 60 * 1000));
}

export function formatPKTDateTime(date: Date): string {
  const pktTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
  return pktTime.toISOString().replace('T', ' ').split('.')[0];
}

export function formatMobileDate(date: Date): string {
  const pktTime = new Date(date.getTime() + (5 * 60 * 60 * 1000));
  const today = getCurrentPakistanDate();
  const dateStr = formatPakistanDate(date);
  
  if (dateStr === today) {
    return pktTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  return pktTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}