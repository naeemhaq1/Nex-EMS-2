/**
 * Mark Non-Bio Employees Script (SQL Version)
 * Identifies active employees without BioTime attendance records and adds them to biometric exemptions
 */

import pkg from 'pg';
const { Pool } = pkg;

async function markNonBioEmployees() {
  console.log('🔍 ANALYZING NON-BIO EMPLOYEES');
  console.log('=====================================');

  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Step 1: Get all active employees
    console.log('📊 Step 1: Fetching all active employees...');
    const activeEmployeesResult = await pool.query(`
      SELECT id, employee_code as "employeeCode", first_name as "firstName", last_name as "lastName", 
             department, designation
      FROM employee_records 
      WHERE is_active = true AND system_account = false
      ORDER BY employee_code
    `);

    const activeEmployees = activeEmployeesResult.rows;
    console.log(`✅ Found ${activeEmployees.length} active employees`);

    // Step 2: Get employees who have BioTime attendance records
    console.log('📊 Step 2: Identifying employees with BioTime attendance records...');
    const employeesWithAttendanceResult = await pool.query(`
      SELECT DISTINCT employee_id as "employeeId"
      FROM attendance_records
    `);

    const employeeIdsWithAttendance = employeesWithAttendanceResult.rows.map(record => record.employeeId);
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
    const existingExemptionsResult = await pool.query(`
      SELECT employee_id as "employeeId"
      FROM biometric_exemptions 
      WHERE exemption_type = 'individual' AND is_active = true
    `);

    const exemptedEmployeeIds = existingExemptionsResult.rows.map(exemption => exemption.employeeId);
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

    // Step 6: Add new exemptions using batch insert
    console.log('📝 Step 6: Adding biometric exemptions for non-bio employees...');
    
    // Create values string for batch insert
    const values = newNonBioEmployees.map((employee, index) => {
      const base = index * 6;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    }).join(', ');

    // Flatten parameters array
    const params = newNonBioEmployees.flatMap(employee => [
      employee.id,                                      // employee_id
      employee.employeeCode,                           // employee_code
      'individual',                                    // exemption_type
      'No BioTime attendance records - Non-biometric employee', // reason
      new Date(),                                      // created_at
      true                                            // is_active
    ]);

    const insertQuery = `
      INSERT INTO biometric_exemptions (employee_id, employee_code, exemption_type, reason, created_at, is_active)
      VALUES ${values}
    `;

    await pool.query(insertQuery, params);
    
    console.log(`✅ Successfully added ${newNonBioEmployees.length} biometric exemptions`);

    // Step 7: Summary report
    console.log('\n🎉 NON-BIO EMPLOYEE PROCESSING COMPLETE');
    console.log('=====================================');
    console.log(`📊 Total Active Employees: ${activeEmployees.length}`);
    console.log(`✅ Employees with BioTime Records: ${employeeIdsWithAttendance.length}`);
    console.log(`🚫 Non-Bio Employees (No BioTime): ${nonBioEmployees.length}`);
    console.log(`📝 Already Exempted: ${exemptedEmployeeIds.length}`);
    console.log(`🆕 New Exemptions Added: ${newNonBioEmployees.length}`);
    console.log(`📋 Total Biometric Exemptions: ${exemptedEmployeeIds.length + newNonBioEmployees.length}`);

    // Step 8: Display sample of added employees
    if (newNonBioEmployees.length > 0) {
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