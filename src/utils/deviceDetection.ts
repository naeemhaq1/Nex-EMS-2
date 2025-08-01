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
  // Never redirect if already on mobile route
  if (window.location.pathname.startsWith('/mobile')) {
    return false;
  }
  
  // Never redirect if user explicitly chose desktop
  if (localStorage.getItem('force-desktop') === 'true') {
    return false;
  }
  
  // Simple, reliable mobile detection
  const userAgent = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  
  // Clear mobile patterns
  const mobilePatterns = [
    /android.*mobile/i,
    /iphone/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i,
    /opera mini/i
  ];
  
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isSmallScreen = width <= 768;
  const isTouchDevice = 'ontouchstart' in window;
  
  return isMobileUA || (isSmallScreen && isTouchDevice);
};

export const shouldRedirectToDesktop = (): boolean => {
  // Never force desktop redirect - allow user choice
  return false;
};