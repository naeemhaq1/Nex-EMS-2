# WebView Asset Optimization for NEXLINX EMS

## Minification & Compression

### 1. Build Configuration
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            // Enable asset compression
            buildConfigField "boolean", "ENABLE_COMPRESSION", "true"
        }
    }
    
    // Asset compression configuration
    aaptOptions {
        cruncherEnabled = true
        useNewCruncher = true
    }
}
```

### 2. Asset Preprocessing Script
```kotlin
class AssetOptimizer {
    
    fun optimizeAssets(context: Context) {
        // Compress and minify sync system assets
        compressJavaScriptAssets()
        compressCSSAssets()
        optimizeImages()
        enableGzipCompression()
    }
    
    private fun compressJavaScriptAssets() {
        val jsAssets = arrayOf(
            "syncManager.js",
            "offlineStorage.js", 
            "useSyncManager.js",
            "SyncStatusIndicator.js",
            "useOfflineData.js"
        )
        
        jsAssets.forEach { asset ->
            compressAndCache(asset, "js")
        }
    }
    
    private fun compressCSSAssets() {
        val cssAssets = arrayOf(
            "mobile-dashboard.css",
            "sync-components.css",
            "offline-indicators.css"
        )
        
        cssAssets.forEach { asset ->
            compressAndCache(asset, "css")
        }
    }
    
    private fun compressAndCache(assetName: String, type: String) {
        try {
            val inputStream = context.assets.open("$type/$assetName")
            val compressed = compressWithGzip(inputStream.readBytes())
            
            // Cache compressed version
            val cacheFile = File(context.cacheDir, "compressed_$assetName.gz")
            cacheFile.writeBytes(compressed)
            
            Log.d("AssetOptimizer", "Compressed $assetName: ${compressed.size} bytes")
            
        } catch (e: Exception) {
            Log.e("AssetOptimizer", "Failed to compress $assetName", e)
        }
    }
    
    private fun compressWithGzip(data: ByteArray): ByteArray {
        val outputStream = ByteArrayOutputStream()
        GZIPOutputStream(outputStream).use { gzipStream ->
            gzipStream.write(data)
        }
        return outputStream.toByteArray()
    }
}
```

### 3. Enhanced Asset Loader with Compression
```kotlin
class OptimizedAssetLoader(private val context: Context) {
    
    private val assetLoader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", CompressedAssetsHandler(context))
        .addPathHandler("/cache/", CachePathHandler(context))
        .setDomain("nex-ems.local")
        .build()
    
    inner class CompressedAssetsHandler(private val context: Context) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            return try {
                // Check for compressed version first
                val compressedPath = "compressed_$path.gz"
                val compressedFile = File(context.cacheDir, compressedPath)
                
                if (compressedFile.exists()) {
                    // Serve compressed asset with appropriate headers
                    val inputStream = FileInputStream(compressedFile)
                    val mimeType = getMimeType(path)
                    
                    val headers = mapOf(
                        "Content-Encoding" to "gzip",
                        "Cache-Control" to "max-age=3600",
                        "Vary" to "Accept-Encoding"
                    )
                    
                    WebResourceResponse(mimeType, "utf-8", 200, "OK", headers, inputStream)
                } else {
                    // Fallback to original asset
                    serveOriginalAsset(path)
                }
            } catch (e: Exception) {
                Log.e("OptimizedAssetLoader", "Failed to serve asset: $path", e)
                null
            }
        }
        
        private fun serveOriginalAsset(path: String): WebResourceResponse? {
            return try {
                val inputStream = context.assets.open(path)
                val mimeType = getMimeType(path)
                WebResourceResponse(mimeType, "utf-8", inputStream)
            } catch (e: Exception) {
                null
            }
        }
        
        private fun getMimeType(path: String): String {
            return when {
                path.endsWith(".js") -> "application/javascript"
                path.endsWith(".css") -> "text/css"
                path.endsWith(".html") -> "text/html"
                path.endsWith(".png") -> "image/png"
                path.endsWith(".jpg") || path.endsWith(".jpeg") -> "image/jpeg"
                path.endsWith(".svg") -> "image/svg+xml"
                else -> "application/octet-stream"
            }
        }
    }
}
```

## Lazy Loading Implementation

### 1. JavaScript Lazy Loading Strategy
```javascript
// Lazy load heavy sync components
class LazyComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.componentQueue = [];
    }
    
    // Load sync manager only when needed
    async loadSyncManager() {
        if (this.loadedComponents.has('syncManager')) return;
        
        try {
            const script = document.createElement('script');
            script.src = '/assets/js/syncManager.min.js';
            script.onload = () => {
                this.loadedComponents.add('syncManager');
                console.log('🔄 Sync Manager loaded lazily');
            };
            document.head.appendChild(script);
        } catch (error) {
            console.error('Failed to load sync manager:', error);
        }
    }
    
    // Load chart components after initial UI
    async loadChartComponents() {
        if (this.loadedComponents.has('charts')) return;
        
        return new Promise((resolve) => {
            // Wait for initial UI to load
            setTimeout(async () => {
                try {
                    const chartScript = document.createElement('script');
                    chartScript.src = '/assets/js/chart-components.min.js';
                    chartScript.onload = () => {
                        this.loadedComponents.add('charts');
                        console.log('📊 Chart components loaded lazily');
                        resolve();
                    };
                    document.head.appendChild(chartScript);
                } catch (error) {
                    console.error('Failed to load chart components:', error);
                    resolve();
                }
            }, 1000); // Load after 1 second delay
        });
    }
    
    // Load offline data components on demand
    async loadOfflineComponents() {
        if (this.loadedComponents.has('offline')) return;
        
        const offlineScript = document.createElement('script');
        offlineScript.src = '/assets/js/offline-components.min.js';
        offlineScript.onload = () => {
            this.loadedComponents.add('offline');
            console.log('📱 Offline components loaded lazily');
        };
        document.head.appendChild(offlineScript);
    }
}

// Initialize lazy loader
const lazyLoader = new LazyComponentLoader();

// Load components based on user interaction
window.addEventListener('load', () => {
    // Load sync manager immediately for core functionality
    lazyLoader.loadSyncManager();
    
    // Load charts after initial render
    requestAnimationFrame(() => {
        lazyLoader.loadChartComponents();
    });
    
    // Load offline components when going offline
    window.addEventListener('offline', () => {
        lazyLoader.loadOfflineComponents();
    });
});
```

### 2. Progressive Asset Loading
```kotlin
class ProgressiveAssetLoader(private val webView: WebView) {
    
    fun loadAssetsProgressively() {
        // Phase 1: Critical assets for initial render
        loadCriticalAssets()
        
        // Phase 2: Secondary assets after initial load
        webView.setWebViewClient(object : WebViewClientCompat() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                loadSecondaryAssets()
                
                // Phase 3: Heavy components after user interaction
                scheduleHeavyComponents()
            }
        })
    }
    
    private fun loadCriticalAssets() {
        val criticalAssets = """
            // Load essential sync functionality
            const essentialAssets = [
                '/assets/js/core-sync.min.js',
                '/assets/css/critical.min.css'
            ];
            
            essentialAssets.forEach(asset => {
                const element = asset.endsWith('.css') ? 
                    document.createElement('link') : 
                    document.createElement('script');
                    
                if (asset.endsWith('.css')) {
                    element.rel = 'stylesheet';
                    element.href = asset;
                } else {
                    element.src = asset;
                }
                
                document.head.appendChild(element);
            });
        """.trimIndent()
        
        webView.evaluateJavascript(criticalAssets, null)
    }
    
    private fun loadSecondaryAssets() {
        val secondaryAssets = """
            // Load secondary functionality
            setTimeout(() => {
                const secondaryAssets = [
                    '/assets/js/dashboard-components.min.js',
                    '/assets/css/dashboard.min.css'
                ];
                
                secondaryAssets.forEach(asset => {
                    const element = asset.endsWith('.css') ? 
                        document.createElement('link') : 
                        document.createElement('script');
                        
                    if (asset.endsWith('.css')) {
                        element.rel = 'stylesheet';
                        element.href = asset;
                    } else {
                        element.src = asset;
                    }
                    
                    document.head.appendChild(element);
                });
            }, 500);
        """.trimIndent()
        
        webView.evaluateJavascript(secondaryAssets, null)
    }
    
    private fun scheduleHeavyComponents() {
        val heavyComponents = """
            // Load heavy components after user interaction
            let interactionStarted = false;
            
            const loadHeavyComponents = () => {
                if (interactionStarted) return;
                interactionStarted = true;
                
                const heavyAssets = [
                    '/assets/js/charts.min.js',
                    '/assets/js/analytics.min.js',
                    '/assets/css/charts.min.css'
                ];
                
                heavyAssets.forEach(asset => {
                    const element = asset.endsWith('.css') ? 
                        document.createElement('link') : 
                        document.createElement('script');
                        
                    if (asset.endsWith('.css')) {
                        element.rel = 'stylesheet';
                        element.href = asset;
                    } else {
                        element.src = asset;
                        element.async = true;
                    }
                    
                    document.head.appendChild(element);
                });
            };
            
            // Load on first user interaction
            ['click', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, loadHeavyComponents, { once: true });
            });
            
            // Fallback: load after 3 seconds
            setTimeout(loadHeavyComponents, 3000);
        """.trimIndent()
        
        webView.evaluateJavascript(heavyComponents, null)
    }
}
```

## Image Optimization

### 1. WebP Conversion and Compression
```kotlin
class ImageOptimizer(private val context: Context) {
    
    fun optimizeImages() {
        val imageAssets = arrayOf(
            "nexlinx_logo.png",
            "dashboard_bg.jpg", 
            "sync_icons.png"
        )
        
        imageAssets.forEach { image ->
            convertToWebP(image)
            createCompressedVersions(image)
        }
    }
    
    private fun convertToWebP(imageName: String) {
        try {
            val inputStream = context.assets.open("images/$imageName")
            val bitmap = BitmapFactory.decodeStream(inputStream)
            
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.WEBP, 80, outputStream)
            
            val webpFile = File(context.cacheDir, imageName.replace(".png", ".webp").replace(".jpg", ".webp"))
            webpFile.writeBytes(outputStream.toByteArray())
            
            Log.d("ImageOptimizer", "Converted $imageName to WebP")
            
        } catch (e: Exception) {
            Log.e("ImageOptimizer", "Failed to convert $imageName to WebP", e)
        }
    }
    
    private fun createCompressedVersions(imageName: String) {
        // Create multiple sizes for responsive loading
        val sizes = arrayOf(1x, 2x, 3x) // Different density versions
        
        sizes.forEach { density ->
            createDensityVersion(imageName, density)
        }
    }
}
```

## Service Worker with Compression Support
```javascript
// Enhanced Service Worker with compression
const CACHE_NAME = 'nexlinx-v1';
const COMPRESSED_CACHE = 'nexlinx-compressed-v1';

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Return cached version if available
            if (response) {
                return response;
            }
            
            // Fetch and compress for future use
            return fetch(event.request).then(fetchResponse => {
                // Clone response for caching
                const responseClone = fetchResponse.clone();
                
                // Cache compressed version for text resources
                if (shouldCompress(event.request.url)) {
                    cacheCompressedVersion(event.request, responseClone);
                }
                
                return fetchResponse;
            });
        })
    );
});

function shouldCompress(url) {
    return url.includes('.js') || url.includes('.css') || url.includes('.html');
}

async function cacheCompressedVersion(request, response) {
    const cache = await caches.open(COMPRESSED_CACHE);
    
    try {
        const responseText = await response.text();
        const compressed = await compressText(responseText);
        
        const compressedResponse = new Response(compressed, {
            headers: {
                ...response.headers,
                'Content-Encoding': 'gzip'
            }
        });
        
        await cache.put(request, compressedResponse);
    } catch (error) {
        console.error('Failed to cache compressed version:', error);
    }
}
```

## Performance Benefits

✅ **Reduced Bundle Size**: Minification reduces JS/CSS by 30-50%
✅ **Faster Load Times**: Gzip compression reduces transfer by 60-80%
✅ **Progressive Loading**: Critical path loads first, heavy components lazy loaded
✅ **Image Optimization**: WebP format reduces image size by 25-35%
✅ **Cached Compression**: Pre-compressed assets served instantly
✅ **Memory Efficiency**: Components loaded only when needed

This optimization strategy ensures the WebView APK loads quickly and uses minimal bandwidth while maintaining full functionality.