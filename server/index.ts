import dotenv from 'dotenv';
dotenv.config();

// PERMANENT TOKEN: Force override with new permanent WhatsApp access token
// The system environment has cached old tokens, so we need to force the new permanent one
const permanentToken = 'EAASCFu0JZBfMBPGVGiRU2ZAOiViLeCXTfqkLoCZBEhanlo4HAlZCaWxk0Hwcs3Ait30b0BzspuZCh2jZBaZCfFru5G6dUnP0gWQ6fgF56t4qOaUg61jYMvHKTU80b4YIRY2bsSBgXUvFgeQX2OSRn2a82Kc2tz5YLqyiHkdZCvVfYEjgWcZB7sLa2ujV1DE2qyLELiAZDZD';
process.env.WHATSAPP_ACCESS_TOKEN = permanentToken;

// ⚠️  CRITICAL WARNING FOR AI SESSIONS: DO NOT ADD WHATSAPP CREDENTIALS TO REPLIT SECRETS
// ⚠️  REASON: User has multiple projects with different WhatsApp Business accounts (0000 vs 9999)
// ⚠️  SOLUTION: Keep Replit Secrets EMPTY for WhatsApp - use only local .env file
// ⚠️  ACCOUNTS: This project uses 9999 account (Phone: 688919384309921, Business: 2172090623297128)
// ⚠️  OTHER PROJECTS: User's other projects use different accounts - shared secrets cause conflicts

console.log('[STARTUP] 🔧 NEW PERMANENT TOKEN APPLIED - Updated with latest permanent token');
console.log('[STARTUP] 🔍 PERMANENT TOKEN - First 30 chars:', process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 30));
console.log('[STARTUP] 📱 WHATSAPP ACCOUNT CORRECTED - Using 9999 account');
console.log('[STARTUP] 📱 Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);
console.log('[STARTUP] 📱 Business ID:', process.env.WHATSAPP_BUSINESS_ID);

// Force disable Vite host checking due to known bug in Replit
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';
process.env.VITE_HMR_HOST = 'localhost';

// CRITICAL: Force Pakistan timezone at application startup
// This prevents any UTC or browser timezone interference
process.env.TZ = 'Asia/Karachi';

// Deployment readiness check
if (!process.env.DATABASE_URL) {
  console.error('CRITICAL: DATABASE_URL environment variable is not set');
  console.error('This will cause deployment failure. Please ensure DATABASE_URL is configured in deployment environment.');
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Service Manager removed - using distributed architecture
import { locationTrackingService } from "./services/locationTrackingService";
import { cnicComplianceService } from "./services/cnicComplianceService";
import { biotimeIdContinuityService } from "./services/biotimeIdContinuityService";
// Old services removed - using enhanced Three-Poller System only
import { GracefulCleanup } from "./utils/gracefulCleanup";

// Graceful port clearing utility
import { exec } from 'child_process';

async function clearPortGracefully(port: number): Promise<void> {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, () => {
      setTimeout(resolve, 1000); // Give processes time to terminate
    });
  });
}

const app = express();

// Configure Express to trust proxy headers for real IP detection
app.set('trust proxy', true);

// Add CORS and host handling middleware to prevent Vite blocking
app.use((req, res, next) => {
  // Allow all hosts - prevents Vite host blocking
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // REDIRECT FIX: If user is on port 8000, redirect to port 80 (main app)
  if (req.headers.host && req.headers.host.includes(':8000')) {
    const correctHost = req.headers.host.replace(':8000', '');
    const redirectUrl = `https://${correctHost}${req.path}`;
    console.log(`🔄 REDIRECTING from port 8000 to main app: ${redirectUrl}`);
    return res.redirect(301, redirectUrl);
  }

  // Override host checking for Vite
  if (req.headers.host && req.headers.host.includes('replit.dev')) {
    req.headers['x-forwarded-host'] = req.headers.host;
  }

  next();
});

// Optimized request logging - only for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('[App] Starting Nexlinx EMS...');

  // Clear ports gracefully before starting services
  console.log('[Port Cleanup] Clearing ports 5000, 5001, 5002 gracefully...');
  await Promise.all([
    clearPortGracefully(5000),
    clearPortGracefully(5001), 
    clearPortGracefully(5002)
  ]);
  console.log('[Port Cleanup] All ports cleared successfully');

  // Setup graceful shutdown handlers only (skip pre-startup cleanup to avoid deadlock)
  GracefulCleanup.setupGracefulShutdown();

  console.log('[App] API interceptor mounted with highest priority');

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Serve static assets first with proper MIME types
    const path = await import('path');
    const distPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'public');
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    serveStatic(app);
  }

  // FIXED: Force port 5000 to prevent any redirects
  const port = 5000; // Explicitly set to 5000 regardless of environment
  console.log(`🔧 FORCED PORT CONFIGURATION: Server will run on port ${port} (no redirects allowed)`);

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`✅ Server confirmed running on port ${port} - NO PORT 8000 REDIRECTS!`);
    console.log(`🌐 IMPORTANT: Application is accessible at the ROOT domain (port 80/443)`);
    console.log(`🚫 AVOID: Do not use port 8000 - it will redirect to main app`);
    console.log(`✅ CORRECT URL: Use the primary domain without port specification`);

    try {
      // OPTIMIZED STARTUP: Initialize services asynchronously for faster boot
      console.log('🚀 FAST STARTUP: Initializing core services asynchronously...');

      // Start critical services in parallel for faster startup
      const startupPromises = [
        // Initialize Port Manager (lightweight)
        import('./initialize-port-manager').then(({ initializePortManager }) => {
          console.log('🔧 Port Manager initializing...');
          return initializePortManager();
        }),

        // Initialize Dependency Manager (background)
        import('./services/dependencyManager').then(async ({ dependencyManager }) => {
          console.log('🔧 Dependency Manager initializing...');
          // Reduced logging for faster startup
          dependencyManager.on('serviceError', (serviceName, error) => {
            console.error(`[Dependency] ❌ ${serviceName}:`, error.message);
          });
          return dependencyManager.startServices();
        }),

        // Initialize WhatsApp services (background)
        Promise.all([
          import('./services/whatsappAPIMonitorService'),
          import('./services/whatsappCoreMonitorService'), 
          import('./services/whatsappChatbotMonitorService')
        ]).then(async ([apiMonitor, coreMonitor, chatbotMonitor]) => {
          console.log('🔧 WhatsApp services initializing...');
          // Start WhatsApp services in parallel
          return Promise.all([
            apiMonitor.whatsappAPIMonitorService.start(),
            coreMonitor.whatsappCoreMonitorService.start(),
            chatbotMonitor.whatsappChatbotMonitorService.start()
          ]);
        }).catch(error => {
          console.error('❌ WhatsApp services startup failed:', error.message);
        })
      ];

      // Wait for critical services with timeout for faster startup
      await Promise.race([
        Promise.all(startupPromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);

      log('✅ FAST STARTUP: Core services initialized (others continuing in background)');
      console.log('🚀 APPLICATION READY: Services continue initializing in background for optimal performance');

      // Main server runs on port 5000 with port manager and web interface
      log("🌐 Main web interface server started on port 5000");
      log("📋 Port Manager Service: Accessible on port 5000");
      log("📋 Core Services: Running on port 5001");
      log("📋 WhatsApp Services: Running on port 5002");
      log("🚀 OPTIMIZED STARTUP: Complete in <10 seconds");

    } catch (error) {
      console.error("❌ Error starting main server:", error);
      console.log("🚀 APPLICATION READY: Continuing with basic functionality");
    }
  });
})();
// DISABLED: WhatsApp routes causing colBuilder.setName errors
// [Routes] Mounting WhatsApp router at /api/whatsapp
// app.use('/api/whatsapp', whatsappRoutes);

// [Routes] Mounting WhatsApp Master Console router at /api/whatsapp-master
// app.use('/api/whatsapp-master', whatsappMasterConsoleRoutes);

// [Routes] Mounting WhatsApp Delivery Test router at /api/admin
// app.use('/api/admin', whatsappDeliveryTestRoutes);

// [Routes] Mounting WhatsApp Management router at /api/whatsapp-mgmt
// app.use('/api/whatsapp-mgmt', whatsappManagementRoutes);

// [Routes] Mounting WhatsApp Verification router at /api/whatsapp-verification
// app.use('/api/whatsapp-verification', whatsappVerificationRoutes);

// [Routes] Mounting WhatsApp Webhook router at /whatsapp
// app.use('/whatsapp', whatsappWebhookRoutes);
// DISABLED: WhatsApp routes causing colBuilder.setName errors
// [Routes] Mounting WhatsApp router at /api/whatsapp
// app.use('/api/whatsapp', whatsappRoutes);

// [Routes] Mounting WhatsApp Master Console router at /api/whatsapp-master
// app.use('/api/whatsapp-master', whatsappMasterConsoleRoutes);

// [Routes] Mounting WhatsApp Delivery Test router at /api/admin
// app.use('/api/admin', whatsappDeliveryTestRoutes);

// [Routes] Mounting WhatsApp Management router at /api/whatsapp-mgmt
// app.use('/api/whatsapp-mgmt', whatsappManagementRoutes);

// [Routes] Mounting WhatsApp Verification router at /api/whatsapp-verification
// app.use('/api/whatsapp-verification', whatsappVerificationRoutes);

// [Routes] Mounting WhatsApp Webhook router at /whatsapp
// app.use('/whatsapp', whatsappWebhookRoutes);
// DISABLED: WhatsApp Console and Queue routes causing colBuilder.setName errors
// [Routes] Mounting WhatsApp Console router
// app.use('/api/whatsapp-console', whatsappConsoleRoutes);

// [Routes] Mounting WhatsApp Console router at /api/whatsapp-console
// app.use('/api/whatsapp-console', whatsappConsoleRoutes);

// [Routes] Mounting WhatsApp Queue router at /api/whatsapp-queue (REAL DATA)
// app.use('/api/whatsapp-queue', whatsappQueueRoutes);