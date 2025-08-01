#!/usr/bin/env node

/**
 * Daily Biometric Exemption Monitor
 * 
 * This script runs daily to:
 * 1. Check if any biometric-exempted employees have marked attendance via biometric devices
 * 2. Automatically remove them from exemptions if they use biometric attendance
 * 3. Log all activities for audit purposes
 * 
 * Schedule: Daily at 6:00 AM (after attendance data sync)
 */

import { config } from 'dotenv';
config();

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, gte, sql, ne } from 'drizzle-orm';
import { format, subDays, startOfDay } from 'date-fns';

// Import schema
import { employeeRecords, attendanceRecords, biometricExemptions } from '../shared/schema.js';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

class BiometricExemptionMonitor {
  constructor() {
    this.processedDate = format(new Date(), 'yyyy-MM-dd');
    this.exemptionsRemoved = [];
    this.exemptionsKept = [];
    this.errors = [];
  }

  async run() {
    console.log('🔍 DAILY BIOMETRIC EXEMPTION MONITOR');
    console.log('=====================================');
    console.log(`📅 Processing Date: ${this.processedDate}`);
    console.log(`⏰ Run Time: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Step 1: Get all active biometric exemptions
      const activeExemptions = await this.getActiveExemptions();
      console.log(`📊 Found ${activeExemptions.length} active biometric exemptions`);

      if (activeExemptions.length === 0) {
        console.log('✅ No active exemptions to monitor');
        return this.generateSummary();
      }

      // Step 2: Check each exempted employee for recent biometric attendance
      await this.checkExemptedEmployeesAttendance(activeExemptions);

      // Step 3: Generate summary report
      return this.generateSummary();

    } catch (error) {
      console.error('❌ CRITICAL ERROR in BiometricExemptionMonitor:', error);
      this.errors.push(`Critical system error: ${error.message}`);
      return this.generateSummary();
    } finally {
      await pool.end();
    }
  }

  async getActiveExemptions() {
    try {
      const exemptions = await db
        .select({
          id: biometricExemptions.id,
          employeeCode: biometricExemptions.employeeCode,
          exemptionType: biometricExemptions.exemptionType,
          reason: biometricExemptions.reason,
          createdAt: biometricExemptions.createdAt,
          createdBy: biometricExemptions.createdBy
        })
        .from(biometricExemptions)
        .where(
          and(
            eq(biometricExemptions.isActive, true),
            eq(biometricExemptions.exemptionType, 'individual') // Only individual exemptions
          )
        );

      return exemptions.filter(exemption => exemption.employeeCode); // Only employee-specific exemptions
    } catch (error) {
      console.error('❌ Error fetching active exemptions:', error);
      this.errors.push(`Failed to fetch exemptions: ${error.message}`);
      return [];
    }
  }

  async checkExemptedEmployeesAttendance(exemptions) {
    console.log('\n🔍 CHECKING BIOMETRIC ATTENDANCE FOR EXEMPTED EMPLOYEES');
    console.log('========================================================');

    // Check attendance for last 7 days to catch any recent biometric usage
    const checkStartDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const checkEndDate = this.processedDate;

    console.log(`📅 Checking attendance from ${checkStartDate} to ${checkEndDate}`);

    for (const exemption of exemptions) {
      try {
        console.log(`\n👤 Checking: ${exemption.employeeCode}`);

        // Get employee details
        const employee = await this.getEmployeeDetails(exemption.employeeCode);
        if (!employee) {
          console.log(`   ⚠️  Employee ${exemption.employeeCode} not found in records`);
          this.errors.push(`Employee ${exemption.employeeCode} not found`);
          continue;
        }

        console.log(`   📝 ${employee.firstName} ${employee.lastName} (${employee.department})`);

        // Check for biometric attendance records in the date range
        const biometricAttendance = await this.checkBiometricAttendance(
          exemption.employeeCode, 
          checkStartDate, 
          checkEndDate
        );

        if (biometricAttendance.hasRecords) {
          console.log(`   ✅ BIOMETRIC ACTIVITY DETECTED!`);
          console.log(`   📊 Records found: ${biometricAttendance.recordCount}`);
          console.log(`   📅 Latest: ${biometricAttendance.latestDate}`);
          console.log(`   🔧 Source: ${biometricAttendance.source}`);

          // Remove from exemptions
          await this.removeFromExemptions(exemption, employee, biometricAttendance);
        } else {
          console.log(`   ⭕ No biometric activity - exemption maintained`);
          this.exemptionsKept.push({
            employeeCode: exemption.employeeCode,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            reason: exemption.reason
          });
        }

      } catch (error) {
        console.error(`   ❌ Error checking ${exemption.employeeCode}:`, error);
        this.errors.push(`Failed to check ${exemption.employeeCode}: ${error.message}`);
      }
    }
  }

  async getEmployeeDetails(employeeCode) {
    try {
      const employees = await db
        .select({
          id: employeeRecords.id,
          employeeCode: employeeRecords.employeeCode,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          designation: employeeRecords.designation
        })
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, employeeCode))
        .limit(1);

      return employees[0] || null;
    } catch (error) {
      console.error(`Error fetching employee ${employeeCode}:`, error);
      return null;
    }
  }

  async checkBiometricAttendance(employeeCode, startDate, endDate) {
    try {
      // Check attendance_records table for biometric records
      const records = await db
        .select({
          id: attendanceRecords.id,
          date: attendanceRecords.date,
          checkIn: attendanceRecords.checkIn,
          checkOut: attendanceRecords.checkOut,
          deviceId: attendanceRecords.deviceId,
          source: sql`COALESCE(${attendanceRecords.source}, 'biotime')`.as('source')
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeCode, employeeCode),
            gte(sql`DATE(${attendanceRecords.date})`, startDate),
            sql`DATE(${attendanceRecords.date}) <= ${endDate}`,
            // Only count records that represent actual biometric activity
            sql`${attendanceRecords.checkIn} IS NOT NULL`
          )
        );

      if (records.length > 0) {
        // Sort by date to get latest
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return {
          hasRecords: true,
          recordCount: records.length,
          latestDate: format(new Date(records[0].date), 'yyyy-MM-dd'),
          latestRecord: records[0],
          source: records[0].source || 'biotime'
        };
      }

      return { hasRecords: false, recordCount: 0 };
    } catch (error) {
      console.error(`Error checking biometric attendance for ${employeeCode}:`, error);
      return { hasRecords: false, recordCount: 0 };
    }
  }

  async removeFromExemptions(exemption, employee, biometricData) {
    try {
      console.log(`   🗑️  REMOVING FROM BIOMETRIC EXEMPTIONS...`);

      // Update exemption to inactive
      await db
        .update(biometricExemptions)
        .set({
          isActive: false,
          removedAt: sql`NOW()`,
          removedBy: 'SYSTEM_AUTO_MONITOR',
          removalReason: `Automatic removal - Employee used biometric attendance on ${biometricData.latestDate}`
        })
        .where(eq(biometricExemptions.id, exemption.id));

      console.log(`   ✅ Successfully removed from exemptions`);

      // Add to removed list for summary
      this.exemptionsRemoved.push({
        employeeCode: exemption.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        originalReason: exemption.reason,
        removalReason: `Used biometric attendance on ${biometricData.latestDate}`,
        recordCount: biometricData.recordCount,
        exemptionId: exemption.id
      });

    } catch (error) {
      console.error(`   ❌ Failed to remove exemption for ${exemption.employeeCode}:`, error);
      this.errors.push(`Failed to remove exemption for ${exemption.employeeCode}: ${error.message}`);
    }
  }

  generateSummary() {
    console.log('\n📋 DAILY MONITORING SUMMARY');
    console.log('===========================');
    console.log(`📅 Date: ${this.processedDate}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log('');

    // Exemptions removed
    console.log(`🗑️  EXEMPTIONS REMOVED: ${this.exemptionsRemoved.length}`);
    if (this.exemptionsRemoved.length > 0) {
      console.log('   ┌─────────────────────────────────────────────────────');
      this.exemptionsRemoved.forEach((removal, index) => {
        console.log(`   │ ${index + 1}. ${removal.employeeName} (${removal.employeeCode})`);
        console.log(`   │    Department: ${removal.department}`);
        console.log(`   │    Reason: ${removal.removalReason}`);
        console.log(`   │    Records: ${removal.recordCount} biometric entries found`);
        console.log('   │');
      });
      console.log('   └─────────────────────────────────────────────────────');
    }

    // Exemptions maintained
    console.log(`\n⭕ EXEMPTIONS MAINTAINED: ${this.exemptionsKept.length}`);
    if (this.exemptionsKept.length > 0) {
      console.log('   ┌─────────────────────────────────────────────────────');
      this.exemptionsKept.forEach((kept, index) => {
        console.log(`   │ ${index + 1}. ${kept.employeeName} (${kept.employeeCode})`);
        console.log(`   │    Department: ${kept.department}`);
        console.log(`   │    Reason: ${kept.reason}`);
        console.log('   │');
      });
      console.log('   └─────────────────────────────────────────────────────');
    }

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS ENCOUNTERED: ${this.errors.length}`);
      console.log('   ┌─────────────────────────────────────────────────────');
      this.errors.forEach((error, index) => {
        console.log(`   │ ${index + 1}. ${error}`);
      });
      console.log('   └─────────────────────────────────────────────────────');
    }

    console.log('\n✅ MONITORING COMPLETE');
    
    return {
      processedDate: this.processedDate,
      exemptionsRemoved: this.exemptionsRemoved.length,
      exemptionsKept: this.exemptionsKept.length,
      errors: this.errors.length,
      details: {
        removed: this.exemptionsRemoved,
        kept: this.exemptionsKept,
        errors: this.errors
      }
    };
  }
}

// Run the monitor if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new BiometricExemptionMonitor();
  monitor.run()
    .then(summary => {
      console.log('\n🎯 EXECUTION SUMMARY:');
      console.log(`   Exemptions Removed: ${summary.exemptionsRemoved}`);
      console.log(`   Exemptions Kept: ${summary.exemptionsKept}`);
      console.log(`   Errors: ${summary.errors}`);
      process.exit(summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 FATAL ERROR:', error);
      process.exit(1);
    });
}

export { BiometricExemptionMonitor };