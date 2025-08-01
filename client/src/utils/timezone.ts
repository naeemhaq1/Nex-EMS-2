
export function toPakistanTime(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const pktOffset = 5 * 60 * 60 * 1000; // PKT is UTC+5
  return new Date(utcTime + pktOffset);
}

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

export function formatPKTDateTime(dateInput: string | Date, format: string = "YYYY-MM-DD HH:mm:ss"): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pktTime = toPakistanTime(date);

  // Handle simple time formats
  if (format === "HH:mm:ss") {
    return pktTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZone: 'UTC' // Already converted to PKT above
    });
  }

  if (format === "HH:mm") {
    return pktTime.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
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

export function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  const pktNow = toPakistanTime(now);

  for (let i = 0; i < n; i++) {
    const date = new Date(pktNow.getTime() - (i * 24 * 60 * 60 * 1000));
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
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

export function getCurrentPKTTime(): Date {
  const now = new Date();
  return toPakistanTime(now);
}
