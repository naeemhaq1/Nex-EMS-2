// Enhanced Service Worker for Offline Support with Request Interception
const CACHE_NAME = 'nexlinx-ems-v2.4.0';
const STATIC_CACHE_NAME = 'nexlinx-static-v2.4.0';
const API_CACHE_NAME = 'nexlinx-api-v2.4.0';
const COMPRESSED_CACHE_NAME = 'nexlinx-compressed-v2.4.0';
const OFFLINE_FALLBACK_CACHE = 'nexlinx-offline-fallback-v2.4.0';

// Static assets to cache with compression support
const STATIC_ASSETS = [
  '/',
  '/mobile/admin/dashboard',
  '/mobile/employee/dashboard',
  '/static/js/bundle.min.js',
  '/static/css/main.min.css',
  '/assets/js/syncManager.min.js',
  '/assets/js/offlineStorage.min.js',
  '/assets/css/mobile-dashboard.min.css',
  '/manifest.json'
];

// Heavy assets to lazy load
const LAZY_ASSETS = [
  '/assets/js/charts.min.js',
  '/assets/js/analytics.min.js',
  '/assets/css/charts.min.css'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = {
  // Long-term cache (24 hours) - rarely changing data
  LONG_TERM: [
    /\/api\/employees$/,
    /\/api\/admin\/employees$/,
    /\/api\/users$/,
    /\/api\/departments$/,
    /\/api\/admin\/services$/
  ],
  // Medium-term cache (6 hours) - moderately changing data
  MEDIUM_TERM: [
    /\/api\/dashboard\/metrics$/,
    /\/api\/admin\/system-metrics$/,
    /\/api\/attendance\/records$/,
    /\/api\/admin\/punch-48hour-data$/
  ],
  // Short-term cache (1 hour) - frequently changing data
  SHORT_TERM: [
    /\/api\/attendance\/today$/,
    /\/api\/mobile\/attendance\/status$/,
    /\/api\/admin\/live-activity$/
  ],
  // Network-first (30 seconds) - real-time data with fallback
  NETWORK_FIRST: [
    /\/api\/mobile\/punch$/,
    /\/api\/location\/update$/,
    /\/api\/auth\/me$/
  ]
};

// Cache duration in milliseconds
const CACHE_DURATION = {
  LONG_TERM: 24 * 60 * 60 * 1000,    // 24 hours
  MEDIUM_TERM: 6 * 60 * 60 * 1000,   // 6 hours
  SHORT_TERM: 60 * 60 * 1000,        // 1 hour
  NETWORK_FIRST: 30 * 1000           // 30 seconds
};

self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('[SW] API cache initialized');
        return cache;
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME &&
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheStrategy = getCacheStrategy(url.pathname);
  
  try {
    switch (cacheStrategy.type) {
      case 'LONG_TERM':
      case 'MEDIUM_TERM':
      case 'SHORT_TERM':
        return await cacheFirstStrategy(request, cacheStrategy);
      
      case 'NETWORK_FIRST':
        return await networkFirstStrategy(request, cacheStrategy);
      
      default:
        return await networkOnlyStrategy(request);
    }
  } catch (error) {
    console.error('[SW] API request failed:', error);
    return await getCachedResponseOrOfflineResponse(request);
  }
}

async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static request failed:', error);
    
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return cache.match('/') || new Response('Offline - Please check your connection');
    }
    
    return new Response('Resource not available offline', { status: 404 });
  }
}

async function cacheFirstStrategy(request, cacheStrategy) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Check if cached response is still valid
  if (cachedResponse) {
    const cachedTime = new Date(cachedResponse.headers.get('sw-cached-time'));
    const now = new Date();
    const age = now.getTime() - cachedTime.getTime();
    
    if (age < cacheStrategy.duration) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
  }
  
  // Fetch fresh data
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-time': new Date().toISOString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
      console.log('[SW] Cached fresh response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, serving stale cache:', request.url);
    return cachedResponse || createOfflineResponse();
  }
}

async function networkFirstStrategy(request, cacheStrategy) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      const responseClone = networkResponse.clone();
      const responseWithTimestamp = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cached-time': new Date().toISOString()
        }
      });
      
      cache.put(request, responseWithTimestamp);
      console.log('[SW] Network-first cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    return cachedResponse || createOfflineResponse();
  }
}

async function networkOnlyStrategy(request) {
  return fetch(request);
}

async function getCachedResponseOrOfflineResponse(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  return cachedResponse || createOfflineResponse();
}

function getCacheStrategy(pathname) {
  for (const [type, patterns] of Object.entries(API_CACHE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(pathname))) {
      return {
        type,
        duration: CACHE_DURATION[type]
      };
    }
  }
  
  return { type: 'NETWORK_ONLY', duration: 0 };
}

function createOfflineResponse() {
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'This data is not available offline',
    offline: true,
    timestamp: new Date().toISOString()
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'sw-offline-response': 'true'
    }
  });
}

// Background sync for pending actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-attendance') {
    event.waitUntil(syncPendingAttendance());
  }
  
  if (event.tag === 'background-sync-location') {
    event.waitUntil(syncPendingLocation());
  }
});

async function syncPendingAttendance() {
  console.log('[SW] Syncing pending attendance data...');
  // Implementation would sync pending punch data when online
}

async function syncPendingLocation() {
  console.log('[SW] Syncing pending location data...');
  // Implementation would sync pending location updates when online
}

// Listen for messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    clearAllCaches();
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}