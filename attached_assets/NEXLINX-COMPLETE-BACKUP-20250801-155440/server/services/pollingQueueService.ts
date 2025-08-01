import { db } from '../db';
import { pollingQueue, pollingQueueResults } from '@shared/schema';
import { eq, and, desc, asc, lt, gte, lte, isNull, notInArray, inArray, sql } from 'drizzle-orm';
import { BioTimeService } from './biotimeService';
import { realTimeProcessor } from './realTimeProcessor';
import { EventEmitter } from 'events';

export interface PollingQueueRequest {
  requestType: 'date_range' | 'missing_data' | 'manual_repoll' | 'gap_fill' | 'historical_backfill';
  targetDate: string;
  endDate?: string;
  priority?: number;
  requestedBy?: number;
  metadata?: any;
}

export interface PollingQueueStatus {
  id: number;
  requestType: string;
  targetDate: string;
  endDate?: string;
  status: string;
  priority: number;
  requestedBy?: number;
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  recordsProcessed: number;
  totalRecords: number;
  progressPercentage: string;
  metadata?: any;
}

export interface PollingQueueResult {
  id: number;
  queueId: number;
  resultType: string;
  dataCount: number;
  errorDetails?: string;
  processingTime?: number;
  createdAt: Date;
}

export class PollingQueueService extends EventEmitter {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private biotimeService: BioTimeService;
  private currentQueueId: number | null = null;

  constructor() {
    super();
    this.biotimeService = new BioTimeService();
  }

  /**
   * Add a new polling request to the queue
   */
  async addToQueue(request: PollingQueueRequest): Promise<number> {
    try {
      const [queueItem] = await db.insert(pollingQueue).values({
        requestType: request.requestType,
        targetDate: request.targetDate,
        endDate: request.endDate,
        priority: request.priority || 1,
        requestedBy: request.requestedBy,
        status: 'pending',
        metadata: request.metadata || {}
      }).returning();

      console.log(`[PollingQueue] ✅ Added request to queue: ${request.requestType} for ${request.targetDate} (ID: ${queueItem.id})`);
      
      // Emit event for queue update
      this.emit('queue-updated', queueItem);
      
      return queueItem.id;
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to add request to queue:', error);
      throw error;
    }
  }

  /**
   * Get all pending queue items sorted by priority
   */
  async getPendingRequests(): Promise<PollingQueueStatus[]> {
    try {
      const pending = await db
        .select()
        .from(pollingQueue)
        .where(eq(pollingQueue.status, 'pending'))
        .orderBy(asc(pollingQueue.priority), asc(pollingQueue.requestedAt));

      return pending.map(item => ({
        id: item.id,
        requestType: item.requestType,
        targetDate: item.targetDate,
        endDate: item.endDate || undefined,
        status: item.status,
        priority: item.priority,
        requestedBy: item.requestedBy || undefined,
        requestedAt: item.requestedAt,
        startedAt: item.startedAt || undefined,
        completedAt: item.completedAt || undefined,
        errorMessage: item.errorMessage || undefined,
        recordsProcessed: item.recordsProcessed,
        totalRecords: item.totalRecords,
        progressPercentage: item.progressPercentage,
        metadata: item.metadata
      }));
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to get pending requests:', error);
      throw error;
    }
  }

  /**
   * Get queue status by ID
   */
  async getQueueStatus(id: number): Promise<PollingQueueStatus | null> {
    try {
      const [item] = await db
        .select()
        .from(pollingQueue)
        .where(eq(pollingQueue.id, id));

      if (!item) return null;

      return {
        id: item.id,
        requestType: item.requestType,
        targetDate: item.targetDate,
        endDate: item.endDate || undefined,
        status: item.status,
        priority: item.priority,
        requestedBy: item.requestedBy || undefined,
        requestedAt: item.requestedAt,
        startedAt: item.startedAt || undefined,
        completedAt: item.completedAt || undefined,
        errorMessage: item.errorMessage || undefined,
        recordsProcessed: item.recordsProcessed,
        totalRecords: item.totalRecords,
        progressPercentage: item.progressPercentage,
        metadata: item.metadata
      };
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Get all queue items with pagination
   */
  async getQueueHistory(page: number = 1, limit: number = 50): Promise<{
    items: PollingQueueStatus[];
    total: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      const [items, [{ count }]] = await Promise.all([
        db
          .select()
          .from(pollingQueue)
          .orderBy(desc(pollingQueue.requestedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)`.as('count') })
          .from(pollingQueue)
      ]);

      const total = count;
      const totalPages = Math.ceil(total / limit);

      return {
        items: items.map(item => ({
          id: item.id,
          requestType: item.requestType,
          targetDate: item.targetDate,
          endDate: item.endDate || undefined,
          status: item.status,
          priority: item.priority,
          requestedBy: item.requestedBy || undefined,
          requestedAt: item.requestedAt,
          startedAt: item.startedAt || undefined,
          completedAt: item.completedAt || undefined,
          errorMessage: item.errorMessage || undefined,
          recordsProcessed: item.recordsProcessed,
          totalRecords: item.totalRecords,
          progressPercentage: item.progressPercentage,
          metadata: item.metadata
        })),
        total,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to get queue history:', error);
      throw error;
    }
  }

  /**
   * Start processing the queue
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('[PollingQueue] ⚠️ Queue processing already running');
      return;
    }

    this.isProcessing = true;
    console.log('[PollingQueue] 🚀 Starting queue processing service');

    // Process immediately then set up interval
    this.processQueue();
    
    // Set up interval for continuous processing (every 30 seconds)
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    this.emit('processing-started');
  }

  /**
   * Stop processing the queue
   */
  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      console.log('[PollingQueue] ⚠️ Queue processing not running');
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('[PollingQueue] 🛑 Queue processing stopped');
    this.emit('processing-stopped');
  }

  /**
   * Process the next item in the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isProcessing) return;

    try {
      // Get next pending request
      const pendingRequests = await this.getPendingRequests();
      
      if (pendingRequests.length === 0) {
        return; // No pending requests
      }

      const nextRequest = pendingRequests[0];
      await this.processRequest(nextRequest);
      
    } catch (error) {
      console.error('[PollingQueue] ❌ Error processing queue:', error);
    }
  }

  /**
   * Process a specific request
   */
  private async processRequest(request: PollingQueueStatus): Promise<void> {
    this.currentQueueId = request.id;
    const startTime = Date.now();

    try {
      // Mark as processing
      await db
        .update(pollingQueue)
        .set({
          status: 'processing',
          startedAt: new Date()
        })
        .where(eq(pollingQueue.id, request.id));

      console.log(`[PollingQueue] 🔄 Processing request ${request.id}: ${request.requestType} for ${request.targetDate}`);

      let result: { success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string };

      switch (request.requestType) {
        case 'date_range':
          result = await this.processDateRange(request);
          break;
        case 'missing_data':
          result = await this.processMissingData(request);
          break;
        case 'manual_repoll':
          result = await this.processManualRepoll(request);
          break;
        case 'gap_fill':
          result = await this.processGapFill(request);
          break;
        case 'historical_backfill':
          result = await this.processHistoricalBackfill(request);
          break;
        default:
          throw new Error(`Unknown request type: ${request.requestType}`);
      }

      const processingTime = Date.now() - startTime;
      const progressPercentage = result.totalRecords > 0 ? ((result.recordsProcessed / result.totalRecords) * 100).toFixed(2) : '100.00';

      if (result.success) {
        // Mark as completed
        await db
          .update(pollingQueue)
          .set({
            status: 'completed',
            completedAt: new Date(),
            recordsProcessed: result.recordsProcessed,
            totalRecords: result.totalRecords,
            progressPercentage: progressPercentage
          })
          .where(eq(pollingQueue.id, request.id));

        // Log success result
        await db.insert(pollingQueueResults).values({
          queueId: request.id,
          resultType: 'success',
          dataCount: result.recordsProcessed,
          processingTime: processingTime
        });

        console.log(`[PollingQueue] ✅ Completed request ${request.id}: ${result.recordsProcessed} records processed`);
        this.emit('request-completed', { id: request.id, success: true, recordsProcessed: result.recordsProcessed });
      } else {
        // Mark as failed
        await db
          .update(pollingQueue)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorMessage: result.errorMessage,
            recordsProcessed: result.recordsProcessed,
            totalRecords: result.totalRecords,
            progressPercentage: progressPercentage
          })
          .where(eq(pollingQueue.id, request.id));

        // Log error result
        await db.insert(pollingQueueResults).values({
          queueId: request.id,
          resultType: 'error',
          dataCount: result.recordsProcessed,
          errorDetails: result.errorMessage,
          processingTime: processingTime
        });

        console.log(`[PollingQueue] ❌ Failed request ${request.id}: ${result.errorMessage}`);
        this.emit('request-failed', { id: request.id, error: result.errorMessage });
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark as failed
      await db
        .update(pollingQueue)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: errorMessage
        })
        .where(eq(pollingQueue.id, request.id));

      // Log error result
      await db.insert(pollingQueueResults).values({
        queueId: request.id,
        resultType: 'error',
        dataCount: 0,
        errorDetails: errorMessage,
        processingTime: processingTime
      });

      console.error(`[PollingQueue] ❌ Exception processing request ${request.id}:`, error);
      this.emit('request-failed', { id: request.id, error: errorMessage });
    } finally {
      this.currentQueueId = null;
    }
  }

  /**
   * Process date range request
   */
  private async processDateRange(request: PollingQueueStatus): Promise<{ success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string }> {
    try {
      const startDate = new Date(request.targetDate);
      const endDate = request.endDate ? new Date(request.endDate) : startDate;
      
      let totalRecords = 0;
      let recordsProcessed = 0;
      let currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          // Pull data for this date
          const result = await this.biotimeService.pullAttendanceByDate(dateStr);
          totalRecords += result.totalRecords;
          recordsProcessed += result.recordsProcessed;

          // Update progress
          const progress = ((currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100;
          await db
            .update(pollingQueue)
            .set({
              recordsProcessed: recordsProcessed,
              totalRecords: totalRecords,
              progressPercentage: progress.toFixed(2)
            })
            .where(eq(pollingQueue.id, request.id));

          this.emit('progress-update', { id: request.id, progress: progress.toFixed(2), recordsProcessed });

        } catch (dateError) {
          console.error(`[PollingQueue] Error processing date ${dateStr}:`, dateError);
          // Continue with next date
        }

        // Move to next date
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        success: true,
        recordsProcessed,
        totalRecords
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        totalRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process missing data request
   */
  private async processMissingData(request: PollingQueueStatus): Promise<{ success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string }> {
    try {
      // This would integrate with data gap detection service
      const result = await this.biotimeService.pullAttendanceByDate(request.targetDate);
      
      return {
        success: true,
        recordsProcessed: result.recordsProcessed,
        totalRecords: result.totalRecords
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        totalRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process manual repoll request
   */
  private async processManualRepoll(request: PollingQueueStatus): Promise<{ success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string }> {
    try {
      const result = await this.biotimeService.pullAttendanceByDate(request.targetDate);
      
      // Process the pulled data
      await realTimeProcessor.processAttendanceData();
      
      return {
        success: true,
        recordsProcessed: result.recordsProcessed,
        totalRecords: result.totalRecords
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        totalRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process gap fill request
   */
  private async processGapFill(request: PollingQueueStatus): Promise<{ success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string }> {
    try {
      // This would integrate with data gap detection to fill specific gaps
      const result = await this.biotimeService.pullAttendanceByDate(request.targetDate);
      
      return {
        success: true,
        recordsProcessed: result.recordsProcessed,
        totalRecords: result.totalRecords
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        totalRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process historical backfill request
   */
  private async processHistoricalBackfill(request: PollingQueueStatus): Promise<{ success: boolean; recordsProcessed: number; totalRecords: number; errorMessage?: string }> {
    try {
      // This would integrate with historical data service
      const result = await this.biotimeService.pullAttendanceByDate(request.targetDate);
      
      return {
        success: true,
        recordsProcessed: result.recordsProcessed,
        totalRecords: result.totalRecords
      };

    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        totalRecords: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel a pending request
   */
  async cancelRequest(id: number): Promise<boolean> {
    try {
      const [updated] = await db
        .update(pollingQueue)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          errorMessage: 'Cancelled by user'
        })
        .where(and(eq(pollingQueue.id, id), eq(pollingQueue.status, 'pending')))
        .returning();

      if (updated) {
        console.log(`[PollingQueue] 🚫 Cancelled request ${id}`);
        this.emit('request-cancelled', { id });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to cancel request:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    try {
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`.as('total'),
          pending: sql<number>`count(case when status = 'pending' then 1 end)`.as('pending'),
          processing: sql<number>`count(case when status = 'processing' then 1 end)`.as('processing'),
          completed: sql<number>`count(case when status = 'completed' then 1 end)`.as('completed'),
          failed: sql<number>`count(case when status = 'failed' then 1 end)`.as('failed'),
          cancelled: sql<number>`count(case when status = 'cancelled' then 1 end)`.as('cancelled')
        })
        .from(pollingQueue);

      return {
        total: stats.total,
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        cancelled: stats.cancelled
      };
    } catch (error) {
      console.error('[PollingQueue] ❌ Failed to get queue stats:', error);
      throw error;
    }
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): {
    isProcessing: boolean;
    currentQueueId: number | null;
  } {
    return {
      isProcessing: this.isProcessing,
      currentQueueId: this.currentQueueId
    };
  }

  /**
   * Request date range polling
   */
  async requestDateRangePolling(startDate: string, endDate: string, priority: number = 1, requestedBy?: number): Promise<number> {
    return this.addToQueue({
      requestType: 'date_range',
      targetDate: startDate,
      endDate: endDate,
      priority: priority,
      requestedBy: requestedBy,
      metadata: { dateRange: { startDate, endDate } }
    });
  }

  /**
   * Request missing data polling
   */
  async requestMissingDataPolling(targetDate: string, priority: number = 2, requestedBy?: number): Promise<number> {
    return this.addToQueue({
      requestType: 'missing_data',
      targetDate: targetDate,
      priority: priority,
      requestedBy: requestedBy,
      metadata: { missingData: true }
    });
  }

  /**
   * Request manual repoll
   */
  async requestManualRepoll(targetDate: string, priority: number = 1, requestedBy?: number): Promise<number> {
    return this.addToQueue({
      requestType: 'manual_repoll',
      targetDate: targetDate,
      priority: priority,
      requestedBy: requestedBy,
      metadata: { manualRepoll: true }
    });
  }
}

// Export singleton instance
export const pollingQueueService = new PollingQueueService();

// Export function for API routes
export async function processQueueItem(queueId: number) {
  const service = pollingQueueService;
  const queueItem = await service.getQueueStatus(queueId);
  
  if (!queueItem) {
    throw new Error(`Queue item with ID ${queueId} not found`);
  }
  
  if (queueItem.status === 'processing') {
    throw new Error(`Queue item ${queueId} is already being processed`);
  }
  
  if (queueItem.status === 'completed') {
    throw new Error(`Queue item ${queueId} has already been completed`);
  }
  
  // Process the request directly
  await service['processRequest'](queueItem);
  
  // Return updated status
  return await service.getQueueStatus(queueId);
}