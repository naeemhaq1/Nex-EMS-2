/**
 * Mark Non-Bio Employees Script
 * Identifies active employees without BioTime attendance records and adds them to biometric exemptions
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { eq, and, notInArray, sql } from 'drizzle-orm';

// Import schema
import { employeeRecords, attendanceRecords, biometricExemptions } from '../shared/schema.js';

async function markNonBioEmployees() {
  console.log('🔍 ANALYZING NON-BIO EMPLOYEES');
  console.log('=====================================');

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool);

  try {
    // Step 1: Get all active employees
    console.log('📊 Step 1: Fetching all active employees...');
    const activeEmployees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        designation: employeeRecords.designation
      })
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          eq(employeeRecords.systemAccount, false)
        )
      );

    console.log(`✅ Found ${activeEmployees.length} active employees`);

    // Step 2: Get employees who have BioTime attendance records
    console.log('📊 Step 2: Identifying employees with BioTime attendance records...');
    const employeesWithAttendance = await db
      .select({
        employeeId: attendanceRecords.employeeId
      })
      .from(attendanceRecords)
      .groupBy(attendanceRecords.employeeId);

    const employeeIdsWithAttendance = employeesWithAttendance.map(record => record.employeeId);
    console.log(`✅ Found ${employeeIdsWithAttendance.length} employees with BioTime attendance records`);

    // Step 3: Identify employees WITHOUT attendance records (non-bio employees)
    const nonBioEmployees = activeEmployees.filter(emp => 
      !employeeIdsWithAttendance.includes(emp.id)
    );

    console.log(`🚫 Found ${nonBioEmployees.length} employees WITHOUT BioTime attendance records (Non-Bio)`);

    if (nonBioEmployees.length === 0) {
      console.log('✅ All active employees have BioTime attendance records. No action needed.');
      return;
    }

    // Step 4: Check existing biometric exemptions
    console.log('📊 Step 4: Checking existing biometric exemptions...');
    const existingExemptions = await db
      .select({
        employeeId: biometricExemptions.employeeId
      })
      .from(biometricExemptions)
      .where(
        eq(biometricExemptions.exemptionType, 'individual')
      );

    const exemptedEmployeeIds = existingExemptions.map(exemption => exemption.employeeId);
    console.log(`✅ Found ${exemptedEmployeeIds.length} existing individual biometric exemptions`);

    // Step 5: Filter out employees who are already exempted
    const newNonBioEmployees = nonBioEmployees.filter(emp => 
      !exemptedEmployeeIds.includes(emp.id)
    );

    console.log(`🆕 Found ${newNonBioEmployees.length} new non-bio employees to add to exemptions`);

    if (newNonBioEmployees.length === 0) {
      console.log('✅ All non-bio employees are already in biometric exemptions. No action needed.');
      return;
    }

    // Step 6: Add new exemptions
    console.log('📝 Step 6: Adding biometric exemptions for non-bio employees...');
    
    const exemptionsToAdd = newNonBioEmployees.map(employee => ({
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      exemptionType: 'individual',
      reason: 'No BioTime attendance records - Non-biometric employee',
      createdAt: new Date(),
      isActive: true
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let addedCount = 0;

    for (let i = 0; i < exemptionsToAdd.length; i += batchSize) {
      const batch = exemptionsToAdd.slice(i, i + batchSize);
      
      await db.insert(biometricExemptions).values(batch);
      addedCount += batch.length;
      
      console.log(`✅ Added batch ${Math.ceil((i + 1) / batchSize)}: ${batch.length} exemptions (Total: ${addedCount}/${exemptionsToAdd.length})`);
    }

    // Step 7: Summary report
    console.log('\n🎉 NON-BIO EMPLOYEE PROCESSING COMPLETE');
    console.log('=====================================');
    console.log(`📊 Total Active Employees: ${activeEmployees.length}`);
    console.log(`✅ Employees with BioTime Records: ${employeeIdsWithAttendance.length}`);
    console.log(`🚫 Non-Bio Employees (No BioTime): ${nonBioEmployees.length}`);
    console.log(`📝 Already Exempted: ${exemptedEmployeeIds.length}`);
    console.log(`🆕 New Exemptions Added: ${addedCount}`);
    console.log(`📋 Total Biometric Exemptions: ${exemptedEmployeeIds.length + addedCount}`);

    // Step 8: Display sample of added employees
    if (addedCount > 0) {
      console.log('\n📋 SAMPLE OF NEWLY EXEMPTED EMPLOYEES:');
      console.log('=====================================');
      const sampleSize = Math.min(10, newNonBioEmployees.length);
      for (let i = 0; i < sampleSize; i++) {
        const emp = newNonBioEmployees[i];
        console.log(`• ${emp.employeeCode} - ${emp.firstName} ${emp.lastName} (${emp.department})`);
      }
      if (newNonBioEmployees.length > sampleSize) {
        console.log(`... and ${newNonBioEmployees.length - sampleSize} more employees`);
      }
    }

    console.log('\n✅ All non-bio employees have been successfully added to biometric exemptions');
    console.log('💡 These employees will now be visible in the Biometric Exemptions interface');

  } catch (error) {
    console.error('❌ Error processing non-bio employees:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
markNonBioEmployees()
  .then(() => {
    console.log('\n🚀 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

export { markNonBioEmployees };