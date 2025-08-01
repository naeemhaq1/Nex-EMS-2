import { duplicatePreventionService } from './duplicatePreventionService';

/**
 * Startup duplicate prevention service
 * Runs on server startup to ensure clean database state
 */
export async function startDuplicatePreventionService() {
  console.log('[DuplicatePrevention] 🚀 Starting duplicate prevention service...');
  
  try {
    // Run initial cleanup
    const initialCleanup = await duplicatePreventionService.preventDuplicates();
    console.log(`[DuplicatePrevention] 🧹 Initial cleanup: ${initialCleanup.duplicatesRemoved} duplicates removed`);
    
    // Start automated monitoring (every 10 minutes)
    await duplicatePreventionService.startMonitoring(10);
    
    console.log('[DuplicatePrevention] ✅ Duplicate prevention service started successfully');
    return true;
  } catch (error) {
    console.error('[DuplicatePrevention] ❌ Failed to start duplicate prevention service:', error);
    return false;
  }
}