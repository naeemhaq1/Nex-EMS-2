// Pakistan Standard Time (PKT) timezone utilities
const PKT_OFFSET = 5; // PKT is UTC+5

export const getCurrentPKTTime = (): Date => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pkt = new Date(utc + (PKT_OFFSET * 3600000));
  return pkt;
};

export const formatPKTTime = (date: Date = getCurrentPKTTime()): string => {
  return date.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const formatMobileDate = (date: Date = getCurrentPKTTime()): string => {
  return date.toLocaleDateString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatMobileTime = (date: Date = getCurrentPKTTime()): string => {
  return date.toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const isPKTBusinessHours = (date: Date = getCurrentPKTTime()): boolean => {
  const hour = date.getHours();
  return hour >= 9 && hour < 18; // 9 AM to 6 PM PKT
};

export const getPKTDateString = (date: Date = getCurrentPKTTime()): string => {
  return date.toISOString().split('T')[0];
};

export const convertToPKT = (utcDate: Date): Date => {
  const utc = utcDate.getTime();
  return new Date(utc + (PKT_OFFSET * 3600000));
};

export const convertFromPKT = (pktDate: Date): Date => {
  const pkt = pktDate.getTime();
  return new Date(pkt - (PKT_OFFSET * 3600000));
};