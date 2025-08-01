import { db } from '../db';
import { attendancePullExt } from '@shared/schema';
import { sql } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';

interface BioTimeGap {
  startId: number;
  endId: number;
  gapSize: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface BioTimeConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout: number;
}

class BioTimeIdContinuityService {
  private config: BioTimeConfig;
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private isRunning = false;
  private intervalId: NodeJS.Timer | null = null;

  constructor() {
    this.config = {
      baseUrl: process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/',
      username: process.env.BIOTIME_USERNAME || 'naeem',
      password: process.env.BIOTIME_PASSWORD || '',
      timeout: 30000
    };
  }

  async start() {
    if (this.isRunning) {
      console.log('[BioTimeIdContinuity] Service already running');
      return;
    }

    console.log('[BioTimeIdContinuity] Starting biotime_id continuity monitoring service...');
    this.isRunning = true;

    // Run immediately on startup
    await this.performContinuityCheck();

    // Schedule to run every 10 minutes
    this.intervalId = setInterval(async () => {
      await this.performContinuityCheck();
    }, 10 * 60 * 1000);

    console.log('[BioTimeIdContinuity] Service started - checking every 10 minutes');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[BioTimeIdContinuity] Stopping service...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async authenticate(): Promise<boolean> {
    try {
      console.log('[BioTimeIdContinuity] Authenticating with BioTime API...');
      
      const response = await axios.post(
        `${this.config.baseUrl}jwt-api-token-auth/`,
        {
          username: this.config.username,
          password: this.config.password
        },
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      );

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        this.tokenExpiry = new Date(Date.now() + (23 * 60 * 60 * 1000)); // 23 hours
        console.log('[BioTimeIdContinuity] Authentication successful');
        return true;
      } else {
        console.error('[BioTimeIdContinuity] Invalid authentication response');
        return false;
      }

    } catch (error) {
      console.error('[BioTimeIdContinuity] Authentication failed:', error.message);
      return false;
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.authToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      return await this.authenticate();
    }
    return true;
  }

  private async performContinuityCheck() {
    try {
      console.log('[BioTimeIdContinuity] 🔍 Starting continuity check...');
      
      // Find gaps in biotime_id sequence from last 7 days
      const gaps = await this.findBioTimeIdGaps();
      
      if (gaps.length === 0) {
        console.log('[BioTimeIdContinuity] ✅ No gaps found in biotime_id sequence');
        return;
      }

      console.log(`[BioTimeIdContinuity] 🕳️ Found ${gaps.length} gaps to fill`);
      
      // Process ALL gaps regardless of size - every missing record is important
      console.log(`[BioTimeIdContinuity] 📋 Processing ALL ${gaps.length} gaps (no size threshold)...`);

      let totalRecordsAdded = 0;
      
      for (const gap of gaps) {
        try {
          const recordsAdded = await this.fillGap(gap);
          totalRecordsAdded += recordsAdded;
          
          if (recordsAdded > 0) {
            console.log(`[BioTimeIdContinuity] ✅ Filled gap ${gap.startId}-${gap.endId}: ${recordsAdded} records added`);
          }
        } catch (error) {
          console.error(`[BioTimeIdContinuity] ❌ Error filling gap ${gap.startId}-${gap.endId}:`, error.message);
        }
      }

      if (totalRecordsAdded > 0) {
        console.log(`[BioTimeIdContinuity] 🎯 Continuity check complete: ${totalRecordsAdded} total records added from ${gaps.length} gaps`);
      } else {
        console.log('[BioTimeIdContinuity] ⚠️ No new records added - all gaps already filled or not available in BioTime API');
      }

    } catch (error) {
      console.error('[BioTimeIdContinuity] ❌ Error during continuity check:', error.message);
    }
  }

  private async findBioTimeIdGaps(): Promise<BioTimeGap[]> {
    try {
      // Find gaps in biotime_id sequence from both attendance and access control tables
      const gapQuery = await db.execute(sql`
        WITH recent_records AS (
          SELECT biotime_id::int as id, all_fields->>'punch_time' as punch_time
          FROM attendance_pull_ext 
          WHERE biotime_id IS NOT NULL
            AND DATE(all_fields->>'punch_time') >= '2025-05-01'
          UNION ALL
          SELECT biotime_id::int as id, all_fields->>'punch_time' as punch_time
          FROM access_control_ext 
          WHERE biotime_id IS NOT NULL
            AND DATE(all_fields->>'punch_time') >= '2025-05-01'
          ORDER BY id
        ),
        id_sequence AS (
          SELECT 
            id,
            punch_time,
            LEAD(id) OVER (ORDER BY id) as next_id,
            LEAD(id) OVER (ORDER BY id) - id - 1 as gap_size
          FROM recent_records
        )
        SELECT 
          id as start_id,
          next_id as end_id,
          gap_size,
          punch_time as start_time,
          (SELECT punch_time FROM recent_records WHERE id = id_sequence.next_id) as end_time
        FROM id_sequence 
        WHERE gap_size > 0
        ORDER BY gap_size DESC
        LIMIT 50
      `);

      const gaps: BioTimeGap[] = [];
      
      // Debug: Check the structure of gapQuery
      console.log('[BioTimeIdContinuity] 🔍 Query result type:', typeof gapQuery);
      console.log('[BioTimeIdContinuity] 🔍 Query result keys:', Object.keys(gapQuery || {}));
      
      // Handle different result formats from Drizzle
      let rows = [];
      if (Array.isArray(gapQuery)) {
        rows = gapQuery;
      } else if (gapQuery && gapQuery.rows && Array.isArray(gapQuery.rows)) {
        rows = gapQuery.rows;
      } else if (gapQuery && typeof gapQuery[Symbol.iterator] === 'function') {
        rows = Array.from(gapQuery);
      }
      
      console.log(`[BioTimeIdContinuity] 🔍 Processing ${rows.length} potential gaps`);
      
      for (const row of rows) {
        if (row && row.start_id && row.end_id && row.gap_size) {
          gaps.push({
            startId: row.start_id,
            endId: row.end_id,
            gapSize: row.gap_size,
            dateRange: {
              start: row.start_time,
              end: row.end_time
            }
          });
        }
      }

      console.log(`[BioTimeIdContinuity] 🔍 Gap detection found ${gaps.length} valid gaps`);
      return gaps;

    } catch (error) {
      console.error('[BioTimeIdContinuity] Error finding gaps:', error.message);
      return [];
    }
  }

  private async fillGap(gap: BioTimeGap): Promise<number> {
    try {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication failed');
      }

      console.log(`[BioTimeIdContinuity] 🔍 Checking gap ${gap.startId}-${gap.endId} (${gap.gapSize} records)`);

      // Try to fetch records in this biotime_id range from BioTime API
      const response = await axios.get(
        `${this.config.baseUrl}iclock/api/transactions/`,
        {
          params: {
            id__gte: gap.startId + 1,
            id__lte: gap.endId - 1,
            page_size: 1000
          },
          headers: {
            'Authorization': `JWT ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        }
      );

      const apiRecords = response.data.data || [];
      console.log(`[BioTimeIdContinuity] 📡 Found ${apiRecords.length} records in API for gap ${gap.startId}-${gap.endId}`);

      if (apiRecords.length === 0) {
        console.log(`[BioTimeIdContinuity] ⚠️ No records found in API for gap ${gap.startId}-${gap.endId}`);
        return 0;
      }

      // Get existing biotime_ids to avoid duplicates
      const existingIds = await db.execute(sql`
        SELECT biotime_id 
        FROM attendance_pull_ext 
        WHERE biotime_id IN (${apiRecords.map(r => r.id).join(',')})
      `);

      // Handle different result formats from Drizzle
      let existingIdList = [];
      if (Array.isArray(existingIds)) {
        existingIdList = existingIds;
      } else if (existingIds && existingIds.rows && Array.isArray(existingIds.rows)) {
        existingIdList = existingIds.rows;
      }

      const existingIdSet = new Set(existingIdList.map(r => r.biotime_id));

      // Filter out access control devices and existing records
      const newRecords = apiRecords.filter(record => 
        !existingIdSet.has(record.id.toString()) && 
        !record.terminal?.toLowerCase().includes('lock')
      );

      if (newRecords.length === 0) {
        console.log(`[BioTimeIdContinuity] ⚠️ No new records to insert for gap ${gap.startId}-${gap.endId}`);
        return 0;
      }

      // Insert new records
      let insertedCount = 0;
      for (const record of newRecords) {
        try {
          await db.insert(attendancePullExt).values({
            biotime_id: record.id.toString(),
            emp_code: record.emp_code,
            punch_time: record.punch_time,
            punch_state: record.punch_state,
            verify_type: record.verify_type,
            work_code: record.work_code,
            terminal_sn: record.terminal_sn,
            terminal_alias: record.terminal_alias,
            area_alias: record.area_alias,
            longitude: record.longitude,
            latitude: record.latitude,
            gps_location: record.gps_location,
            mobile: record.mobile,
            source: record.source,
            purpose: record.purpose,
            crc: record.crc,
            is_mask: record.is_mask,
            temperature: record.temperature,
            terminal: record.terminal,
            all_fields: record
          });
          insertedCount++;
        } catch (error) {
          if (!error.message.includes('duplicate key')) {
            console.error(`[BioTimeIdContinuity] Error inserting record ${record.id}:`, error.message);
          }
        }
      }

      return insertedCount;

    } catch (error) {
      console.error(`[BioTimeIdContinuity] Error filling gap ${gap.startId}-${gap.endId}:`, error.message);
      return 0;
    }
  }

  // Manual trigger for immediate continuity check
  async triggerContinuityCheck(): Promise<{ success: boolean; message: string; recordsAdded?: number }> {
    try {
      console.log('[BioTimeIdContinuity] 🔧 Manual continuity check triggered');
      await this.performContinuityCheck();
      return {
        success: true,
        message: 'Continuity check completed successfully'
      };
    } catch (error) {
      console.error('[BioTimeIdContinuity] Manual check failed:', error.message);
      return {
        success: false,
        message: `Continuity check failed: ${error.message}`
      };
    }
  }

  // Get service status
  getStatus(): { running: boolean; nextCheck?: Date } {
    return {
      running: this.isRunning,
      nextCheck: this.intervalId ? new Date(Date.now() + 10 * 60 * 1000) : undefined
    };
  }
}

export const biotimeIdContinuityService = new BioTimeIdContinuityService();