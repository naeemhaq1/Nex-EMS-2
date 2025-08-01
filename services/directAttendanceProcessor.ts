import { db } from '../db';
import { attendanceRecords, employeeRecords, shifts } from '@shared/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { format } from 'date-fns';
import { BioTimeService } from './biotimeService';

interface ProcessedAttendanceRecord {
  employeeCode: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: string;
  hoursWorked: number;
  biotimeIds: string[];
}

export class DirectAttendanceProcessor {
  private biotimeService: BioTimeService;

  constructor() {
    this.biotimeService = new BioTimeService();
  }

  // Get the last processed biotime_id and record details for continuity verification
  async getLastProcessedRecord(): Promise<{
    biotimeId: number;
    empCode: string;
    punchTime: string;
    punchState: string;
  } | null> {
    try {
      const result = await db.execute(sql`
        SELECT biotime_id, employee_code, check_in, check_out
        FROM attendance_records 
        WHERE biotime_id IS NOT NULL 
        AND biotime_id != ''
        ORDER BY CAST(biotime_id AS INTEGER) DESC
        LIMIT 1
      `);
      
      if (!result || result.length === 0) {
        console.log('[DirectProcessor] No records found with biotime_id - starting fresh');
        return null;
      }
      
      const record = result[0];
      if (!record || !record.biotime_id) {
        console.log('[DirectProcessor] Invalid record structure - starting fresh');
        return null;
      }
      
      return {
        biotimeId: parseInt(record.biotime_id),
        empCode: record.employee_code || '',
        punchTime: (record.check_in || record.check_out || '').toString(),
        punchState: record.check_in ? '0' : '1'
      };
    } catch (error) {
      console.error('[DirectProcessor] Error getting last record:', error);
      return null;
    }
  }

  // Pull and process data directly without staging with continuity verification
  async pullAndProcessDirectly(limit: number = 1000): Promise<{
    recordsPulled: number;
    attendanceRecordsCreated: number;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('[DirectProcessor] Starting direct pull and process with continuity verification...');
      
      // Get last processed record for continuity verification
      const lastRecord = await this.getLastProcessedRecord();
      const startId = lastRecord ? lastRecord.biotimeId : 0;
      
      console.log(`[DirectProcessor] Last processed record: ID=${startId}, Employee=${lastRecord?.empCode || 'none'}`);
      
      // Pull raw data from BioTime API starting from last processed ID
      const rawData = await this.biotimeService.pullAttendanceData(
        startId, // Include last record for verification
        startId + limit
      );

      if (!rawData.success) {
        return {
          recordsPulled: 0,
          attendanceRecordsCreated: 0,
          success: false,
          error: rawData.error
        };
      }

      console.log(`[DirectProcessor] Retrieved ${rawData.recordsPulled} raw records`);

      // Verify continuity and filter out duplicates
      const filteredData = await this.verifyContinuityAndFilter(rawData.data, lastRecord);
      
      console.log(`[DirectProcessor] After continuity verification: ${filteredData.length} new records`);

      // Process filtered data directly into attendance records
      const attendanceRecordsCreated = await this.processRawDataToAttendance(filteredData);

      return {
        recordsPulled: rawData.recordsPulled,
        attendanceRecordsCreated,
        success: true
      };

    } catch (error) {
      console.error('[DirectProcessor] Error in direct processing:', error);
      return {
        recordsPulled: 0,
        attendanceRecordsCreated: 0,
        success: false,
        error: error.message
      };
    }
  }

  // Verify continuity by checking if first record matches last processed record
  private async verifyContinuityAndFilter(rawRecords: any[], lastRecord: any): Promise<any[]> {
    if (!rawRecords || rawRecords.length === 0) {
      return [];
    }

    // Sort records by biotime_id to ensure proper sequence
    const sortedRecords = rawRecords.sort((a, b) => (a.id || 0) - (b.id || 0));

    // If we have a last record, verify continuity
    if (lastRecord && sortedRecords.length > 0) {
      const firstNewRecord = sortedRecords[0];
      
      // Check if first record matches last processed record (continuity verification)
      if (firstNewRecord.id === lastRecord.biotimeId) {
        console.log(`[DirectProcessor] ✅ Continuity verified - found matching record ID ${firstNewRecord.id}`);
        console.log(`[DirectProcessor] 🗑️ Discarding duplicate record for continuity verification`);
        
        // Remove the duplicate record and return the rest
        return sortedRecords.slice(1);
      } else {
        console.log(`[DirectProcessor] ⚠️ Continuity gap detected - expected ID ${lastRecord.biotimeId}, found ${firstNewRecord.id}`);
        // Continue processing but log the gap
      }
    }

    return sortedRecords;
  }

  // Process raw BioTime data directly into attendance records
  private async processRawDataToAttendance(rawRecords: any[]): Promise<number> {
    if (!rawRecords || rawRecords.length === 0) {
      return 0;
    }

    // Group records by employee and date
    const employeeDayMap = new Map<string, any[]>();
    
    for (const record of rawRecords) {
      if (!record.emp_code || !record.punch_time) {
        continue;
      }

      const date = format(new Date(record.punch_time), 'yyyy-MM-dd');
      const key = `${record.emp_code}-${date}`;
      
      if (!employeeDayMap.has(key)) {
        employeeDayMap.set(key, []);
      }
      employeeDayMap.get(key)!.push(record);
    }

    let recordsCreated = 0;

    // Process each employee-day combination
    for (const [key, dayRecords] of employeeDayMap) {
      const [employeeCode, dateStr] = key.split('-');
      
      try {
        // Sort records by time
        dayRecords.sort((a, b) => new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime());
        
        // Apply stitching algorithm
        const stitchedRecord = await this.stitchDayRecords(employeeCode, dateStr, dayRecords);
        
        if (stitchedRecord) {
          // Check if record already exists
          const existingRecord = await db
            .select()
            .from(attendanceRecords)
            .where(
              and(
                eq(attendanceRecords.employeeCode, employeeCode),
                eq(attendanceRecords.date, new Date(dateStr))
              )
            )
            .limit(1);

          if (existingRecord.length === 0) {
            // Insert new attendance record
            await db.insert(attendanceRecords).values(stitchedRecord);
            recordsCreated++;
          } else {
            // Update existing record with new data
            await db
              .update(attendanceRecords)
              .set({
                checkIn: stitchedRecord.checkIn,
                checkOut: stitchedRecord.checkOut,
                status: stitchedRecord.status,
                hoursWorked: stitchedRecord.hoursWorked,
                biotimeId: stitchedRecord.biotimeId
              })
              .where(
                and(
                  eq(attendanceRecords.employeeCode, employeeCode),
                  eq(attendanceRecords.date, new Date(dateStr))
                )
              );
          }
        }
      } catch (error) {
        console.error(`[DirectProcessor] Error processing ${key}:`, error);
      }
    }

    console.log(`[DirectProcessor] Created/updated ${recordsCreated} attendance records`);
    return recordsCreated;
  }

  // Stitching algorithm to combine multiple punches into single attendance record
  private async stitchDayRecords(
    employeeCode: string, 
    dateStr: string, 
    dayRecords: any[]
  ): Promise<any | null> {
    if (dayRecords.length === 0) {
      return null;
    }

    // Get employee info
    const employee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode))
      .limit(1);

    if (employee.length === 0) {
      console.warn(`[DirectProcessor] Employee ${employeeCode} not found`);
      return null;
    }

    // Separate check-ins (punch_state = 0) and check-outs (punch_state = 1)
    const checkIns = dayRecords.filter(r => r.punch_state === "0");
    const checkOuts = dayRecords.filter(r => r.punch_state === "1");

    // Apply stitching logic
    let checkIn: Date | null = null;
    let checkOut: Date | null = null;
    let status = 'present';
    let hoursWorked = 0;

    // First check-in of the day
    if (checkIns.length > 0) {
      checkIn = new Date(checkIns[0].punch_time);
    }

    // Last check-out of the day
    if (checkOuts.length > 0) {
      checkOut = new Date(checkOuts[checkOuts.length - 1].punch_time);
    }

    // Calculate hours worked
    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime();
      hoursWorked = Math.max(0, Math.round(diffMs / (1000 * 60 * 60) * 100) / 100);
      
      // Cap at 12 hours for anti-overbilling
      if (hoursWorked > 12) {
        hoursWorked = 12;
      }
    } else if (checkIn && !checkOut) {
      status = 'incomplete';
    }

    // Determine status based on shift timing
    if (checkIn && employee[0].shiftId) {
      const shift = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, employee[0].shiftId))
        .limit(1);

      if (shift.length > 0) {
        const shiftStart = new Date(checkIn);
        shiftStart.setHours(shift[0].startHour, shift[0].startMinute, 0, 0);
        
        if (checkIn.getTime() > shiftStart.getTime() + (15 * 60 * 1000)) {
          status = 'late';
        }
      }
    }

    // Collect all biotime_ids for audit trail
    const biotimeIds = dayRecords
      .filter(r => r.id)
      .map(r => r.id.toString())
      .join(',');

    return {
      employeeCode,
      date: new Date(dateStr),
      checkIn,
      checkOut,
      status,
      hoursWorked,
      biotimeId: biotimeIds,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Process today's data specifically
  async processToday(): Promise<{
    recordsPulled: number;
    attendanceRecordsCreated: number;
    success: boolean;
  }> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      console.log(`[DirectProcessor] Processing today's data: ${today}`);
      
      // Get today's raw data from BioTime
      const rawData = await this.biotimeService.pullAttendanceDataByDate(today);
      
      if (!rawData.success) {
        return {
          recordsPulled: 0,
          attendanceRecordsCreated: 0,
          success: false
        };
      }

      const attendanceRecordsCreated = await this.processRawDataToAttendance(rawData.data);

      return {
        recordsPulled: rawData.recordsPulled,
        attendanceRecordsCreated,
        success: true
      };

    } catch (error) {
      console.error('[DirectProcessor] Error processing today:', error);
      return {
        recordsPulled: 0,
        attendanceRecordsCreated: 0,
        success: false
      };
    }
  }
}

export const directAttendanceProcessor = new DirectAttendanceProcessor();