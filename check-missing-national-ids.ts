import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { and, eq, isNull, or } from "drizzle-orm";

async function checkMissingNationalIds() {
  console.log("Checking current status of employees without national IDs...\n");
  
  // Get all active employees missing national IDs (excluding suspects)
  const missingIds = await db
    .select({
      employeeCode: employeeRecords.employeeCode,
      firstName: employeeRecords.firstName,
      middleName: employeeRecords.middleName,
      lastName: employeeRecords.lastName,
      department: employeeRecords.department,
      nationalId: employeeRecords.nationalId,
      suspect: employeeRecords.suspect,
      susreason: employeeRecords.susreason
    })
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.nationalId),
          eq(employeeRecords.nationalId, '')
        )
      )
    )
    .orderBy(employeeRecords.department, employeeRecords.employeeCode);
  
  // Separate suspects from non-suspects
  const suspects = missingIds.filter(emp => emp.suspect);
  const nonSuspects = missingIds.filter(emp => !emp.suspect);
  
  console.log(`Total employees missing national IDs: ${missingIds.length}`);
  console.log(`- Suspects: ${suspects.length}`);
  console.log(`- Non-suspects: ${nonSuspects.length}\n`);
  
  // Group by department
  const departmentCounts = {};
  nonSuspects.forEach(emp => {
    const dept = emp.department || 'Unknown';
    if (!departmentCounts[dept]) {
      departmentCounts[dept] = [];
    }
    departmentCounts[dept].push(emp);
  });
  
  console.log('=== NON-SUSPECT EMPLOYEES BY DEPARTMENT ===');
  Object.entries(departmentCounts)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([dept, employees]) => {
      console.log(`\n${dept}: ${employees.length} employees`);
      employees.forEach(emp => {
        const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
        console.log(`  ${emp.employeeCode}: ${fullName}`);
      });
    });
  
  if (suspects.length > 0) {
    console.log('\n=== SUSPECT EMPLOYEES ===');
    suspects.forEach(emp => {
      const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      console.log(`${emp.employeeCode}: ${fullName} (${emp.department})`);
      console.log(`  Reason: ${emp.susreason || 'No reason'}`);
    });
  }
  
  // Get total active employees for completion rate
  const totalActive = await db
    .select()
    .from(employeeRecords)
    .where(eq(employeeRecords.isActive, true));
  
  const totalWithIds = totalActive.length - missingIds.length;
  const completionRate = Math.round((totalWithIds / totalActive.length) * 100);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total active employees: ${totalActive.length}`);
  console.log(`Have national IDs: ${totalWithIds}`);
  console.log(`Missing national IDs: ${missingIds.length}`);
  console.log(`- Non-suspects: ${nonSuspects.length}`);
  console.log(`- Suspects: ${suspects.length}`);
  console.log(`Completion rate: ${completionRate}%`);
  
  return {
    total: missingIds.length,
    nonSuspects: nonSuspects.length,
    suspects: suspects.length,
    completionRate,
    departmentCounts
  };
}

checkMissingNationalIds().catch(console.error);