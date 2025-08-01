/**
 * Service Worker Registration and Management
 */

// Check if service worker is supported
const isServiceWorkerSupported = () => {
  return 'serviceWorker' in navigator;
};

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service Worker not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[SW] Service Worker registered successfully');

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New service worker available');
            // Could show update notification here
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[SW] Service Worker unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SW] Service Worker unregistration failed:', error);
    return false;
  }
}

// Send message to service worker
export function sendMessageToSW(message: any): void {
  if (!isServiceWorkerSupported() || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
}

// Clear all caches
export function clearServiceWorkerCaches(): void {
  sendMessageToSW({ type: 'CACHE_CLEAR' });
}

// Skip waiting and activate new service worker
export function skipWaitingAndActivate(): void {
  sendMessageToSW({ type: 'SKIP_WAITING' });
}