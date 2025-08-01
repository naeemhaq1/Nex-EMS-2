# WebView Cache Configuration for NEXLINX EMS Mobile App

## Android WebView Settings
For optimal offline functionality and caching performance in the mobile APK:

```java
// Enhanced Cache Configuration for Offline-First Experience
// LOAD_DEFAULT: Uses cache when available and valid, fetches from network when needed
webView.settings.cacheMode = WebSettings.LOAD_DEFAULT;

// Offline Mode: Switch to cache-first when network unavailable
if (!isNetworkAvailable()) {
    webView.settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK;
}

// Enable comprehensive storage for better local data handling
webView.settings.setAppCacheEnabled(true);
webView.settings.domStorageEnabled = true;

// Enhanced Caching Settings
webView.settings.setDatabaseEnabled(true);
webView.settings.setJavaScriptEnabled(true);
webView.settings.setLoadWithOverviewMode(true);
webView.settings.setUseWideViewPort(true);
webView.settings.setBuiltInZoomControls(false);
webView.settings.setDisplayZoomControls(false);

// Storage and Data Settings
webView.settings.setAllowFileAccess(true);
webView.settings.setAllowContentAccess(true);
webView.settings.setAllowFileAccessFromFileURLs(true);
webView.settings.setAllowUniversalAccessFromFileURLs(true);

// Cache Size and Location
String cacheDirPath = context.getCacheDir().getAbsolutePath();
webView.settings.setAppCachePath(cacheDirPath);
webView.settings.setAppCacheMaxSize(50 * 1024 * 1024); // 50MB
```

## Cache Mode Explanation

### LOAD_DEFAULT (Primary Mode)
- **Behavior**: Uses cache when available and valid, fetches from network when needed
- **Benefits**: Optimal balance between offline capability and fresh data
- **Use Case**: Perfect for NEXLINX EMS where attendance data needs to be current but UI should work offline

### LOAD_CACHE_ELSE_NETWORK (Offline Mode)
- **Behavior**: Prioritizes cache, only fetches from network if cache unavailable
- **Benefits**: Maximum offline reliability when network is unstable
- **Use Case**: Automatic fallback when connectivity is poor or unavailable

### Alternative Cache Modes
```java
// For maximum offline capability (when testing)
webView.settings.cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK;

// For always fresh data (when debugging)
webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE;

// For cache-only mode (airplane mode testing)
webView.settings.cacheMode = WebSettings.LOAD_CACHE_ONLY;
```

## Integration with Service Worker
The WebView cache settings work in conjunction with our service worker implementation:

### Enhanced Cache Strategy Flow
1. **Dynamic Cache Mode**: LOAD_DEFAULT online → LOAD_CACHE_ELSE_NETWORK offline
2. **Service Worker**: Intercepts requests, serves from cache when offline
3. **DOM Storage**: Stores IndexedDB data for sync queue and offline metrics  
4. **App Cache**: Caches static assets (JS, CSS, images)
5. **WebView Cache**: Browser-level caching for API responses and resources
6. **Network Detection**: Automatic cache mode switching based on connectivity

### Offline Data Collection
```javascript
// Sync Manager automatically queues data when offline
await queueAttendancePunch({
  employeeId: user.username,
  action: 'in',
  timestamp: Date.now(),
  location: { latitude: 24.8607, longitude: 67.0011 },
  deviceInfo: { userAgent: navigator.userAgent }
});
```

## Performance Optimizations

### Cache Warming
```java
// Pre-load essential resources
webView.loadUrl("https://nex-ems.replit.app/mobile/employee/dashboard");
```

### Storage Cleanup
```java
// Clear cache when needed (user action)
webView.clearCache(true);
webView.clearHistory();
webView.clearFormData();
```

### Memory Management
```java
// Optimize memory usage
webView.settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
webView.settings.setCacheMode(WebSettings.LOAD_DEFAULT);
```

## Testing Cache Configuration

### Offline Mode Testing
1. Enable airplane mode
2. Launch app - should load cached dashboard
3. Perform attendance punch - queued for sync
4. Restore network - sync queue processes automatically

### Cache Verification
```java
// Check cache status
boolean isCacheEnabled = webView.settings.getAppCacheEnabled();
String cachePath = webView.settings.getAppCachePath();
long cacheSize = webView.settings.getAppCacheMaxSize();
```

## Integration Points

### Mobile Dashboard
- **Offline Metrics**: Cached dashboard data loads instantly
- **Sync Status**: Real-time indicators show pending/syncing data
- **Location Services**: GPS data cached for attendance punches

### Data Sync
- **Attendance Punches**: High priority queue, immediate sync when online
- **Location Updates**: Medium priority, batched sync every 30 seconds
- **Performance Data**: Low priority, background sync

### UI Components
- **Loading States**: Smooth transitions between offline/online modes
- **Error Handling**: Clear messages for cache vs network issues
- **Manual Controls**: User can trigger sync, clear cache, retry failed items

## Deployment Notes
- Cache settings apply to production APK builds
- Service worker registration automatic on app start
- IndexedDB storage persists between app sessions
- Sync queue survives app restarts and device reboots

## WebView Preloading & Warm-Up

### Background Initialization
```java
// Initialize WebView in background thread at app start
WebViewPreloadManager.preloadWebView(context);

// Setup asset loader for local resources
WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", new AssetsPathHandler(context))
    .addPathHandler("/cache/", new InternalStoragePathHandler(context, cacheDir))
    .setDomain("nex-ems.local")
    .build();
```

### Asset Bundle Preloading

#### Java Implementation
```java
// Preload sync system components
String[] syncAssets = {
    "syncManager.js", "offlineStorage.js", "useSyncManager.js",
    "SyncStatusIndicator.js", "useOfflineData.js"
};
WebViewPreloadManager.preloadSyncAssets(context);
```

#### Kotlin Implementation
```kotlin
val assetLoader = WebViewAssetLoader.Builder()
    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
    .build()

webView.webViewClient = object : WebViewClientCompat() {
    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        return assetLoader.shouldInterceptRequest(request.url)
    }
}

// Extension function for easy setup
fun WebView.setupNexlinxIntegration(context: Context) {
    val manager = NexlinxWebViewManager(context)
    manager.setupWebView(this)
}
```

### Service Worker Warm-Up
```javascript
// Early Service Worker registration for sync capabilities
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW preloaded for sync'));
}
```

## Benefits
- **Instant Startup**: Preloaded WebView eliminates initialization delay
- **Asset Optimization**: Local asset loader serves resources efficiently
- **Sync Ready**: Service Worker and sync components preloaded
- **Offline Work**: Full attendance functionality without internet
- **Data Security**: No data loss during network outages
- **Battery Efficient**: Reduced network requests, optimized sync intervals
- **User Experience**: Seamless online/offline transitions