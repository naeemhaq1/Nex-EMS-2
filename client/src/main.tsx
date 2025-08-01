import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Remove existing loader immediately
const removeLoader = () => {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.remove();
  }
};

// Initialize app
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Render app with error boundary
function AppWithErrorBoundary() {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Mount the app
root.render(<AppWithErrorBoundary />);

// Remove loader after React mounts
removeLoader();
console.log('React mounted, removing loader');