export function toPakistanTime(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const pktOffset = 5 * 60 * 60 * 1000; // PKT is UTC+5
  return new Date(utcTime + pktOffset);
}

export function formatTime24h(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime12h(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getCurrentPKTTime(): Date {
  const now = new Date();
  return toPakistanTime(now);
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTimeForDisplay(date: Date): string {
  return `${formatDateForDisplay(date)} ${formatTime12h(date)}`;
}