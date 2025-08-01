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
  
  // PRIORITY 1: Screen size is the primary indicator
  const isSmallScreen = window.innerWidth <= 768;
  const isMediumScreen = window.innerWidth <= 1024;
  
  // PRIORITY 2: Touch capability
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const hasOrientation = typeof window.orientation !== 'undefined';
  
  // PRIORITY 3: User agent patterns
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Mobile device patterns
  const mobilePatternsStrict = [
    /Android.*Mobile/i,
    /iPhone/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Opera Mini/i,
    /IEMobile/i
  ];
  
  const isMobileUA = mobilePatternsStrict.some(pattern => pattern.test(userAgent));
  
  // DECISION LOGIC: Prioritize screen size
  // Small screen (≤768px) = always use mobile
  if (isSmallScreen) {
    return true;
  }
  
  // Medium screen (769-1024px) + touch = use mobile
  if (isMediumScreen && (isTouchDevice || hasOrientation)) {
    return true;
  }
  
  // Mobile user agent = use mobile (even on larger screens for phones in landscape)
  if (isMobileUA) {
    return true;
  }
  
  // Default to desktop for large screens without mobile indicators
  return false;
};

export const shouldRedirectToDesktop = (): boolean => {
  // Never force desktop redirect - allow user choice
  return false;
};