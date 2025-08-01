import React, { useEffect, useState } from 'react';
import { shouldRedirectToMobile } from '../utils/deviceDetection';

export default function MobileRedirect() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent multiple redirect checks
    if (isRedirecting) return;

    // Small delay to prevent flash
    const timeoutId = setTimeout(() => {
      if (shouldRedirectToMobile()) {
        setIsRedirecting(true);
        // Use replace instead of href to prevent back button issues
        window.location.replace('/mobile');
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isRedirecting]);

  // Don't render anything to prevent flash
  return null;
}