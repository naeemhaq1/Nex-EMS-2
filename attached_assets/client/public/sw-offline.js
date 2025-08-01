// NEXLINX EMS - Enhanced Service Worker with Comprehensive Offline Support
// Intercepts requests and serves cached data when offline

const CACHE_VERSION = '2.5.0';
const STATIC_CACHE = `nexlinx-static-${CACHE_VERSION}`;
const API_CACHE = `nexlinx-api-${CACHE_VERSION}`;
const OFFLINE_CACHE = `nexlinx-offline-${CACHE_VERSION}`;
const FAILED_REQUESTS_CACHE = `nexlinx-failed-${CACHE_VERSION}`;

// Critical API endpoints to cache for offline functionality
const CRITICAL_APIS = [
  '/api/auth/me',
  '/api/dashboard/metrics',
  '/api/employees/me',
  '/api/admin/services',
  '/api/admin/system-metrics',
  '/api/admin/unified-metrics',
  '/api/admin/today-performance',
  '/api/admin/yesterday-performance'
];

// Static assets for offline operation
const STATIC_ASSETS = [
  '/',
  '/mobile/admin/dashboard',
  '/mobile/employee/dashboard',
  '/static/js/bundle.min.js',
  '/static/css/main.min.css',
  '/assets/js/syncManager.min.js',
  '/assets/js/offlineStorage.min.js',
  '/manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  console.log('[SW] Installing offline-enabled service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
      }),
      
      // Initialize API cache
      caches.open(API_CACHE).then(cache => {
        console.log('[SW] Initializing API cache');
        return cache;
      }),
      
      // Cache offline fallback responses
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('[SW] Caching offline fallbacks');
        const offlineResponses = {
          '/api/dashboard/metrics': {
            totalActiveUsers: 0,
            totalSystemUsers: 0,
            attendanceRate: 0,
            status: 'offline',
            message: 'Data from cache - offline mode'
          },
          '/api/admin/services': [],
          '/api/admin/system-metrics': {
            uptime: '0d 0h 0m',
            status: 'offline',
            message: 'System offline'
          },
          '/api/admin/unified-metrics': {
            today: { date: new Date().toISOString().split('T')[0], attendanceCount: 0 },
            status: 'offline'
          }
        };
        
        return Promise.all(
          Object.entries(offlineResponses).map(([url, data]) => {
            const response = new Response(JSON.stringify(data), {
              headers: { 
                'Content-Type': 'application/json',
                'X-Offline-Fallback': 'true',
                'X-Cache-Date': new Date().toISOString()
              }
            });
            return cache.put(url, response);
          })
        );
      }),
      
      // Initialize failed requests cache
      caches.open(FAILED_REQUESTS_CACHE)
    ])
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating offline service worker');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Enhanced fetch handler with request interception and offline support
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) return;
  
  // Handle API requests with offline support
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

// API request handler with comprehensive offline support
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isCriticalAPI = CRITICAL_APIS.some(api => url.pathname.startsWith(api));
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      if (isCriticalAPI && request.method === 'GET') {
        const cache = await caches.open(API_CACHE);
        const responseClone = networkResponse.clone();
        
        // Add cache metadata
        const responseWithMetadata = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: {
            ...Object.fromEntries(responseClone.headers.entries()),
            'X-Cached-At': new Date().toISOString(),
            'X-Cache-Type': 'network-fresh'
          }
        });
        
        await cache.put(request, responseWithMetadata);
        console.log('[SW] Cached fresh API response:', url.pathname);
      }
      
      return networkResponse;
    } else {
      throw new Error(`HTTP ${networkResponse.status}`);
    }
  } catch (error) {
    console.log('[SW] Network failed for API:', url.pathname, error.message);
    
    // Try to serve from cache when network fails
    return await getCachedAPIResponse(request) || 
           await getOfflineFallback(request) ||
           createOfflineResponse(request);
  }
}

// Get cached API response
async function getCachedAPIResponse(request) {
  const cached = await caches.match(request, { cacheName: API_CACHE });
  if (cached) {
    console.log('[SW] Serving cached API response:', request.url);
    
    // Add offline indicator to cached responses
    const cachedData = await cached.json();
    const offlineData = {
      ...cachedData,
      _offline: true,
      _cachedAt: cached.headers.get('X-Cached-At') || 'unknown'
    };
    
    return new Response(JSON.stringify(offlineData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Served-From': 'cache',
        'X-Offline-Mode': 'true'
      }
    });
  }
  return null;
}

// Get offline fallback response
async function getOfflineFallback(request) {
  const fallback = await caches.match(request, { cacheName: OFFLINE_CACHE });
  if (fallback) {
    console.log('[SW] Serving offline fallback:', request.url);
    return fallback;
  }
  return null;
}

// Create dynamic offline response
function createOfflineResponse(request) {
  const url = new URL(request.url);
  console.log('[SW] Creating offline response for:', url.pathname);
  
  const offlineData = {
    error: 'Offline',
    message: 'This data is not available offline. Please check your connection.',
    endpoint: url.pathname,
    timestamp: new Date().toISOString(),
    _offline: true
  };
  
  return new Response(JSON.stringify(offlineData), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'X-Offline-Response': 'generated',
      'X-Service-Worker': 'nexlinx-offline'
    }
  });
}

// Static asset handler with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Check cache first for better performance
    const cached = await caches.match(request, { cacheName: STATIC_CACHE });
    if (cached) {
      // Serve from cache and update in background
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(STATIC_CACHE).then(cache => {
            cache.put(request, networkResponse);
          });
        }
      }).catch(() => {}); // Silent background update
      
      return cached;
    }
    
    // Fallback to network if not in cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset failed:', request.url);
    
    // Try to find any cached version
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Ultimate fallback
    return new Response('Offline - Asset not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncFailedRequests());
  }
});

// Sync failed requests when back online
async function syncFailedRequests() {
  try {
    const cache = await caches.open(FAILED_REQUESTS_CACHE);
    const requests = await cache.keys();
    
    console.log(`[SW] Syncing ${requests.length} failed requests`);
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          // Cache successful response
          const apiCache = await caches.open(API_CACHE);
          await apiCache.put(request, response.clone());
          
          // Remove from failed requests
          await cache.delete(request);
          
          console.log('[SW] Successfully synced:', request.url);
          
          // Notify clients about successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                url: request.url,
                timestamp: new Date().toISOString()
              });
            });
          });
        }
      } catch (error) {
        console.log('[SW] Sync failed for:', request.url, error.message);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync error:', error);
  }
}

// Message handler for communication with web app
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'FORCE_SYNC':
      syncFailedRequests().then(() => {
        event.ports[0].postMessage({ synced: true });
      });
      break;
  }
});

// Get cache status information
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return {
    caches: status,
    version: CACHE_VERSION,
    timestamp: new Date().toISOString()
  };
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

console.log('[SW] NEXLINX EMS Offline Service Worker loaded');