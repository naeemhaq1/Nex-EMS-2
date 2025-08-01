import { EventEmitter } from 'events';
import axios from 'axios';
import https from 'https';
import { db } from '../db';
import { biotimeSyncData, attendanceRecords } from '../../shared/schema';
import { sql, eq, and, or, isNotNull } from 'drizzle-orm';

// Disable SSL verification for BioTime API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const axiosConfig = {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 120000 // 2 minutes timeout for BioTime's slow responses
};

interface QueuedJob {
    type: 'gap_fill' | 'manual_poll';
    date: string;
    priority: 'high' | 'normal';
    queued_at: Date;
    attempts: number;
}

export class ThreePollerSystem extends EventEmitter {
    private isRunning = false;
    private pollers = {
        regular: null as NodeJS.Timeout | null,
        autoStitch: null as NodeJS.Timeout | null
    };
    private queuedJobs: QueuedJob[] = [];
    private processingQueue = false;
    
    // Watchdog protection
    private watchdogTimers = {
        regular: null as NodeJS.Timeout | null,
        autoStitch: null as NodeJS.Timeout | null
    };
    private lastActivity = {
        regular: new Date(),
        autoStitch: new Date()
    };
    private healthStatus = {
        regular: 'healthy',
        autoStitch: 'healthy'
    };

    constructor() {
        super();
        this.startWatchdog();
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[ThreePollerSystem] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[ThreePollerSystem] 🚀 Starting comprehensive three-poller system with watchdog protection...');

        try {
            await this.startRegularPoller();
            await this.startAutoStitchPoller();
            this.startWatchdog();
            
            console.log('[ThreePollerSystem] ✅ All pollers started successfully with watchdog protection');
            this.emit('systemStarted');
        } catch (error) {
            console.error('[ThreePollerSystem] Error starting system:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.pollers.regular) {
            clearInterval(this.pollers.regular);
            this.pollers.regular = null;
        }
        
        if (this.pollers.autoStitch) {
            clearInterval(this.pollers.autoStitch);
            this.pollers.autoStitch = null;
        }

        console.log('[ThreePollerSystem] 🛑 System stopped');
        this.emit('systemStopped');
    }

    private async authenticate(): Promise<string> {
        try {
            const baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
            console.log(`[ThreePollerSystem] 🔑 Authenticating with: ${baseUrl}`);
            
            const response = await axios.post(`${baseUrl}jwt-api-token-auth/`, {
                username: process.env.BIOTIME_USERNAME,
                password: process.env.BIOTIME_PASSWORD
            }, axiosConfig);
            return response.data.token;
        } catch (error: any) {
            console.error('[ThreePollerSystem] Authentication failed:', error.message);
            throw error;
        }
    }

    private async fetchBioTimeData(date: string, token: string): Promise<any[]> {
        try {
            let allRecords = [];
            let currentPage = 1;
            let hasMoreData = true;
            const maxPageSize = 1000; // Reduced page size for better performance
            const baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
            
            console.log(`[ThreePollerSystem] Starting dynamic pagination for ${date} using: ${baseUrl}`);
            
            while (hasMoreData) {
                const response = await axios.get(`${baseUrl}iclock/api/transactions/`, {
                    headers: { 
                        'Authorization': `JWT ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        punch_time__gte: `${date}T00:00:00`,
                        punch_time__lte: `${date}T23:59:59`,
                        page_size: maxPageSize,
                        page: currentPage
                    },
                    timeout: 120000,
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    })
                });
                
                const pageRecords = response.data.data || [];
                console.log(`[ThreePollerSystem] ${date} Page ${currentPage}: ${pageRecords.length} records`);
                
                if (pageRecords.length === 0) {
                    hasMoreData = false;
                    break;
                }
                
                allRecords.push(...pageRecords);
                
                if (pageRecords.length < maxPageSize) {
                    hasMoreData = false;
                } else {
                    currentPage++;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`[ThreePollerSystem] ${date} pagination complete: ${allRecords.length} total records`);
            return allRecords;
        } catch (error: any) {
            console.error(`[ThreePollerSystem] Error fetching data for ${date}:`, error.message);
            throw error;
        }
    }

    private async storeBioTimeRecords(records: any[]): Promise<number> {
        if (!records || records.length === 0) return 0;

        let stored = 0;
        for (const record of records) {
            try {
                // Store in biotime_sync_data table
                await db.insert(biotimeSyncData).values({
                    biotimeId: record.id,
                    employeeCode: record.emp_code || record.emp_id,
                    punchTime: new Date(record.punch_time),
                    punchState: record.punch_state?.toString(),
                    verifyType: record.verify_type?.toString(),
                    workCode: record.work_code?.toString(),
                    terminalSn: record.terminal_sn?.toString(),
                    areaAlias: record.area_alias?.toString(),
                    longitude: record.longitude ? parseFloat(record.longitude) : null,
                    latitude: record.latitude ? parseFloat(record.latitude) : null,
                    mobile: record.mobile ? Boolean(record.mobile) : null,
                    processedAt: new Date()
                }).onConflictDoUpdate({
                    target: biotimeSyncData.biotimeId,
                    set: {
                        processedAt: new Date()
                    }
                });
                stored++;
                
                // IMMEDIATE PROCESSING: Process this record into attendance_records table
                await this.processRecordToAttendanceImmediate(record);
                
            } catch (error: any) {
                console.error('[ThreePollerSystem] Error storing record:', error.message);
            }
        }
        
        console.log(`[ThreePollerSystem] ✅ IMMEDIATE PROCESSING: Stored ${stored} records to biotime_sync_data and processed ALL to attendance_records`);
        return stored;
    }

    // IMMEDIATE PROCESSING: Convert BioTime record to attendance_records format  
    private async processRecordToAttendanceImmediate(record: any): Promise<void> {
        try {
            const empCode = record.emp_code || record.emp_id;
            const punchTime = new Date(record.punch_time);
            const punchState = record.punch_state?.toString();
            const biotimeId = record.id?.toString();

            if (!empCode || !punchTime || !biotimeId) {
                console.log(`[ThreePollerSystem] ⚠️ Skipping record with missing data: empCode=${empCode}, biotimeId=${biotimeId}`);
                return;
            }

            // Check if already processed
            const existingRecord = await db.select()
                .from(attendanceRecords)
                .where(eq(attendanceRecords.biotimeId, biotimeId))
                .limit(1);

            if (existingRecord.length > 0) {
                return; // Already processed
            }

            // Get date for grouping
            const dateKey = punchTime.toISOString().split('T')[0];
            
            // Check if we have an existing attendance record for this employee on this date
            const existingAttendance = await db.select()
                .from(attendanceRecords)
                .where(
                    and(
                        eq(attendanceRecords.employeeCode, empCode),
                        sql`DATE(${attendanceRecords.date}) = ${dateKey}`
                    )
                )
                .limit(1);

            if (existingAttendance.length > 0) {
                // Update existing record with punch-out if this is a punch-out
                const attendanceId = existingAttendance[0].id;
                if (punchState === '1' || punchState === 'out') { // Punch out
                    await db.update(attendanceRecords)
                        .set({
                            checkOut: punchTime,
                            biotimeId: biotimeId // Update with latest biotime_id
                        })
                        .where(eq(attendanceRecords.id, attendanceId));
                    console.log(`[ThreePollerSystem] ⬆️ Updated punch-out for ${empCode} on ${dateKey}`);
                }
            } else {
                // Create new attendance record
                await db.insert(attendanceRecords).values({
                    employeeCode: empCode,
                    date: punchTime,
                    checkIn: punchTime,
                    checkOut: null, // Will be updated when punch-out is processed
                    status: 'present',
                    totalHours: '0',
                    biotimeId: biotimeId,
                    notes: `Processed from BioTime ID: ${biotimeId}`
                });
                console.log(`[ThreePollerSystem] ➕ Created new attendance record for ${empCode} on ${dateKey}`);
            }

        } catch (error: any) {
            console.error(`[ThreePollerSystem] ❌ Error processing record to attendance:`, error.message);
        }
    }

    // 1. INTELLIGENT REGULAR POLLER - Only fetch truly NEW data with proper routing
    private async startRegularPoller(): Promise<void> {
        console.log('[RegularPoller] 🚀 Starting intelligent polling for NEW data only...');
        console.log('[RegularPoller] 📍 Destination: biotime_sync_data → attendance_records');
        
        // Set up intelligent polling every 3 minutes for frequent live data updates
        this.pollers.regular = setInterval(async () => {
            this.lastActivity.regular = new Date();
            try {
                console.log('[RegularPoller] 🔍 Checking for truly NEW BioTime data...');
                await this.performIntelligentNewDataPoll();
            } catch (error: any) {
                console.error('[RegularPoller] ❌ Error during intelligent poll:', error.message);
                this.emit('regularPollError', error);
            }
        }, 3 * 60 * 1000); // 3 minutes for frequent live data updates

        // Immediate check for new data - FIXED: Execute immediately without setTimeout
        this.lastActivity.regular = new Date();
        setImmediate(async () => {
            try {
                console.log('[RegularPoller] 🚀 Initial check for new data...');
                await this.performIntelligentNewDataPoll();
            } catch (error: any) {
                console.error('[RegularPoller] ❌ Initial poll error:', error.message);
            }
        });
    }

    // 2. AUTO-STITCH POLLER - Process staging data to attendance records
    private async startAutoStitchPoller(): Promise<void> {
        console.log('[AutoStitchPoller] 🔄 Starting automatic processing: biotime_sync_data → attendance_records');
        
        // Process unprocessed staging data every 2 minutes for rapid processing
        this.pollers.autoStitch = setInterval(async () => {
            this.lastActivity.autoStitch = new Date();
            try {
                await this.processUnprocessedStagingData();
            } catch (error: any) {
                console.error('[AutoStitchPoller] ❌ Processing error:', error.message);
                this.emit('autoStitchPollError', error);
            }
        }, 2 * 60 * 1000); // 2 minutes for rapid processing

        // Initial processing - FIXED: Execute immediately without setTimeout
        setImmediate(async () => {
            try {
                console.log('[AutoStitchPoller] 🚀 Initial staging data processing...');
                await this.processUnprocessedStagingData();
            } catch (error: any) {
                console.error('[AutoStitchPoller] ❌ Initial processing error:', error.message);
            }
        });
    }

    // 3. ON-DEMAND POLLER - Available for manual data requests
    private async startOnDemandPoller(): Promise<void> {
        console.log('[OnDemandPoller] 🎯 READY - Available for manual data requests');
        this.lastActivity = {
            ...this.lastActivity,
            onDemand: new Date()
        };
    }

    // NEW: Intelligent polling that only fetches truly new data using ordering=-id (FIXES BIOTIME DATE BUG)
    private async performIntelligentNewDataPoll(): Promise<void> {
        try {
            // Get the latest biotime_id from staging to avoid re-fetching existing data
            const latestRecord = await db.select()
                .from(biotimeSyncData)
                .orderBy(sql`biotime_id DESC`)
                .limit(1);

            const lastBiotimeId = latestRecord.length > 0 ? latestRecord[0].biotimeId : '0';
            console.log(`[RegularPoller] 🔍 Last processed biotime_id: ${lastBiotimeId}`);

            const token = await this.authenticate();
            
            // FIXED: Use ordering=-id to get NEWEST records (bypasses BioTime date filtering bug)
            console.log(`[RegularPoller] 🔧 Using ordering=-id approach (fixes BioTime date bug)`);
            const newRecords = await this.fetchNewestBioTimeRecords(token, lastBiotimeId);
            
            if (newRecords.length > 0) {
                const stored = await this.storeBioTimeRecords(newRecords);
                console.log(`[RegularPoller] ✅ Found ${newRecords.length} NEW records, stored ${stored} to staging`);
                
                // Trigger immediate processing of new data
                setTimeout(() => this.processUnprocessedStagingData(), 2000);
            } else {
                console.log(`[RegularPoller] ✅ No new data found after biotime_id ${lastBiotimeId}`);
            }
            
        } catch (error: any) {
            console.error('[RegularPoller] ❌ Error in intelligent new data poll:', error.message);
            throw error;
        }
    }

    // NEW: Process only unprocessed staging data to attendance records
    private async processUnprocessedStagingData(): Promise<void> {
        try {
            const unprocessedRecords = await db.select()
                .from(biotimeSyncData)
                .where(sql`processed = false`)
                .orderBy(sql`biotime_id ASC`);

            if (unprocessedRecords.length === 0) {
                console.log('[AutoStitchPoller] ✅ No unprocessed staging data found');
                return;
            }

            console.log(`[AutoStitchPoller] 🔄 Processing ${unprocessedRecords.length} unprocessed staging records...`);
            
            let processedCount = 0;
            for (const record of unprocessedRecords) {
                try {
                    await this.processRecordToAttendanceImmediate(record);
                    
                    // Mark as processed
                    await db.update(biotimeSyncData)
                        .set({ processed: true })
                        .where(sql`id = ${record.id}`);
                    
                    processedCount++;
                } catch (error: any) {
                    console.error(`[AutoStitchPoller] ❌ Error processing staging record ${record.id}:`, error.message);
                }
            }

            console.log(`[AutoStitchPoller] ✅ Processed ${processedCount}/${unprocessedRecords.length} staging records to attendance_records`);
            
        } catch (error: any) {
            console.error('[AutoStitchPoller] ❌ Error processing staging data:', error.message);
            throw error;
        }
    }

    // FIXED: Fetch newest BioTime records using ordering=-id to bypass date filtering bug
    private async fetchNewestBioTimeRecords(token: string, lastBiotimeId: string): Promise<any[]> {
        try {
            const baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
            let allNewRecords = [];
            let currentPage = 1;
            const pageSize = 100; // Smaller pages for better response time
            let hasMorePages = true;
            
            console.log(`[RegularPoller] 🔍 Fetching newest records using ordering=-id after biotime_id: ${lastBiotimeId}`);
            
            while (hasMorePages && allNewRecords.length < 500) { // Limit to 500 new records per poll
                const response = await axios.get(`${baseUrl}iclock/api/transactions/`, {
                    headers: { 
                        'Authorization': `JWT ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        ordering: '-id', // Get newest records first
                        page_size: pageSize,
                        page: currentPage
                    },
                    timeout: 60000,
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    })
                });
                
                const pageRecords = response.data.data || [];
                console.log(`[RegularPoller] 📄 Page ${currentPage}: ${pageRecords.length} records (newest first)`);
                
                if (pageRecords.length === 0) {
                    hasMorePages = false;
                    break;
                }
                
                // Filter only records newer than our last processed biotime_id
                const newRecords = pageRecords.filter(record => {
                    const recordId = parseInt(record.id);
                    const lastId = parseInt(lastBiotimeId) || 0;
                    return recordId > lastId;
                });
                
                if (newRecords.length === 0) {
                    // No more new records, stop pagination
                    console.log(`[RegularPoller] 🛑 No more new records found on page ${currentPage}`);
                    hasMorePages = false;
                } else {
                    allNewRecords.push(...newRecords);
                    console.log(`[RegularPoller] ➕ Found ${newRecords.length} new records on page ${currentPage}`);
                    
                    // If we got fewer new records than page size, we've probably reached older data
                    if (newRecords.length < pageSize) {
                        hasMorePages = false;
                    } else {
                        currentPage++;
                    }
                }
                
                // Avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`[RegularPoller] ✅ Total NEW records found: ${allNewRecords.length}`);
            return allNewRecords;
            
        } catch (error) {
            console.error(`[RegularPoller] ❌ Error fetching newest BioTime records:`, error.message);
            throw error;
        }
    }

    // NEW: Fetch BioTime data only after a specific biotime_id
    private async fetchBioTimeDataAfterBiotimeId(date: string, token: string, lastBiotimeId: number): Promise<any[]> {
        try {
            const biotimeUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
            const baseUrl = `${biotimeUrl}iclock/api/transactions/?punch_time__gte=${date}T00:00:00&punch_time__lte=${date}T23:59:59&page_size=1000`;
            console.log(`[RegularPoller] 🔗 Using BioTime URL: ${biotimeUrl}`);
            
            let allRecords: any[] = [];
            let nextUrl = baseUrl;
            
            while (nextUrl) {
                const response = await axios.get(nextUrl, {
                    headers: { 
                        'Authorization': `JWT ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000, // 2 minutes
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    })
                });

                const data = response.data;
                if (!data.results || !Array.isArray(data.results)) {
                    break;
                }

                // Filter for records with biotime_id > lastBiotimeId
                const newRecords = data.results.filter(record => 
                    record.id && record.id > lastBiotimeId
                );
                
                allRecords.push(...newRecords);
                console.log(`[RegularPoller] 📥 Found ${newRecords.length} new records (after biotime_id ${lastBiotimeId})`);
                
                nextUrl = data.next;
                
                // If no new records in this page, likely no more new data
                if (newRecords.length === 0) {
                    console.log('[RegularPoller] 🛑 No more new records found, stopping pagination');
                    break;
                }
            }

            return allRecords;
            
        } catch (error) {
            console.error(`[RegularPoller] ❌ Error fetching new BioTime data:`, error.message);
            throw error;
        }
    }

    // Intelligent polling with multi-date processing and gap filling
    private async performIntelligentPoll(): Promise<void> {
        try {
            const token = await this.authenticate();
            
            // Phase 1: Always poll today's data for real-time updates
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = await this.fetchBioTimeDataWithIncrementalCheck(today, token);
            
            if (todayRecords.length > 0) {
                const todayStored = await this.storeBioTimeRecordsWithDuplicateCheck(todayRecords);
                console.log(`[RegularPoller] 📅 TODAY: Processed ${todayRecords.length}, stored ${todayStored} new records`);
            }

            // Phase 2: Find and fill the most critical gap (prioritize recent missing days)
            const criticalMissingDate = await this.findMostCriticalMissingDate();
            
            if (criticalMissingDate) {
                console.log(`[RegularPoller] 🎯 Targeting critical missing date: ${criticalMissingDate}`);
                const gapRecords = await this.fetchBioTimeDataWithIncrementalCheck(criticalMissingDate, token);
                
                if (gapRecords.length > 0) {
                    const gapStored = await this.storeBioTimeRecordsWithDuplicateCheck(gapRecords);
                    console.log(`[RegularPoller] 🔧 GAP FILL: Processed ${gapRecords.length}, stored ${gapStored} records for ${criticalMissingDate}`);
                }
            }

            // Phase 3: Process yesterday if it has insufficient data
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const yesterdayRecords = await this.fetchBioTimeDataWithIncrementalCheck(yesterdayStr, token);
            if (yesterdayRecords.length > 0) {
                const yesterdayStored = await this.storeBioTimeRecordsWithDuplicateCheck(yesterdayRecords);
                console.log(`[RegularPoller] 📅 YESTERDAY: Processed ${yesterdayRecords.length}, stored ${yesterdayStored} new records`);
            }

            console.log('[RegularPoller] ✅ Intelligent multi-date poll completed successfully');
            
        } catch (error) {
            console.error('[RegularPoller] ❌ Error in intelligent polling:', error.message);
            throw error;
        }
    }

    // Find the most critical missing date (prioritize recent days)
    private async findMostCriticalMissingDate(): Promise<string | null> {
        try {
            // Get missing dates from the last 30 days, prioritizing recent ones
            const missingDatesQuery = await db.execute(sql`
                WITH date_series AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '30 days',
                        CURRENT_DATE - INTERVAL '1 day',
                        '1 day'::interval
                    )::date as potential_date
                ),
                existing_dates AS (
                    SELECT DISTINCT DATE(date) as existing_date
                    FROM attendance_records 
                    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
                        AND status IN ('individual_punch', 'incomplete', 'orphaned_punchout', 'complete')
                        AND (notes IS NULL OR notes NOT ILIKE '%lock%')
                )
                SELECT ds.potential_date as missing_date
                FROM date_series ds
                LEFT JOIN existing_dates ed ON ds.potential_date = ed.existing_date
                WHERE ed.existing_date IS NULL
                    AND EXTRACT(DOW FROM ds.potential_date) BETWEEN 1 AND 5  -- Monday to Friday only
                ORDER BY ds.potential_date DESC  -- Most recent first
                LIMIT 1
            `);

            const missingDate = missingDatesQuery.rows[0]?.missing_date;
            return missingDate ? new Date(missingDate).toISOString().split('T')[0] : null;
            
        } catch (error) {
            console.error('[RegularPoller] ❌ Error finding critical missing date:', error.message);
            return null;
        }
    }

    // FIXED: Timestamp-based incremental checking (not biotime_id)
    private async fetchBioTimeDataWithIncrementalCheck(date: string, token: string): Promise<any[]> {
        console.log(`[RegularPoller] 📡 Fetching data for ${date} with timestamp-based incremental checking...`);
        
        // Get last processed timestamp from staging table for this specific date
        const lastProcessedQuery = await db.execute(sql`
            SELECT MAX(punch_time) as last_punch_time
            FROM biotime_sync_data 
            WHERE DATE(punch_time) = ${date}::date
        `);
        
        const lastPunchTime = lastProcessedQuery.rows[0]?.last_punch_time;
        
        if (lastPunchTime) {
            console.log(`[RegularPoller] 📊 Last punch time in staging for ${date}: ${lastPunchTime}`);
            // Add 1 second to avoid getting the same record
            const nextSecond = new Date(lastPunchTime);
            nextSecond.setSeconds(nextSecond.getSeconds() + 1);
            return await this.fetchBioTimeDataWithTimestampFilter(date, token, nextSecond);
        } else {
            console.log(`[RegularPoller] 📅 First time fetching ${date}, getting all records`);
            return await this.fetchBioTimeData(date, token);
        }
    }

    // NEW: Fetch only new records using timestamp filtering
    private async fetchBioTimeDataWithTimestampFilter(date: string, token: string, afterTimestamp: Date): Promise<any[]> {
        try {
            const startTime = afterTimestamp.toISOString();
            const endTime = `${date}T23:59:59.999Z`;
            const baseUrl = process.env.BIOTIME_API_URL || 'https://zkbiotime.nexlinx.net.pk/';
            
            console.log(`[RegularPoller] 🎯 Fetching records between ${startTime} and ${endTime} from: ${baseUrl}`);
            
            const response = await axios.get(`${baseUrl}iclock/api/transactions/`, {
                headers: { 
                    'Authorization': `JWT ${token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    punch_time__gte: startTime,
                    punch_time__lte: endTime,
                    page_size: 1000,
                    ordering: 'punch_time'
                },
                timeout: 120000,
                httpsAgent: new (require('https')).Agent({
                    rejectUnauthorized: false
                })
            });
            
            const newRecords = response.data.data || [];
            console.log(`[RegularPoller] 🎯 INCREMENTAL: Found ${newRecords.length} new records after ${startTime}`);
            return newRecords;
            
        } catch (error) {
            console.error(`[RegularPoller] ❌ Error fetching incremental data:`, error.message);
            return [];
        }
    }

    // Enhanced storage with duplicate checking
    private async storeBioTimeRecordsWithDuplicateCheck(records: any[]): Promise<number> {
        if (!records || records.length === 0) return 0;
        
        let stored = 0;
        console.log(`[RegularPoller] 💾 Processing ${records.length} records with duplicate checking...`);
        
        for (const record of records) {
            try {
                const biotimeId = record.id?.toString();
                
                if (!biotimeId) {
                    console.log('[RegularPoller] ⚠️ Skipping record without biotime_id');
                    continue;
                }
                
                // Check if biotime_id already exists
                const existingRecord = await db.execute(sql`
                    SELECT id FROM biotime_sync_data 
                    WHERE biotime_id = ${biotimeId}
                    LIMIT 1
                `);
                
                if (existingRecord.rows.length > 0) {
                    console.log(`[RegularPoller] 🔄 Skipping duplicate biotime_id: ${biotimeId}`);
                    continue;
                }
                
                // Store new record
                await db.insert(biotimeSyncData).values({
                    biotimeId: biotimeId,
                    employeeCode: record.emp_code || '',
                    empCode: record.emp_code || '',
                    punchTime: record.punch_time ? new Date(record.punch_time) : null,
                    punchState: record.punch_state || '',
                    verifyType: record.verify_type?.toString() || '',
                    workCode: record.work_code || '',
                    terminalSn: record.terminal_sn || '',
                    areaAlias: record.area_alias || '',
                    longitude: record.longitude || null,
                    latitude: record.latitude || null,
                    mobile: record.mobile || false,
                    allFields: record,
                    pulledAt: new Date(),
                    processed: false,
                    processedAt: null
                });
                
                stored++;
            } catch (error) {
                console.error(`[RegularPoller] ❌ Error storing record:`, error.message);
            }
        }
        
        console.log(`[RegularPoller] ✅ Stored ${stored} new records (${records.length - stored} duplicates skipped)`);
        return stored;
    }

    // 2. ON-DEMAND POLLER - Manual retrieval for specific dates
    async onDemandPoll(startDate: string, endDate: string): Promise<number> {
        console.log(`[OnDemandPoller] 🔄 Manual poll requested: ${startDate} to ${endDate}`);
        
        try {
            const token = await this.authenticate();
            let currentDate = new Date(startDate);
            const endDateObj = new Date(endDate);
            let totalStored = 0;

            while (currentDate <= endDateObj) {
                const dateStr = currentDate.toISOString().split('T')[0];
                console.log(`[OnDemandPoller] Processing ${dateStr}...`);
                
                const records = await this.fetchBioTimeData(dateStr, token);
                const stored = await this.storeBioTimeRecords(records);
                totalStored += stored;
                
                console.log(`[OnDemandPoller] ✅ Stored ${stored} records for ${dateStr}`);
                
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`[OnDemandPoller] ✅ Completed: ${totalStored} total records stored`);
            this.emit('onDemandPollComplete', { startDate, endDate, totalRecords: totalStored });
            return totalStored;
        } catch (error) {
            console.error('[OnDemandPoller] ❌ Error:', error.message);
            this.emit('onDemandPollError', error);
            throw error;
        }
    }

    // 3. AUTO-STITCH POLLER - Gap detection, duplicate hunting, data quality maintenance, and AUTOMATIC PROCESSING
    private async startAutoStitchPoller(): Promise<void> {
        console.log('[AutoStitchPoller] Starting gap detection, duplicate hunting, data quality service, and automatic processing...');
        
        // Set up interval with activity tracking
        this.pollers.autoStitch = setInterval(async () => {
            this.lastActivity.autoStitch = new Date();
            try {
                // Phase 1: AUTOMATIC PROCESSING - Convert unprocessed biotime_sync_data to attendance_records
                await this.processUnprocessedBiotimeData();
                
                // Phase 2: Hunt and remove duplicates
                await this.huntAndRemoveDuplicates();
                
                // Phase 3: Detect and queue gaps
                await this.detectAndQueueGaps();
                
                // Phase 4: Process queued gap-fill jobs
                await this.processQueuedJobs();
                
                console.log('[AutoStitchPoller] ✅ Completed data quality maintenance cycle with automatic processing');
            } catch (error) {
                console.error('[AutoStitchPoller] ❌ Error:', error.message);
                this.emit('autoStitchError', error);
            }
        }, 5 * 60 * 1000); // 5 minutes - more frequent for immediate processing
        
        // Run initial auto-stitch cycle immediately with automatic processing
        this.lastActivity.autoStitch = new Date();
        setTimeout(async () => {
            try {
                console.log('[AutoStitchPoller] 🚀 Starting initial data quality cycle with automatic processing...');
                await this.processUnprocessedBiotimeData();
                await this.huntAndRemoveDuplicates();
                await this.detectAndQueueGaps();
                await this.processQueuedJobs();
                console.log('[AutoStitchPoller] ✅ Initial data quality cycle completed with automatic processing');
            } catch (error) {
                console.error('[AutoStitchPoller] ❌ Initial cycle error:', error.message);
            }
        }, 5000);
    }

    // Enhanced duplicate hunting system
    private async huntAndRemoveDuplicates(): Promise<void> {
        console.log('[DuplicateHunter] 🔍 Starting systematic duplicate detection and removal...');
        
        try {
            // Find duplicates in recent data (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
            
            const duplicateAnalysis = await db.execute(sql`
                SELECT 
                    DATE(date) as day,
                    COUNT(*) as total_records,
                    COUNT(DISTINCT biotime_id) as unique_biotime_ids,
                    COUNT(*) - COUNT(DISTINCT biotime_id) as duplicate_count
                FROM attendance_records 
                WHERE date >= ${sevenDaysAgoStr}::date
                    AND status IN ('individual_punch', 'incomplete', 'orphaned_punchout')
                    AND (notes IS NULL OR notes NOT ILIKE '%lock%')
                    AND biotime_id IS NOT NULL
                GROUP BY DATE(date)
                HAVING COUNT(*) - COUNT(DISTINCT biotime_id) > 0
                ORDER BY duplicate_count DESC
            `);

            let totalRemoved = 0;
            
            for (const day of duplicateAnalysis.rows) {
                const dayStr = day.day;
                const duplicateCount = parseInt(day.duplicate_count?.toString() || '0');
                
                if (duplicateCount > 0) {
                    console.log(`[DuplicateHunter] 🎯 Found ${duplicateCount} duplicates on ${dayStr}`);
                    
                    // Remove biotime_id-based duplicates, keeping first occurrence
                    const removed = await db.execute(sql`
                        WITH biotime_duplicates AS (
                            SELECT 
                                id,
                                biotime_id,
                                ROW_NUMBER() OVER (
                                    PARTITION BY biotime_id 
                                    ORDER BY id ASC
                                ) as rn
                            FROM attendance_records 
                            WHERE DATE(date) = ${dayStr}::date
                                AND status IN ('individual_punch', 'incomplete', 'orphaned_punchout')
                                AND (notes IS NULL OR notes NOT ILIKE '%lock%')
                                AND biotime_id IS NOT NULL
                        )
                        DELETE FROM attendance_records 
                        WHERE id IN (
                            SELECT id FROM biotime_duplicates WHERE rn > 1
                        )
                    `);
                    
                    const removedCount = removed.rowCount || 0;
                    totalRemoved += removedCount;
                    
                    if (removedCount > 0) {
                        console.log(`[DuplicateHunter] ✅ Removed ${removedCount} duplicates from ${dayStr}`);
                    }
                }
            }
            
            if (totalRemoved > 0) {
                console.log(`[DuplicateHunter] 🧹 Total duplicates removed: ${totalRemoved}`);
                this.emit('duplicatesRemoved', { totalRemoved });
            } else {
                console.log('[DuplicateHunter] ✅ No duplicates found in recent data');
            }
            
        } catch (error) {
            console.error('[DuplicateHunter] ❌ Error during duplicate hunting:', error.message);
            throw error;
        }
        
        // Initial activity tracking
        this.lastActivity.autoStitch = new Date();
    }

    // AUTOMATIC PROCESSING SYSTEM - Convert biotime_sync_data to attendance_records automatically
    private async processUnprocessedBiotimeData(): Promise<void> {
        console.log('[AutoProcessor] 🤖 Processing unprocessed BioTime data into attendance records...');
        
        try {
            // Get all unprocessed records from biotime_sync_data
            const unprocessedRecords = await db.execute(sql`
                SELECT * FROM biotime_sync_data 
                WHERE processed = false OR processed IS NULL
                ORDER BY punch_time ASC
                LIMIT 500
            `);
            
            if (unprocessedRecords.rows.length === 0) {
                console.log('[AutoProcessor] ✅ No unprocessed records found');
                return;
            }
            
            console.log(`[AutoProcessor] 📊 Found ${unprocessedRecords.rows.length} unprocessed records`);
            let processed = 0;
            let skipped = 0;
            
            for (const record of unprocessedRecords.rows) {
                try {
                    // Check if already exists in attendance_records
                    const existingAttendance = await db.execute(sql`
                        SELECT id FROM attendance_records 
                        WHERE biotime_id = ${record.biotime_id}
                        LIMIT 1
                    `);
                    
                    if (existingAttendance.rows.length > 0) {
                        console.log(`[AutoProcessor] 🔄 Skipping existing attendance record: ${record.biotime_id}`);
                        skipped++;
                        
                        // Mark as processed even if skipped (already in attendance_records)
                        await db.execute(sql`
                            UPDATE biotime_sync_data 
                            SET processed = true, processed_at = NOW()
                            WHERE id = ${record.id}
                        `);
                        continue;
                    }
                    
                    // Convert BioTime record to attendance record
                    const punchTime = record.punch_time ? new Date(record.punch_time) : new Date();
                    const employeeCode = record.employee_code || record.emp_code || '';
                    
                    if (!employeeCode) {
                        console.log(`[AutoProcessor] ⚠️ Skipping record without employee code: ${record.biotime_id}`);
                        skipped++;
                        continue;
                    }
                    
                    // Determine punch type based on punch_state
                    const punchType = this.determinePunchType(record.punch_state, punchTime);
                    
                    // Create attendance record
                    await db.insert(attendanceRecords).values({
                        biotimeId: record.biotime_id,
                        employeeCode: employeeCode,
                        date: punchTime,
                        checkIn: punchType === 'check_in' ? punchTime : null,
                        checkOut: punchType === 'check_out' ? punchTime : null,
                        status: 'individual_punch',
                        totalHours: '0.00',
                        punchSource: 'terminal',
                        punchType: punchType,
                        notes: `Auto-processed from biotime_sync_data. Terminal: ${record.terminal_sn || 'unknown'}`,
                        latitude: record.latitude ? parseFloat(record.latitude.toString()) : null,
                        longitude: record.longitude ? parseFloat(record.longitude.toString()) : null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    // Mark biotime_sync_data record as processed
                    await db.execute(sql`
                        UPDATE biotime_sync_data 
                        SET processed = true, processed_at = NOW()
                        WHERE id = ${record.id}
                    `);
                    
                    processed++;
                    
                } catch (recordError) {
                    console.error(`[AutoProcessor] ❌ Error processing record ${record.biotime_id}:`, recordError.message);
                    skipped++;
                }
            }
            
            console.log(`[AutoProcessor] ✅ Automatic processing completed: ${processed} processed, ${skipped} skipped`);
            
            if (processed > 0) {
                this.emit('autoProcessingComplete', { processed, skipped, total: unprocessedRecords.rows.length });
            }
            
        } catch (error) {
            console.error('[AutoProcessor] ❌ Error during automatic processing:', error.message);
            throw error;
        }
    }
    
    // Helper function to determine punch type from BioTime punch_state
    private determinePunchType(punchState: string, punchTime: Date): string {
        if (!punchState) return 'standard_checkin';
        
        const state = punchState.toLowerCase();
        const hour = punchTime.getHours();
        
        // BioTime punch states: 0=check_in, 1=check_out, 2=break_in, 3=break_out, 4=overtime_in, 5=overtime_out
        if (state === '0' || state === 'check_in' || state === 'in') {
            if (hour < 7) return 'early_checkin';
            if (hour >= 9) return 'late_checkin';
            return 'standard_checkin';
        }
        
        if (state === '1' || state === 'check_out' || state === 'out') {
            if (hour < 16) return 'early_checkout';
            if (hour >= 19) return 'late_checkout';
            return 'standard_checkout';
        }
        
        // Default to check-in for unknown states
        return 'standard_checkin';
    }

    private async detectAndQueueGaps(): Promise<void> {
        console.log('[AutoStitchPoller] 🔍 Detecting data gaps...');
        
        try {
            // Find date ranges with missing or insufficient data
            const gapQuery = await db.execute(sql`
                WITH date_series AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '30 days',
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date AS check_date
                ),
                daily_counts AS (
                    SELECT 
                        DATE(punch_time) as record_date,
                        COUNT(*) as record_count
                    FROM biotime_sync_data 
                    WHERE punch_time >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY DATE(punch_time)
                )
                SELECT 
                    ds.check_date,
                    COALESCE(dc.record_count, 0) as records
                FROM date_series ds
                LEFT JOIN daily_counts dc ON ds.check_date = dc.record_date
                WHERE COALESCE(dc.record_count, 0) < 50
                ORDER BY ds.check_date DESC
            `);

            for (const gap of gapQuery.rows) {
                try {
                    // Robust date conversion - handle multiple possible formats
                    let dateStr: string;
                    
                    if (gap.check_date instanceof Date) {
                        dateStr = gap.check_date.toISOString().split('T')[0];
                    } else if (typeof gap.check_date === 'string') {
                        // Handle date strings from PostgreSQL
                        if (gap.check_date.includes('T')) {
                            // ISO string format
                            dateStr = gap.check_date.split('T')[0];
                        } else {
                            // Simple date format like 'YYYY-MM-DD'
                            dateStr = gap.check_date;
                        }
                    } else {
                        // Fallback: convert to Date and format
                        const checkDate = new Date(gap.check_date);
                        if (isNaN(checkDate.getTime())) {
                            console.warn(`[AutoStitchPoller] ⚠️ Invalid date format: ${gap.check_date}, skipping gap`);
                            continue;
                        }
                        dateStr = checkDate.toISOString().split('T')[0];
                    }
                    
                    // Check if already queued
                    const alreadyQueued = this.queuedJobs.some(job => job.date === dateStr);
                    if (!alreadyQueued) {
                        this.queuedJobs.push({
                            type: 'gap_fill',
                            date: dateStr,
                            priority: gap.records === 0 ? 'high' : 'normal',
                            queued_at: new Date(),
                            attempts: 0
                        });
                        console.log(`[AutoStitchPoller] 📋 Queued gap fill for ${dateStr} (${gap.records} records)`);
                    }
                } catch (gapError) {
                    console.error(`[AutoStitchPoller] ❌ Error processing gap date ${gap.check_date}:`, gapError.message);
                    continue;
                }
            }

            console.log(`[AutoStitchPoller] 🔍 Found ${gapQuery.rows.length} gaps, ${this.queuedJobs.length} jobs queued`);
        } catch (error) {
            console.error('[AutoStitchPoller] ❌ Gap detection error:', error.message);
        }
    }

    private async processQueuedJobs(): Promise<void> {
        if (this.processingQueue || this.queuedJobs.length === 0) return;

        this.processingQueue = true;
        console.log(`[AutoStitchPoller] 🔄 Processing ${this.queuedJobs.length} queued jobs...`);

        try {
            const token = await this.authenticate();
            
            // Process high priority jobs first
            this.queuedJobs.sort((a, b) => {
                if (a.priority === 'high' && b.priority !== 'high') return -1;
                if (a.priority !== 'high' && b.priority === 'high') return 1;
                return new Date(a.queued_at).getTime() - new Date(b.queued_at).getTime();
            });

            const job = this.queuedJobs.shift();
            if (job) {
                console.log(`[AutoStitchPoller] 🔧 Processing ${job.type} for ${job.date}...`);
                
                try {
                    const records = await this.fetchBioTimeData(job.date, token);
                    const stored = await this.storeBioTimeRecords(records);
                    console.log(`[AutoStitchPoller] ✅ Gap fill completed: ${stored} records for ${job.date}`);
                    this.emit('autoStitchComplete', { date: job.date, recordsStored: stored });
                } catch (error) {
                    console.error(`[AutoStitchPoller] ❌ Job failed for ${job.date}:`, error.message);
                    
                    // Retry failed jobs (max 3 attempts)
                    job.attempts++;
                    if (job.attempts < 3) {
                        this.queuedJobs.push(job);
                        console.log(`[AutoStitchPoller] 🔄 Job requeued (attempt ${job.attempts}/3)`);
                    }
                }
            }
        } catch (error) {
            console.error('[AutoStitchPoller] ❌ Queue processing error:', error.message);
        } finally {
            this.processingQueue = false;
        }
    }

    // Watchdog protection system
    private startWatchdog(): void {
        console.log('[ThreePollerSystem] 🐕 Starting watchdog protection...');
        
        // Check regular poller health every 30 seconds
        this.watchdogTimers.regular = setInterval(() => {
            this.checkPollerHealth('regular');
        }, 30000);
        
        // Check auto-stitch poller health every 60 seconds
        this.watchdogTimers.autoStitch = setInterval(() => {
            this.checkPollerHealth('autoStitch');
        }, 60000);
    }

    private checkPollerHealth(pollerType: 'regular' | 'autoStitch'): void {
        const now = new Date();
        const lastActivity = this.lastActivity[pollerType];
        const timeSinceActivity = now.getTime() - lastActivity.getTime();
        
        // Regular poller should run every 5 minutes (300000ms), allow 7 minute tolerance
        // Auto-stitch should run every 15 minutes, allow 20 minute tolerance
        const timeout = pollerType === 'regular' ? 420000 : 1200000; // 7min or 20min
        
        if (timeSinceActivity > timeout) {
            console.log(`[ThreePollerSystem] 🚨 WATCHDOG: ${pollerType} poller inactive for ${Math.round(timeSinceActivity/1000)}s - RESTARTING`);
            this.healthStatus[pollerType] = 'critical';
            this.restartPoller(pollerType);
        } else if (timeSinceActivity > timeout * 0.7) {
            console.log(`[ThreePollerSystem] ⚠️ WATCHDOG: ${pollerType} poller warning - ${Math.round(timeSinceActivity/1000)}s since last activity`);
            this.healthStatus[pollerType] = 'warning';
        } else {
            this.healthStatus[pollerType] = 'healthy';
        }
    }

    private async restartPoller(pollerType: 'regular' | 'autoStitch'): Promise<void> {
        try {
            console.log(`[ThreePollerSystem] 🔄 EMERGENCY RESTART: ${pollerType} poller`);
            
            // Clear existing timer
            if (this.pollers[pollerType]) {
                clearInterval(this.pollers[pollerType]);
                this.pollers[pollerType] = null;
            }
            
            // Restart the specific poller
            if (pollerType === 'regular') {
                await this.startRegularPoller();
            } else {
                await this.startAutoStitchPoller();
            }
            
            // Update activity timestamp
            this.lastActivity[pollerType] = new Date();
            this.healthStatus[pollerType] = 'healthy';
            
            console.log(`[ThreePollerSystem] ✅ RESTART COMPLETE: ${pollerType} poller restored`);
            this.emit('pollerRestarted', pollerType);
        } catch (error) {
            console.error(`[ThreePollerSystem] 💥 RESTART FAILED: ${pollerType} poller -`, error);
            this.healthStatus[pollerType] = 'critical';
            
            // Try again in 30 seconds
            setTimeout(() => {
                this.restartPoller(pollerType);
            }, 30000);
        }
    }

    // Status reporting methods

    getStatus() {
        return {
            isRunning: this.isRunning,
            pollers: {
                regular: this.pollers.regular !== null,
                autoStitch: this.pollers.autoStitch !== null
            },
            queuedJobs: this.queuedJobs.length,
            processingQueue: this.processingQueue,
            watchdog: {
                lastActivity: this.lastActivity,
                healthStatus: this.healthStatus
            }
        };
    }
}

// Export singleton instance
export const threePollerSystem = new ThreePollerSystem();