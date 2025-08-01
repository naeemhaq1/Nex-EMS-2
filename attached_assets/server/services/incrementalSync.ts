import { storage } from "../storage";
import axios from "axios";
import { db } from "../db";
import { attendancePullExt } from "@shared/schema";
import { desc, sql } from "drizzle-orm";

interface IncrementalSyncConfig {
  chunkSize?: number;
  maxRetries?: number;
  timeoutMinutes?: number;
}

class IncrementalSyncService {
  private isRunning = false;
  private lastSyncTimestamp: Date | null = null;

  /**
   * Get the latest timestamp from our database to use as sync pointer
   * Uses the actual punch_time from BioTime data, not our local pulled_at time
   */
  private async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      const result = await db
        .select({ 
          latest: sql<string>`MAX((${attendancePullExt.allFields}->>'punch_time'))` 
        })
        .from(attendancePullExt)
        .limit(1);

      if (result[0]?.latest) {
        // Parse the BioTime timestamp format: "2025-07-11 00:29:22"
        const biotimeTimestamp = new Date(result[0].latest);
        // Add 1 second to avoid getting the same record again
        biotimeTimestamp.setSeconds(biotimeTimestamp.getSeconds() + 1);
        console.log('[IncrementalSync] Last BioTime punch_time:', result[0].latest);
        console.log('[IncrementalSync] Incremental sync will start from:', biotimeTimestamp.toISOString());
        return biotimeTimestamp;
      }
      return null;
    } catch (error) {
      console.error('[IncrementalSync] Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Perform incremental sync - only pull new records since last timestamp
   */
  async performIncrementalSync(config: IncrementalSyncConfig = {}): Promise<{ success: boolean; message: string; newRecords: number }> {
    if (this.isRunning) {
      return { success: false, message: "Incremental sync is already running", newRecords: 0 };
    }

    this.isRunning = true;
    let newRecords = 0;

    try {
      console.log('[IncrementalSync] Starting incremental attendance sync...');

      // Get the last sync timestamp
      const lastTimestamp = await this.getLastSyncTimestamp();
      console.log('[IncrementalSync] Last sync timestamp:', lastTimestamp);

      // If no timestamp, this is the first sync - use last 24 hours
      const sinceTimestamp = lastTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Authenticate with BioTime API
      const biotimeConfig = {
        baseUrl: process.env.BIOTIME_API_URL || '',
        username: process.env.BIOTIME_USERNAME || '',
        password: process.env.BIOTIME_PASSWORD || '',
      };

      if (!biotimeConfig.baseUrl || !biotimeConfig.username || !biotimeConfig.password) {
        throw new Error('BioTime API credentials not configured');
      }

      const authResponse = await axios.post(`${biotimeConfig.baseUrl}/jwt-api-token-auth/`, {
        username: biotimeConfig.username,
        password: biotimeConfig.password,
      }, {
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: false
        }),
        timeout: 60000
      });

      const token = authResponse.data.token;
      const axiosInstance = axios.create({
        baseURL: biotimeConfig.baseUrl,
        headers: { Authorization: `JWT ${token}` },
        timeout: 60000, // 1 minute timeout
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: false
        })
      });

      // Only pull new records since the last timestamp
      // Format timestamps as required by BioTime API: YYYY-MM-DD HH:mm:ss
      const formatForBioTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      const params = {
        page: 1,
        limit: config.chunkSize || 200,
        // Use correct BioTime API parameter names
        start_time: formatForBioTime(sinceTimestamp),
        end_time: formatForBioTime(new Date()), // Current time
      };

      console.log('[IncrementalSync] Fetching records since:', sinceTimestamp.toISOString());

      const response = await axiosInstance.get('/iclock/api/transactions/', { params });

      if (response.data && response.data.data) {
        const records = response.data.data;
        
        // Filter out lock devices and process only valid attendance records
        const validRecords = records.filter((record: any) => {
          const terminal = record.terminal;
          if (terminal && typeof terminal === 'string' && terminal.toLowerCase().includes('lock')) {
            return false; // Skip lock devices
          }
          return true;
        });

        console.log(`[IncrementalSync] Found ${validRecords.length} new valid records (filtered from ${records.length} total)`);

        if (validRecords.length > 0) {
          // Insert new records into staging table
          await storage.insertAttendancePullData(validRecords);
          
          // Process the new records
          const processedCount = await storage.processAttendanceData();
          console.log(`[IncrementalSync] Processed ${processedCount} new attendance records`);
          
          newRecords = validRecords.length;
          
          // Update sync status
          await storage.updateSyncStatus(
            'incremental_attendance',
            'completed',
            processedCount,
            validRecords.length
          );
        } else {
          console.log('[IncrementalSync] No new records found');
        }
      }

      this.isRunning = false;
      return { 
        success: true, 
        message: `Incremental sync completed. Found ${newRecords} new records.`,
        newRecords 
      };

    } catch (error) {
      this.isRunning = false;
      console.error('[IncrementalSync] Error during incremental sync:', error);
      
      await storage.updateSyncStatus(
        'incremental_attendance',
        'failed',
        0,
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );

      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Incremental sync failed',
        newRecords: 0 
      };
    }
  }

  /**
   * Manual sync for historical data with specified date range
   */
  async performManualSync(dateFrom: Date, dateTo: Date, config: IncrementalSyncConfig = {}): Promise<{ success: boolean; message: string; totalRecords: number }> {
    if (this.isRunning) {
      return { success: false, message: "A sync operation is already running", totalRecords: 0 };
    }

    this.isRunning = true;
    let totalRecords = 0;

    try {
      console.log(`[ManualSync] Starting manual sync from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

      // Authenticate with BioTime API
      const biotimeConfig = {
        baseUrl: process.env.BIOTIME_API_URL || '',
        username: process.env.BIOTIME_USERNAME || '',
        password: process.env.BIOTIME_PASSWORD || '',
      };

      if (!biotimeConfig.baseUrl || !biotimeConfig.username || !biotimeConfig.password) {
        throw new Error('BioTime API credentials not configured');
      }

      const authResponse = await axios.post(`${biotimeConfig.baseUrl}/jwt-api-token-auth/`, {
        username: biotimeConfig.username,
        password: biotimeConfig.password,
      }, {
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: false
        }),
        timeout: 120000
      });

      const token = authResponse.data.token;
      const axiosInstance = axios.create({
        baseURL: biotimeConfig.baseUrl,
        headers: { Authorization: `JWT ${token}` },
        timeout: 120000, // 2 minutes for larger requests
        httpsAgent: new (await import('https')).Agent({
          rejectUnauthorized: false
        })
      });

      // Paginated sync for historical data
      let page = 1;
      let hasMore = true;
      const chunkSize = config.chunkSize || 500;

      // Format timestamps as required by BioTime API: YYYY-MM-DD HH:mm:ss
      const formatForBioTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      while (hasMore) {
        const params = {
          page,
          limit: chunkSize,
          // Use correct BioTime API parameter names
          start_time: formatForBioTime(dateFrom),
          end_time: formatForBioTime(dateTo),
        };

        console.log(`[ManualSync] Fetching page ${page} with ${chunkSize} records`);

        const response = await axiosInstance.get('/iclock/api/transactions/', { params });

        if (response.data && response.data.data) {
          const records = response.data.data;
          
          // Filter out lock devices
          const validRecords = records.filter((record: any) => {
            const terminal = record.terminal;
            if (terminal && typeof terminal === 'string' && terminal.toLowerCase().includes('lock')) {
              return false;
            }
            return true;
          });

          if (validRecords.length > 0) {
            await storage.insertAttendancePullData(validRecords);
            totalRecords += validRecords.length;
            console.log(`[ManualSync] Inserted ${validRecords.length} records from page ${page}`);
          }

          // Check if there are more pages
          hasMore = response.data.next !== null && records.length === chunkSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Process all the new records
      const processedCount = await storage.processAttendanceData();
      console.log(`[ManualSync] Processed ${processedCount} total attendance records`);

      this.isRunning = false;
      return { 
        success: true, 
        message: `Manual sync completed. Downloaded ${totalRecords} records, processed ${processedCount}.`,
        totalRecords 
      };

    } catch (error) {
      this.isRunning = false;
      console.error('[ManualSync] Error during manual sync:', error);
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Manual sync failed',
        totalRecords: 0 
      };
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }
}

export const incrementalSyncService = new IncrementalSyncService();