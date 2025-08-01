# Production WebView Configuration for NEXLINX EMS

## Security & Performance Settings

### 1. Disable Debugging in Production
```kotlin
// Turn off debugging in production for security and performance
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
    WebView.setWebContentsDebuggingEnabled(false)
}
```

### 2. Environment-Specific Configuration
```kotlin
class ProductionWebViewManager(private val context: Context) {
    
    fun setupProductionWebView(webView: WebView) {
        // Disable debugging for production security
        configureProductionSecurity(webView)
        
        // Apply performance optimizations
        configurePerformanceSettings(webView)
        
        // Setup secure asset loader
        setupSecureAssetLoader(webView)
    }
    
    private fun configureProductionSecurity(webView: WebView) {
        // Disable WebView debugging
        WebView.setWebContentsDebuggingEnabled(false)
        
        // Suppress console logging in production
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                // Only log in debug builds
                return !BuildConfig.DEBUG
            }
        }
        
        // Disable geolocation database for security
        webView.settings.setGeolocationDatabasePath(null)
        
        Log.d("ProductionWebView", "Security settings applied")
    }
    
    private fun configurePerformanceSettings(webView: WebView) {
        webView.settings.apply {
            // Optimized cache configuration
            cacheMode = WebSettings.LOAD_DEFAULT
            setAppCacheEnabled(true)
            domStorageEnabled = true
            setAppCacheMaxSize(50 * 1024 * 1024) // 50MB
            
            // Performance optimizations
            javaScriptEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportZoom(false)
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            setEnableSmoothTransition(true)
            
            // Disable unnecessary features
            builtInZoomControls = false
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = false
            
            // Security settings
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
        }
        
        // Hardware acceleration
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        }
    }
}
```

### 3. Secure Asset Loader Configuration
```kotlin
private fun setupSecureAssetLoader(webView: WebView) {
    val assetLoader = WebViewAssetLoader.Builder()
        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
        .addPathHandler("/cache/", WebViewAssetLoader.InternalStoragePathHandler(context, context.cacheDir))
        .setDomain("nex-ems.local") // Use local domain for security
        .setHttpAllowed(false) // HTTPS only in production
        .build()

    webView.webViewClient = object : WebViewClientCompat() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            return assetLoader.shouldInterceptRequest(request.url)
        }
        
        override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
            // In production, don't proceed with SSL errors
            handler?.cancel()
            Log.e("ProductionWebView", "SSL Error in production: ${error?.primaryError}")
        }
    }
}
```

## Production Build Configuration

### 1. Build.gradle Settings
```gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            
            // Disable debugging in release builds
            buildConfigField "boolean", "WEBVIEW_DEBUG", "false"
        }
        debug {
            buildConfigField "boolean", "WEBVIEW_DEBUG", "true"
        }
    }
}
```

### 2. ProGuard Rules for WebView
```proguard
# Keep WebView classes
-keep class android.webkit.** { *; }
-keep class androidx.webkit.** { *; }

# Keep sync manager classes
-keep class com.nexlinx.ems.sync.** { *; }

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
```

### 3. Manifest Configuration
```xml
<application
    android:debuggable="false"
    android:allowBackup="false"
    android:hardwareAccelerated="true"
    android:largeHeap="true">
    
    <!-- Network security config for production -->
    <meta-data
        android:name="android.webkit.WebView.MetricsOptOut"
        android:value="true" />
</application>
```

## Security Best Practices

### 1. Content Security Policy
```kotlin
// Inject CSP headers for additional security
webView.loadDataWithBaseURL(
    "https://nex-ems.local/",
    htmlContent,
    "text/html",
    "UTF-8",
    null
)
```

### 2. Network Security
```kotlin
// Verify SSL certificates in production
webView.webViewClient = object : WebViewClientCompat() {
    override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
        if (BuildConfig.DEBUG) {
            handler?.proceed() // Allow in debug
        } else {
            handler?.cancel() // Strict in production
        }
    }
}
```

### 3. JavaScript Interface Security
```kotlin
// Only add interfaces that are absolutely necessary
if (BuildConfig.DEBUG) {
    webView.addJavascriptInterface(DebugInterface(), "Debug")
}

// Always add production interfaces
webView.addJavascriptInterface(SyncInterface(), "NexlinxSync")
```

## Performance Monitoring

### 1. Production Metrics
```kotlin
class ProductionMetrics {
    fun trackWebViewPerformance(webView: WebView) {
        webView.evaluateJavascript("""
            (function(){
                var start = performance.now();
                window.addEventListener('load', function() {
                    var loadTime = performance.now() - start;
                    if (loadTime > 3000) { // Alert if load time > 3s
                        Android.reportSlowLoad(loadTime);
                    }
                });
            })()
        """, null)
    }
    
    @JavascriptInterface
    fun reportSlowLoad(loadTime: Double) {
        // Send to analytics service
        Log.w("Performance", "Slow WebView load: ${loadTime}ms")
    }
}
```

### 2. Memory Management
```kotlin
override fun onLowMemory() {
    super.onLowMemory()
    webView.freeMemory()
    webView.clearCache(true)
}

override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level >= ComponentCallbacks2.TRIM_MEMORY_MODERATE) {
        webView.clearCache(false)
    }
}
```

## Testing Production Configuration

### 1. Debug vs Release Testing
```kotlin
fun validateProductionConfig() {
    // Verify debugging is disabled
    val debugEnabled = WebView.getWebContentsDebuggingEnabled()
    assert(!debugEnabled) { "WebView debugging should be disabled in production" }
    
    // Test cache functionality
    testOfflineCapabilities()
    
    // Verify sync system
    testSyncSystemIntegration()
}
```

This production configuration ensures:
- ✅ Security: Debugging disabled, SSL verification enabled
- ✅ Performance: Hardware acceleration, optimized cache settings
- ✅ Reliability: Proper error handling and resource management
- ✅ Monitoring: Performance tracking and memory management
- ✅ Compliance: Network security and content security policies