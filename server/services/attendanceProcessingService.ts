import { db } from '../db';
import { attendanceRecords } from '@shared/schema';
import { eq, and, gte, lte, sql, isNull, isNotNull } from 'drizzle-orm';

export class AttendanceProcessingService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private processCount = 0;
  private lastProcessed: Date = new Date();

  constructor() {
    console.log('[AttendanceProcessor] 🔧 Attendance Processing Service initialized');
  }

  /**
   * Start the attendance processing service with watchdog monitoring
   * Runs every 15 minutes to process individual_punch records
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AttendanceProcessor] ⚠️ Service already running');
      return;
    }

    console.log('[AttendanceProcessor] 🚀 Starting attendance processing service...');
    this.isRunning = true;

    // Process immediately on start
    this.processAttendanceRecords();

    // Set up interval to run every 15 minutes
    this.intervalId = setInterval(() => {
      this.processAttendanceRecords();
    }, 15 * 60 * 1000); // 15 minutes

    console.log('[AttendanceProcessor] ✅ Service started - processing every 15 minutes');
  }

  /**
   * Stop the attendance processing service
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[AttendanceProcessor] ⚠️ Service already stopped');
      return;
    }

    console.log('[AttendanceProcessor] 🛑 Stopping attendance processing service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('[AttendanceProcessor] ✅ Service stopped');
  }

  /**
   * Get service status for monitoring
   */
  getStatus() {
    return {
      name: 'attendanceProcessor',
      status: this.isRunning ? 'healthy' : 'stopped',
      isRunning: this.isRunning,
      lastProcessed: this.lastProcessed,
      processCount: this.processCount,
      nextRun: this.intervalId ? new Date(Date.now() + 15 * 60 * 1000) : null
    };
  }

  /**
   * Process attendance records from individual_punch to complete/incomplete
   * Handles all historical and current data
   */
  async processAttendanceRecords(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('[AttendanceProcessor] 🔄 Processing attendance records...');
      const startTime = Date.now();

      // Process records from July 1st onwards (all recent data)
      const startDate = new Date('2025-07-01');
      const endDate = new Date(); // Today
      endDate.setHours(23, 59, 59, 999);

      // Update individual_punch records to proper status
      const updateResult = await db
        .update(attendanceRecords)
        .set({
          status: sql`CASE 
            WHEN check_in IS NOT NULL AND check_out IS NOT NULL THEN 'complete'
            WHEN check_in IS NOT NULL AND check_out IS NULL THEN 'incomplete' 
            ELSE status 
          END`,
          totalHours: sql`CASE 
            WHEN check_in IS NOT NULL AND check_out IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (check_out - check_in))/3600.0
            ELSE 0
          END`
        })
        .where(
          and(
            gte(attendanceRecords.date, startDate),
            lte(attendanceRecords.date, endDate),
            eq(attendanceRecords.status, 'individual_punch')
          )
        );

      const processingTime = Date.now() - startTime;
      this.processCount++;
      this.lastProcessed = new Date();

      console.log(`[AttendanceProcessor] ✅ Processed attendance records in ${processingTime}ms`);
      console.log(`[AttendanceProcessor] 📊 Total processing cycles: ${this.processCount}`);

      // Process any missed days (July 19-21 specifically)
      await this.processMissedDays();

    } catch (error) {
      console.error('[AttendanceProcessor] ❌ Error processing attendance:', error);
    }
  }

  /**
   * Process specific missed days (July 19-21 priority)
   */
  private async processMissedDays(): Promise<void> {
    const missedDates = [
      '2025-07-19',
      '2025-07-20', 
      '2025-07-21'
    ];

    for (const dateStr of missedDates) {
      try {
        const targetDate = new Date(dateStr);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Check if this date needs processing
        const [unprocessedCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(attendanceRecords)
          .where(
            and(
              gte(attendanceRecords.date, targetDate),
              lte(attendanceRecords.date, nextDay),
              eq(attendanceRecords.status, 'individual_punch')
            )
          );

        if (unprocessedCount.count > 0) {
          console.log(`[AttendanceProcessor] 🔧 Processing ${unprocessedCount.count} records for ${dateStr}`);

          await db
            .update(attendanceRecords)
            .set({
              status: sql`CASE 
                WHEN check_in IS NOT NULL AND check_out IS NOT NULL THEN 'complete'
                WHEN check_in IS NOT NULL AND check_out IS NULL THEN 'incomplete' 
                ELSE status 
              END`,
              totalHours: sql`CASE 
                WHEN check_in IS NOT NULL AND check_out IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (check_out - check_in))/3600.0
                ELSE 0
              END`
            })
            .where(
              and(
                gte(attendanceRecords.date, targetDate),
                lte(attendanceRecords.date, nextDay),
                eq(attendanceRecords.status, 'individual_punch')
              )
            );

          console.log(`[AttendanceProcessor] ✅ Processed ${dateStr} successfully`);
        }
      } catch (error) {
        console.error(`[AttendanceProcessor] ❌ Error processing ${dateStr}:`, error);
      }
    }
  }

  /**
   * Manual trigger for attendance processing
   */
  async triggerProcessing(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[AttendanceProcessor] 🔄 Manual processing triggered');
      await this.processAttendanceRecords();
      return {
        success: true,
        message: 'Attendance processing completed successfully'
      };
    } catch (error) {
      console.error('[AttendanceProcessor] ❌ Manual processing failed:', error);
      return {
        success: false,
        message: `Processing failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get comprehensive processing statistics
   */
  async getProcessingStats(): Promise<any> {
    try {
      // Get status breakdown for recent days
      const statusStats = await db.execute(sql`
        SELECT 
          DATE(date) as date,
          status,
          COUNT(*) as count
        FROM attendance_records 
        WHERE date >= '2025-07-15'
        GROUP BY DATE(date), status
        ORDER BY DATE(date), status
      `);

      // Get total unprocessed records
      const [unprocessedCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.status, 'individual_punch'));

      return {
        service: 'AttendanceProcessor',
        status: this.getStatus(),
        unprocessedRecords: unprocessedCount.count,
        recentStatusBreakdown: statusStats,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: 'AttendanceProcessor',
        status: this.getStatus(),
        error: error instanceof Error ? error.message : String(error),
        lastUpdate: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
export const attendanceProcessingService = new AttendanceProcessingService();