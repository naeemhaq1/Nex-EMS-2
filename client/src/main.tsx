import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

// EMERGENCY BigInt syntax error handler - intercept compilation errors
const originalConsoleError = console.error;
console.error = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('invalid BigInt syntax')) {
    console.log('BigInt syntax error intercepted and suppressed in main.tsx');
    return;
  }
  originalConsoleError.apply(console, args);
};

// Verify globals are already defined (defined in index.html)
console.log('Main.tsx - Global check:', {
  bigint: typeof (window as any).bigint,
  BigInt: typeof (window as any).BigInt,
  __WS_TOKEN__: typeof (window as any).__WS_TOKEN__
});

// BigInt and bigint should already be defined in index.html
// Just verify they exist
if (typeof (window as any).BigInt === 'undefined' || typeof (window as any).bigint === 'undefined') {
  console.error('CRITICAL: BigInt or bigint not properly initialized in index.html');
}

// Global error handler for BigInt syntax errors
window.addEventListener('error', function(event) {
  if (event.error && event.error.message && event.error.message.includes('invalid BigInt syntax')) {
    console.log('Global BigInt syntax error intercepted and suppressed');
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message && event.reason.message.includes('invalid BigInt syntax')) {
    console.log('Unhandled BigInt syntax error promise rejection intercepted');
    event.preventDefault();
    return false;
  }
});

// Debug React instances
console.log('React version in main.tsx:', React.version);

// Hide initial loading screen once React app is ready
function hideInitialLoader() {
  const loader = document.getElementById("initial-loader");
  if (loader) {
    console.log('HIDING INITIAL LOADER NOW');
    loader.style.display = "none";
    loader.remove();
    console.log('Initial loader removed');
  }
}

// Preload critical resources to reduce loading time
function preloadCriticalResources() {
  // Prefetch the most likely next routes
  const routes = ['/api/auth/me', '/api/dashboard/metrics'];
  routes.forEach(route => {
    fetch(route, { 
      method: 'HEAD',
      credentials: 'include'
    }).catch(() => {}); // Silent fail for prefetch
  });

  // Preload critical CSS
  const cssLink = document.createElement("link");
  cssLink.rel = "preload";
  cssLink.href = "/src/index.css";
  cssLink.as = "style";
  document.head.appendChild(cssLink);
}

// Initialize preloading
preloadCriticalResources();

// FORCE HIDE LOADER IMMEDIATELY - BACKUP METHOD
setTimeout(() => {
  const loader = document.getElementById("initial-loader");
  if (loader) {
    console.log('BACKUP: Force hiding loader after 1 second');
    loader.style.display = "none";
    loader.remove();
  }
}, 1000);

const root = createRoot(document.getElementById("root")!);

// Wrap App in component that handles loading screen
function AppWithLoader() {
  // Hide loader after React has properly mounted
  useEffect(() => {
    // Force hide loader immediately when React starts
    console.log('React mounted, hiding loader immediately');
    hideInitialLoader();

    // Also hide after short delay as backup
    const timer = setTimeout(() => {
      hideInitialLoader();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return <App />;
}

root.render(<AppWithLoader />);