import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

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