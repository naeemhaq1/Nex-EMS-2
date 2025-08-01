import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

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
    // Immediate loader hiding for faster perceived performance
    console.log('React mounted, hiding loader immediately');
    hideInitialLoader();
    
    // Pre-initialize critical app components
    const preInitTimer = setTimeout(() => {
      // Pre-warm critical routes and contexts
      console.log('Pre-warming critical components');
    }, 50);
    
    return () => clearTimeout(preInitTimer);
  }, []);
  
  return <App />;
}

root.render(<AppWithLoader />);
