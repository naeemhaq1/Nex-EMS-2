import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const MobileRedirect = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Aggressive mobile detection
    const detectMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Check multiple indicators
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|windows phone|mobile|tablet/.test(userAgent);
      const isMobileWidth = width <= 768;
      const isPortrait = height > width;
      const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Force mobile if ANY condition is met
      return isMobileUA || isMobileWidth || (isTouchScreen && isPortrait);
    };

    // Check and redirect if mobile
    if (detectMobile() && !window.location.pathname.startsWith('/mobile')) {
      console.log('📱 Mobile device detected - redirecting to mobile interface');
      setLocation('/mobile/admin/dashboard');
    }
  }, [setLocation]);

  return null;
};