import { db } from "../db";
import { attendanceRecords, employeeRecords, shifts } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";
import { startOfDay, endOfDay, differenceInHours, addHours } from "date-fns";
import { missingPunchOutProcessor } from "./missingPunchOutProcessor";

/**
 * Validated Post-Poll Processor
 * Automatically applies anti-overbilling rules during data processing
 */
export class ValidatedPostPollProcessor {
  constructor() {}

  /**
   * Process new attendance records with anti-overbilling validation
   */
  async processWithValidation(records: any[]): Promise<{
    processedRecords: number;
    adjustmentsMade: number;
    potentialOverbillingSaved: number;
  }> {
    console.log(`[ValidatedPostPollProcessor] 🔄 Processing ${records.length} records with anti-overbilling validation...`);
    
    let processedRecords = 0;
    let adjustmentsMade = 0;
    let potentialOverbillingSaved = 0;

    for (const record of records) {
      try {
        // Process the record normally first
        const processedRecord = await this.processRecord(record);
        
        // Apply anti-overbilling validation if missing punch-out
        if (processedRecord && !processedRecord.checkOut) {
          const validationResult = await this.validateAndAdjustRecord(processedRecord);
          
          if (validationResult.adjusted) {
            adjustmentsMade++;
            potentialOverbillingSaved += validationResult.hoursSaved;
            
            // Update the record with validated data
            await this.updateRecordWithValidation(processedRecord.id, validationResult);
          }
        }
        
        processedRecords++;
      } catch (error) {
        console.error(`[ValidatedPostPollProcessor] Error processing record:`, error);
      }
    }

    console.log(`[ValidatedPostPollProcessor] ✅ Processed ${processedRecords} records`);
    console.log(`[ValidatedPostPollProcessor] 🛡️ Made ${adjustmentsMade} anti-overbilling adjustments`);
    console.log(`[ValidatedPostPollProcessor] 💰 Prevented ${potentialOverbillingSaved.toFixed(2)} hours of potential overbilling`);

    return {
      processedRecords,
      adjustmentsMade,
      potentialOverbillingSaved
    };
  }

  /**
   * Process individual attendance record
   */
  private async processRecord(record: any): Promise<any> {
    // This would contain your normal attendance processing logic
    // For now, return the record as-is
    return record;
  }

  /**
   * Validate and adjust record using anti-overbilling rules
   */
  private async validateAndAdjustRecord(record: any): Promise<{
    adjusted: boolean;
    hoursSaved: number;
    checkOut: Date | null;
    totalHours: number;
    reason: string;
  }> {
    try {
      // Use the missing punch-out processor for validation
      const result = await missingPunchOutProcessor.processMissingPunchOuts({
        from: startOfDay(new Date(record.date)),
        to: endOfDay(new Date(record.date))
      });

      // Find the result for this specific record
      const recordResult = result.results.find(r => r.employeeCode === record.employeeCode);
      
      if (recordResult) {
        const hoursSaved = recordResult.originalHours - recordResult.cappedHours;
        
        return {
          adjusted: hoursSaved > 0,
          hoursSaved,
          checkOut: recordResult.estimatedCheckOut,
          totalHours: recordResult.cappedHours,
          reason: recordResult.adjustmentReason
        };
      }

      return {
        adjusted: false,
        hoursSaved: 0,
        checkOut: null,
        totalHours: record.totalHours || 0,
        reason: "No adjustment needed"
      };
    } catch (error) {
      console.error(`[ValidatedPostPollProcessor] Error validating record:`, error);
      return {
        adjusted: false,
        hoursSaved: 0,
        checkOut: null,
        totalHours: record.totalHours || 0,
        reason: "Validation failed"
      };
    }
  }

  /**
   * Update attendance record with validation results
   */
  private async updateRecordWithValidation(recordId: number, validation: any): Promise<void> {
    try {
      await db
        .update(attendanceRecords)
        .set({
          checkOut: validation.checkOut,
          totalHours: validation.totalHours,
          notes: sql`COALESCE(${attendanceRecords.notes}, '') || ' | AUTO-VALIDATED: ' || ${validation.reason}`,
          updatedAt: new Date()
        })
        .where(eq(attendanceRecords.id, recordId));

      console.log(`[ValidatedPostPollProcessor] 🔄 Auto-validated record ${recordId}: ${validation.reason}`);
    } catch (error) {
      console.error(`[ValidatedPostPollProcessor] Error updating record ${recordId}:`, error);
    }
  }

  /**
   * Schedule automatic validation for new records
   */
  async scheduleAutomaticValidation(): Promise<void> {
    console.log("[ValidatedPostPollProcessor] 🔄 Starting automatic validation scheduler...");
    
    // Run validation every 5 minutes
    setInterval(async () => {
      try {
        const today = new Date();
        const result = await missingPunchOutProcessor.processMissingPunchOuts({
          from: startOfDay(today),
          to: endOfDay(today)
        });

        if (result.adjustmentsMade > 0) {
          console.log(`[ValidatedPostPollProcessor] 🛡️ Auto-validation: ${result.adjustmentsMade} adjustments made`);
        }
      } catch (error) {
        console.error("[ValidatedPostPollProcessor] Auto-validation error:", error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log("[ValidatedPostPollProcessor] ✅ Automatic validation scheduler started");
  }
}

export const validatedPostPollProcessor = new ValidatedPostPollProcessor();