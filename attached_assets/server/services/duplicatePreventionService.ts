import { db } from '../db';
import { attendancePullExt, accessControlExt } from '@shared/schema';
import { sql, eq, and, desc } from 'drizzle-orm';

interface DuplicatePreventionResult {
  success: boolean;
  duplicatesFound: number;
  duplicatesRemoved: number;
  tablesAffected: string[];
  processingTime: number;
  error?: string;
}

interface DuplicateStats {
  totalRecords: number;
  uniqueRecords: number;
  duplicateCount: number;
  duplicatePercentage: number;
}

/**
 * Duplicate Prevention Service
 * Prevents and cleans up duplicate records in staging tables
 * Runs automatic checks and cleanup to maintain data integrity
 */
export class DuplicatePreventionService {
  private readonly maxDuplicatesThreshold = 1000; // Alert if more than 1000 duplicates
  private readonly cleanupBatchSize = 10000; // Process in batches to avoid memory issues
  
  /**
   * Comprehensive duplicate prevention check and cleanup
   */
  async preventDuplicates(): Promise<DuplicatePreventionResult> {
    const startTime = Date.now();
    
    const result: DuplicatePreventionResult = {
      success: false,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      tablesAffected: [],
      processingTime: 0
    };

    try {
      console.log('[DuplicatePrevention] 🔍 Starting duplicate prevention check...');
      
      // Check and clean attendance_pull_ext table
      const attendanceResult = await this.cleanupTableDuplicates('attendance_pull_ext');
      result.duplicatesFound += attendanceResult.duplicatesFound;
      result.duplicatesRemoved += attendanceResult.duplicatesRemoved;
      
      if (attendanceResult.duplicatesRemoved > 0) {
        result.tablesAffected.push('attendance_pull_ext');
      }
      
      // Check and clean access_control_ext table
      const accessResult = await this.cleanupTableDuplicates('access_control_ext');
      result.duplicatesFound += accessResult.duplicatesFound;
      result.duplicatesRemoved += accessResult.duplicatesRemoved;
      
      if (accessResult.duplicatesRemoved > 0) {
        result.tablesAffected.push('access_control_ext');
      }
      
      result.success = true;
      result.processingTime = Date.now() - startTime;
      
      if (result.duplicatesFound > this.maxDuplicatesThreshold) {
        console.log(`[DuplicatePrevention] 🚨 HIGH DUPLICATE ALERT: ${result.duplicatesFound} duplicates found!`);
      }
      
      console.log(`[DuplicatePrevention] ✅ Cleanup completed: ${result.duplicatesRemoved} duplicates removed from ${result.tablesAffected.length} tables`);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error('[DuplicatePrevention] ❌ Error during duplicate prevention:', result.error);
    }
    
    return result;
  }
  
  /**
   * Clean up duplicates from a specific table
   */
  private async cleanupTableDuplicates(tableName: string): Promise<{ duplicatesFound: number; duplicatesRemoved: number }> {
    console.log(`[DuplicatePrevention] 🔄 Checking table: ${tableName}`);
    
    // Get duplicate statistics
    const stats = await this.getTableDuplicateStats(tableName);
    
    if (stats.duplicateCount === 0) {
      console.log(`[DuplicatePrevention] ✅ No duplicates found in ${tableName}`);
      return { duplicatesFound: 0, duplicatesRemoved: 0 };
    }
    
    console.log(`[DuplicatePrevention] 📊 Table ${tableName}: ${stats.duplicateCount} duplicates (${stats.duplicatePercentage.toFixed(2)}%)`);
    
    // Remove duplicates in batches
    let totalRemoved = 0;
    let batchCount = 0;
    
    while (true) {
      const batchRemoved = await this.removeDuplicateBatch(tableName, this.cleanupBatchSize);
      totalRemoved += batchRemoved;
      batchCount++;
      
      if (batchRemoved === 0) {
        break; // No more duplicates to remove
      }
      
      console.log(`[DuplicatePrevention] 📈 Batch ${batchCount}: Removed ${batchRemoved} duplicates (Total: ${totalRemoved})`);
      
      // Prevent infinite loops
      if (batchCount > 100) {
        console.log(`[DuplicatePrevention] ⚠️ Stopping after 100 batches to prevent infinite loop`);
        break;
      }
    }
    
    return { duplicatesFound: stats.duplicateCount, duplicatesRemoved: totalRemoved };
  }
  
  /**
   * Get duplicate statistics for a table
   */
  private async getTableDuplicateStats(tableName: string): Promise<DuplicateStats> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT biotime_id) as unique_records,
        COUNT(*) - COUNT(DISTINCT biotime_id) as duplicate_count
      FROM ${sql.identifier(tableName)}
    `);
    
    const row = result.rows[0] as any;
    const totalRecords = parseInt(row.total_records);
    const uniqueRecords = parseInt(row.unique_records);
    const duplicateCount = parseInt(row.duplicate_count);
    
    return {
      totalRecords,
      uniqueRecords,
      duplicateCount,
      duplicatePercentage: totalRecords > 0 ? (duplicateCount / totalRecords) * 100 : 0
    };
  }
  
  /**
   * Remove a batch of duplicates from a table
   */
  private async removeDuplicateBatch(tableName: string, batchSize: number): Promise<number> {
    const result = await db.execute(sql`
      DELETE FROM ${sql.identifier(tableName)}
      WHERE ctid NOT IN (
        SELECT ctid
        FROM (
          SELECT ctid, ROW_NUMBER() OVER (PARTITION BY biotime_id ORDER BY ctid) as rn
          FROM ${sql.identifier(tableName)}
          LIMIT ${batchSize}
        ) t
        WHERE rn = 1
      )
      AND ctid IN (
        SELECT ctid
        FROM ${sql.identifier(tableName)}
        LIMIT ${batchSize}
      )
    `);
    
    return result.rowCount || 0;
  }
  
  /**
   * Get current duplicate statistics for monitoring
   */
  async getDuplicateStats(): Promise<{
    attendancePullExt: DuplicateStats;
    accessControlExt: DuplicateStats;
    totalDuplicates: number;
    lastCheckTime: Date;
  }> {
    const attendanceStats = await this.getTableDuplicateStats('attendance_pull_ext');
    const accessStats = await this.getTableDuplicateStats('access_control_ext');
    
    return {
      attendancePullExt: attendanceStats,
      accessControlExt: accessStats,
      totalDuplicates: attendanceStats.duplicateCount + accessStats.duplicateCount,
      lastCheckTime: new Date()
    };
  }
  
  /**
   * Prevent duplicates during data insertion
   */
  async preventDuplicateInsertion(biotimeId: string, tableName: string): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${sql.identifier(tableName)}
      WHERE biotime_id = ${biotimeId}
    `);
    
    const count = parseInt((result.rows[0] as any).count);
    
    if (count > 0) {
      console.log(`[DuplicatePrevention] 🚫 Prevented duplicate insertion: biotime_id ${biotimeId} already exists in ${tableName}`);
      return false; // Duplicate found, prevent insertion
    }
    
    return true; // Safe to insert
  }
  
  /**
   * Automated duplicate monitoring service
   */
  async startMonitoring(intervalMinutes: number = 30): Promise<void> {
    console.log(`[DuplicatePrevention] 🔄 Starting duplicate monitoring every ${intervalMinutes} minutes`);
    
    const runCheck = async () => {
      try {
        const result = await this.preventDuplicates();
        
        if (result.duplicatesFound > 0) {
          console.log(`[DuplicatePrevention] 🧹 Automated cleanup: ${result.duplicatesRemoved} duplicates removed`);
        }
      } catch (error) {
        console.error('[DuplicatePrevention] ❌ Automated check failed:', error);
      }
    };
    
    // Run initial check
    await runCheck();
    
    // Schedule regular checks
    setInterval(runCheck, intervalMinutes * 60 * 1000);
  }
}

// Export singleton instance
export const duplicatePreventionService = new DuplicatePreventionService();