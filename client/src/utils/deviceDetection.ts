export const isMobileDevice = (): boolean => {
  // Always allow mobile access if user explicitly navigates to mobile route
  if (window.location.pathname.startsWith('/mobile')) {
    return true;
  }
  
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Mobile device patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
    /Tablet/i
  ];
  
  // Check if user agent matches mobile patterns
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  
  // Check screen width - more flexible mobile detection
  const isMobileWidth = window.innerWidth <= 768;
  
  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Mobile if width is small OR user agent indicates mobile
  return isMobileWidth || isMobileUA;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

export const supportsStandalone = (): boolean => {
  return 'standalone' in window.navigator && (window.navigator as any).standalone;
};

export const shouldRedirectToMobile = (): boolean => {
  // Check if we're already on mobile route
  if (window.location.pathname.startsWith('/mobile')) {
    return false;
  }
  
  // Check for device indicators
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Definitive mobile patterns (phones/small tablets)
  const mobilePatternsStrict = [
    /Android.*Mobile/i,
    /iPhone/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Opera Mini/i,
    /IEMobile/i
  ];
  
  // Desktop patterns (prioritize desktop when detected)
  const desktopPatterns = [
    /Windows NT.*(?!.*Mobile)/i,
    /Macintosh.*(?!.*Mobile)/i,
    /Linux.*X11.*(?!.*Mobile)/i,
    /Chrome.*(?!.*Mobile).*Safari/i
  ];
  
  // Check for explicit desktop indicators first
  const isDesktopUA = desktopPatterns.some(pattern => pattern.test(userAgent));
  const isLargeScreen = window.innerWidth >= 1024;
  
  // If clearly desktop (large screen + desktop UA), always use desktop
  if (isDesktopUA && isLargeScreen) {
    return false;
  }
  
  // Check for mobile patterns
  const isMobileUA = mobilePatternsStrict.some(pattern => pattern.test(userAgent));
  const isSmallScreen = window.innerWidth <= 768;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const hasOrientation = typeof window.orientation !== 'undefined';
  
  // Only redirect to mobile if we have strong mobile indicators
  return isMobileUA || (isSmallScreen && (isTouchDevice || hasOrientation));
};

export const shouldRedirectToDesktop = (): boolean => {
  // Never force desktop redirect - allow user choice
  return false;
};