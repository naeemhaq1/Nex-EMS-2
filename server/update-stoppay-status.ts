import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, isNull, isNotNull, sql } from 'drizzle-orm';

async function updateStoppayStatus() {
  console.log('Starting CNIC compliance update...');
  
  try {
    // Update employees with CNICs - remove from STOPPAY
    const withCnicResult = await db
      .update(employeeRecords)
      .set({
        cnicMissing: 'no',
        stopPay: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(employeeRecords.isActive, true),
        isNotNull(employeeRecords.nationalId)
      ));
    
    console.log('✓ Updated employees with CNICs - removed from STOPPAY');
    
    // Update employees without CNICs - add to STOPPAY
    const withoutCnicResult = await db
      .update(employeeRecords)
      .set({
        cnicMissing: 'yes',
        stopPay: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(employeeRecords.isActive, true),
        isNull(employeeRecords.nationalId)
      ));
    
    console.log('✓ Updated employees without CNICs - added to STOPPAY');
    
    // Get final counts
    const totalEmployees = await db
      .select({
        total: sql<number>`COUNT(*)`,
        withCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NOT NULL THEN 1 END)`,
        missingCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NULL THEN 1 END)`,
        onStoppay: sql<number>`COUNT(CASE WHEN ${employeeRecords.stopPay} = true THEN 1 END)`
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const stats = totalEmployees[0];
    
    console.log('\n=== CNIC COMPLIANCE UPDATE RESULTS ===');
    console.log(`Total employees: ${stats.total}`);
    console.log(`With CNICs: ${stats.withCnic}`);
    console.log(`Missing CNICs: ${stats.missingCnic}`);
    console.log(`On STOPPAY: ${stats.onStoppay}`);
    console.log(`CNIC Coverage: ${((Number(stats.withCnic) / Number(stats.total)) * 100).toFixed(1)}%`);
    
    // List employees still on STOPPAY
    const stoppayEmployees = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.stopPay, true)
      ))
      .orderBy(employeeRecords.employeeCode);
    
    console.log('\n=== EMPLOYEES ON STOPPAY ===');
    stoppayEmployees.forEach(emp => {
      console.log(`${emp.employeeCode} - ${emp.firstName} ${emp.lastName} (${emp.department})`);
    });
    
  } catch (error) {
    console.error('Error updating STOPPAY status:', error);
  }
}

// Run the update
updateStoppayStatus();