import { db } from "../db";
import { attendancePullExt } from "@shared/schema";
import { sql } from "drizzle-orm";

export interface DataGap {
  startTimestamp: string;
  endTimestamp: string;
  gapDurationHours: number;
  missingRecords: number;
  affectedEmployees: string[];
}

export interface ContiguityReport {
  isContiguous: boolean;
  totalRecords: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  gaps: DataGap[];
  gapCount: number;
  contiguityPercentage: number;
}

export class DataContiguityVerifier {
  
  /**
   * Verifies data contiguity and detects gaps in attendance records
   */
  async verifyDataContiguity(maxGapMinutes: number = 10): Promise<ContiguityReport> {
    console.log(`[DataContiguityVerifier] Starting contiguity verification with ${maxGapMinutes}min gap threshold`);
    
    try {
      // Get all attendance records ordered by timestamp
      const records = await db
        .select({
          empCode: attendancePullExt.empCode,
          punchTime: sql<string>`(all_fields->>'punch_time')::text`,
          timestamp: sql<string>`(all_fields->>'punch_time')::timestamp`,
        })
        .from(attendancePullExt)
        .where(sql`all_fields->>'punch_time' IS NOT NULL`)
        .orderBy(sql`(all_fields->>'punch_time')::timestamp`);

      if (records.length === 0) {
        return {
          isContiguous: true,
          totalRecords: 0,
          dateRange: { earliest: '', latest: '' },
          gaps: [],
          gapCount: 0,
          contiguityPercentage: 100
        };
      }

      const gaps: DataGap[] = [];
      const maxGapMs = maxGapMinutes * 60 * 1000;
      
      // Analyze gaps between consecutive records
      for (let i = 1; i < records.length; i++) {
        const prevRecord = records[i - 1];
        const currentRecord = records[i];
        
        const prevTime = new Date(prevRecord.punchTime).getTime();
        const currentTime = new Date(currentRecord.punchTime).getTime();
        const timeDiff = currentTime - prevTime;
        
        // If gap exceeds threshold, record it
        if (timeDiff > maxGapMs) {
          const gapDurationHours = timeDiff / (1000 * 60 * 60);
          const estimatedMissingRecords = Math.floor(gapDurationHours * 4); // Estimate 4 records per hour
          
          gaps.push({
            startTimestamp: prevRecord.punchTime,
            endTimestamp: currentRecord.punchTime,
            gapDurationHours: Math.round(gapDurationHours * 100) / 100,
            missingRecords: estimatedMissingRecords,
            affectedEmployees: [prevRecord.empCode, currentRecord.empCode].filter(Boolean)
          });
        }
      }

      // Calculate contiguity percentage
      const totalTimeSpan = new Date(records[records.length - 1].punchTime).getTime() - 
                            new Date(records[0].punchTime).getTime();
      const totalGapTime = gaps.reduce((sum, gap) => sum + (gap.gapDurationHours * 60 * 60 * 1000), 0);
      const contiguityPercentage = Math.round(((totalTimeSpan - totalGapTime) / totalTimeSpan) * 100);

      const report: ContiguityReport = {
        isContiguous: gaps.length === 0,
        totalRecords: records.length,
        dateRange: {
          earliest: records[0].punchTime,
          latest: records[records.length - 1].punchTime
        },
        gaps,
        gapCount: gaps.length,
        contiguityPercentage
      };

      console.log(`[DataContiguityVerifier] Verification complete: ${report.isContiguous ? 'CONTIGUOUS' : 'GAPS DETECTED'}`);
      console.log(`[DataContiguityVerifier] Total records: ${report.totalRecords}, Gaps: ${report.gapCount}, Contiguity: ${report.contiguityPercentage}%`);
      
      return report;

    } catch (error) {
      console.error('[DataContiguityVerifier] Error during verification:', error);
      throw error;
    }
  }

  /**
   * Identifies specific missing time ranges for targeted data recovery
   */
  async identifyMissingTimeRanges(intervalMinutes: number = 30): Promise<Array<{
    startTime: string;
    endTime: string;
    expectedRecords: number;
  }>> {
    console.log(`[DataContiguityVerifier] Identifying missing time ranges with ${intervalMinutes}min intervals`);
    
    try {
      const records = await db
        .select({
          timestamp: sql<string>`(all_fields->>'punch_time')::timestamp`,
        })
        .from(attendancePullExt)
        .where(sql`all_fields->>'punch_time' IS NOT NULL`)
        .orderBy(sql`(all_fields->>'punch_time')::timestamp`);

      if (records.length === 0) return [];

      const missingRanges = [];
      const intervalMs = intervalMinutes * 60 * 1000;
      
      const startTime = new Date(records[0].timestamp);
      const endTime = new Date(records[records.length - 1].timestamp);
      
      // Create expected time slots
      const expectedSlots = [];
      for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
        expectedSlots.push(new Date(time));
      }

      // Find missing slots
      const actualTimes = records.map(r => new Date(r.timestamp).getTime());
      
      for (const expectedTime of expectedSlots) {
        const expectedTimeMs = expectedTime.getTime();
        const hasNearbyRecord = actualTimes.some(actualTime => 
          Math.abs(actualTime - expectedTimeMs) < intervalMs / 2
        );
        
        if (!hasNearbyRecord) {
          missingRanges.push({
            startTime: expectedTime.toISOString(),
            endTime: new Date(expectedTimeMs + intervalMs).toISOString(),
            expectedRecords: Math.floor(intervalMs / (5 * 60 * 1000)) // Estimate 1 record per 5 minutes
          });
        }
      }

      console.log(`[DataContiguityVerifier] Found ${missingRanges.length} missing time ranges`);
      return missingRanges;

    } catch (error) {
      console.error('[DataContiguityVerifier] Error identifying missing ranges:', error);
      throw error;
    }
  }

  /**
   * Validates that new records maintain data contiguity
   */
  async validateNewRecords(newRecords: any[]): Promise<{
    isValid: boolean;
    issues: string[];
    duplicates: number;
    outOfOrder: number;
  }> {
    console.log(`[DataContiguityVerifier] Validating ${newRecords.length} new records`);
    
    const issues: string[] = [];
    let duplicates = 0;
    let outOfOrder = 0;

    try {
      // Check for chronological order
      for (let i = 1; i < newRecords.length; i++) {
        const prevTime = new Date(newRecords[i - 1].punch_time).getTime();
        const currentTime = new Date(newRecords[i].punch_time).getTime();
        
        if (currentTime < prevTime) {
          outOfOrder++;
          issues.push(`Out of order: ${newRecords[i].punch_time} comes before ${newRecords[i - 1].punch_time}`);
        }
      }

      // Check for duplicates within new records
      const timeMap = new Map<string, number>();
      for (const record of newRecords) {
        const key = `${record.emp_code}-${record.punch_time}`;
        if (timeMap.has(key)) {
          duplicates++;
          issues.push(`Duplicate record: ${key}`);
        } else {
          timeMap.set(key, 1);
        }
      }

      // Check for gaps against existing data
      const lastExistingRecord = await db
        .select({
          timestamp: sql<string>`(all_fields->>'punch_time')::timestamp`,
        })
        .from(attendancePullExt)
        .where(sql`all_fields->>'punch_time' IS NOT NULL`)
        .orderBy(sql`(all_fields->>'punch_time')::timestamp DESC`)
        .limit(1);

      if (lastExistingRecord.length > 0 && newRecords.length > 0) {
        const lastExistingTime = new Date(lastExistingRecord[0].timestamp).getTime();
        const firstNewTime = new Date(newRecords[0].punch_time).getTime();
        const timeDiff = firstNewTime - lastExistingTime;
        
        // Check for significant gap (more than 1 hour)
        if (timeDiff > 60 * 60 * 1000) {
          issues.push(`Large gap detected: ${Math.round(timeDiff / (60 * 60 * 1000))} hours between last existing record and new records`);
        }
      }

      const result = {
        isValid: issues.length === 0,
        issues,
        duplicates,
        outOfOrder
      };

      console.log(`[DataContiguityVerifier] Validation complete: ${result.isValid ? 'VALID' : 'ISSUES FOUND'}`);
      if (!result.isValid) {
        console.log(`[DataContiguityVerifier] Issues: ${result.issues.join(', ')}`);
      }

      return result;

    } catch (error) {
      console.error('[DataContiguityVerifier] Error during validation:', error);
      throw error;
    }
  }
}

export const dataContiguityVerifier = new DataContiguityVerifier();