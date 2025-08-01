import { portManager } from './services/portManager';
import { getProductionPorts, shouldDisableThreeTier, getSimplifiedConfig } from './production-port-resolver';
import { cleanupThreeTierPorts } from './port-cleanup';

/**
 * Initialize the Port Manager during server startup with production port handling
 */
export async function initializePortManager(): Promise<void> {
  try {
    console.log('🔧 Initializing Port Manager...');
    
    // Check if we should disable three-tier in production
    if (shouldDisableThreeTier()) {
      console.log('🔧 Production mode: Three-tier architecture disabled');
      console.log('✅ Port Manager bypassed for simplified deployment');
      return;
    }
    
    // Clean up any existing port bindings in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔧 Cleaning up existing port bindings...');
      await cleanupThreeTierPorts();
    }
    
    // Get production-ready port configuration
    const portConfig = await getProductionPorts();
    console.log('🔧 Using port configuration:', portConfig);
    
    // Initialize with dynamic ports
    await portManager.initialize();
    console.log('✅ Port Manager initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize Port Manager:', error.message);
    console.log('🔧 Falling back to simplified single-port deployment...');
    
    // Set environment variable to disable three-tier for this session
    process.env.DISABLE_THREE_TIER = 'true';
    console.log('✅ Simplified deployment mode activated');
  }
}

// Auto-initialize if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializePortManager()
    .then(() => {
      console.log('🎉 Port Manager standalone initialization completed');
    })
    .catch((error) => {
      console.error('💥 Port Manager standalone initialization failed:', error);
      process.exit(1);
    });
}