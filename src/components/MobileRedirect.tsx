
import React, { useEffect, useState } from 'react';

export default function MobileRedirect() {
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run once per session
    if (hasChecked || sessionStorage.getItem('mobile-redirect-checked') === 'true') {
      return;
    }

    // Mark as checked immediately to prevent loops
    sessionStorage.setItem('mobile-redirect-checked', 'true');
    setHasChecked(true);

    // Don't redirect if already on mobile route
    if (window.location.pathname.startsWith('/mobile')) {
      return;
    }

    // Check if user explicitly chose desktop
    if (localStorage.getItem('force-desktop') === 'true') {
      return;
    }

    // Simple mobile detection
    const isMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      
      // Mobile user agent patterns
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

    // Delay to prevent flash
    const timeoutId = setTimeout(() => {
      if (isMobile()) {
        console.log('📱 Mobile detected - redirecting');
        window.location.replace('/mobile');
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [hasChecked]);

  return null;
}
