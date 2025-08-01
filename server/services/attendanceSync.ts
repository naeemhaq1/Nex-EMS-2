import { storage } from "../storage";
import { biotimeService } from "./biotime";
import axios from "axios";

interface SyncProgress {
  type: 'attendance';
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentPage: number;
  recordsProcessed: number;
  recordsTotal: number;
  dateRange: { from: Date; to: Date };
  lastProcessedId?: string;
  error?: string;
}

interface AttendanceSyncConfig {
  dateFrom?: Date;
  dateTo?: Date;
  chunkSize?: number;
  maxRetries?: number;
  resumeFromPage?: number;
  resumeFromId?: string;
}

class AttendanceSyncService {
  private isRunning = false;
  private shouldPause = false;
  private currentSync: SyncProgress | null = null;

  async startSync(config: AttendanceSyncConfig = {}): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: "Attendance sync is already running" };
    }

    try {
      this.isRunning = true;
      this.shouldPause = false;

      const dateFrom = config.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const dateTo = config.dateTo || new Date();
      const chunkSize = config.chunkSize || 500; // Larger chunks for attendance
      const maxRetries = config.maxRetries || 5;

      console.log(`Starting attendance sync from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

      await storage.updateSyncStatus(
        'attendance',
        'running',
        0,
        0,
        undefined
      );

      const result = await this.performSync({
        dateFrom,
        dateTo,
        chunkSize,
        maxRetries,
        resumeFromPage: config.resumeFromPage || 1,
        resumeFromId: config.resumeFromId
      });

      this.isRunning = false;
      this.currentSync = null;

      return result;
    } catch (error) {
      this.isRunning = false;
      this.currentSync = null;
      await storage.updateSyncStatus('attendance', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: error instanceof Error ? error.message : 'Sync failed' };
    }
  }

  async pauseSync(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning) {
      return { success: false, message: "No sync is currently running" };
    }

    this.shouldPause = true;
    await storage.updateSyncStatus('attendance', 'paused');
    return { success: true, message: "Sync pause requested" };
  }

  async resumeSync(): Promise<{ success: boolean; message: string }> {
    // Get current sync status from database
    const syncStatuses = await storage.getSyncStatus();
    const attendanceSync = syncStatuses.find(s => s.syncType === 'attendance');

    if (!attendanceSync || attendanceSync.status !== 'paused') {
      return { success: false, message: "No paused attendance sync found" };
    }

    // Resume from where we left off
    return this.startSync({
      resumeFromPage: attendanceSync.currentPage,
      chunkSize: 500, // Use consistent chunk size
    });
  }

  private async performSync(config: AttendanceSyncConfig): Promise<{ success: boolean; message: string }> {
    const { dateFrom, dateTo, chunkSize = 500, maxRetries = 5, resumeFromPage = 1 } = config;
    
    let allAttendance: any[] = [];
    let page = resumeFromPage;
    let hasMore = true;
    let totalCount = 0;
    let consecutiveErrors = 0;
    let lastProcessedId = config.resumeFromId;

    // Authenticate with BioTime API
    try {
      const biotimeConfig = {
        baseUrl: process.env.BIOTIME_API_URL || '',
        username: process.env.BIOTIME_USERNAME || '',
        password: process.env.BIOTIME_PASSWORD || '',
      };

      if (!biotimeConfig.baseUrl || !biotimeConfig.username || !biotimeConfig.password) {
        throw new Error('BioTime API credentials not configured');
      }

      const authResponse = await axios.post(`${biotimeConfig.baseUrl}/api/auth/login/`, {
        username: biotimeConfig.username,
        password: biotimeConfig.password,
      });

      const token = authResponse.data.token;
      const axiosInstance = axios.create({
        baseURL: biotimeConfig.baseUrl,
        headers: { Authorization: `Token ${token}` },
        timeout: 120000, // 2 minutes for large requests
      });

      while (hasMore && consecutiveErrors < maxRetries && !this.shouldPause) {
        try {
          console.log(`Fetching attendance page ${page} (chunk size: ${chunkSize})`);
          
          const params: any = {
            page,
            page_size: chunkSize,
            start_date: dateFrom!.toISOString().split('T')[0],
            end_date: dateTo!.toISOString().split('T')[0],
            ordering: 'check_time,id', // Consistent ordering for resume
          };

          // Add resume capability - fetch from last processed ID
          if (lastProcessedId && page === resumeFromPage) {
            params.id__gt = lastProcessedId; // Get records after last processed ID
          }

          const response = await axiosInstance.get('/api/attendance/', {
            params,
          });

          const attendance = response.data.results || response.data.data || [];
          
          if (attendance.length === 0) {
            hasMore = false;
            break;
          }

          // Process in smaller sub-chunks to prevent memory issues
          const subChunkSize = 100;
          for (let i = 0; i < attendance.length; i += subChunkSize) {
            const subChunk = attendance.slice(i, i + subChunkSize);
            
            // Insert raw data exactly as received from API
            await storage.insertAttendancePullData(subChunk);
            
            allAttendance = allAttendance.concat(subChunk);
            
            // Update last processed ID for resume capability
            if (subChunk.length > 0) {
              lastProcessedId = subChunk[subChunk.length - 1].id?.toString();
            }
          }

          totalCount = response.data.count || allAttendance.length;
          
          // Update progress frequently for large datasets
          await storage.updateSyncStatus(
            'attendance',
            'running',
            allAttendance.length,
            totalCount,
            undefined
          );
          
          console.log(`Fetched ${attendance.length} attendance records (total: ${allAttendance.length}/${totalCount})`);
          
          // Check if we have more pages
          hasMore = response.data.next || (attendance.length === chunkSize);
          page++;
          consecutiveErrors = 0; // Reset error counter on success
          
          // Adaptive delay based on dataset size and server response
          const delay = Math.min(500 + (attendance.length * 2), 5000); // Max 5 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Check for pause request
          if (this.shouldPause) {
            await storage.updateSyncStatus(
              'attendance',
              'paused',
              allAttendance.length,
              totalCount,
              undefined
            );
            return { success: true, message: `Sync paused at page ${page}. Progress saved.` };
          }
          
        } catch (pageError) {
          consecutiveErrors++;
          console.error(`Error fetching attendance page ${page} (attempt ${consecutiveErrors}/${maxRetries}):`, pageError);
          
          // For network/timeout errors, implement exponential backoff
          if ((pageError as any).code === 'ECONNRESET' || (pageError as any).code === 'ETIMEDOUT' || (pageError as any).response?.status >= 500) {
            if (consecutiveErrors < maxRetries) {
              const delay = Math.min(5000 * Math.pow(2, consecutiveErrors), 60000); // Max 60 seconds
              console.log(`Retrying attendance page ${page} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry the same page
            }
          }
          
          // For rate limiting, wait longer
          if ((pageError as any).response?.status === 429) {
            console.log('Rate limited, waiting 30 seconds...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            consecutiveErrors--; // Don't count rate limits as errors
            continue;
          }
          
          // For other errors, break the loop
          if (consecutiveErrors >= maxRetries) {
            throw new Error(`Failed to fetch attendance page ${page} after ${maxRetries} attempts: ${(pageError as Error).message}`);
          }
        }
      }

      // Process all staging data into normalized table
      console.log('Processing attendance staging data...');
      const processed = await storage.processAttendanceData();
      
      await storage.updateSyncStatus('attendance', 'completed', processed, allAttendance.length);
      
      return {
        success: true,
        message: `Successfully synced ${processed} attendance records from ${allAttendance.length} raw records`
      };

    } catch (error) {
      console.error("Error in attendance sync:", error);
      await storage.updateSyncStatus('attendance', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  getSyncStatus(): SyncProgress | null {
    return this.currentSync;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}

export const attendanceSyncService = new AttendanceSyncService();