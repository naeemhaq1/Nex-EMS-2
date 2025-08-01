import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

async function markJamelAsSuspect() {
  console.log("Marking Jamel Ahmad as suspect due to unmatched KHI data...\n");
  
  const employeeCode = '10090420';
  
  try {
    // Get current employee data
    const currentEmployee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.employeeCode, employeeCode))
      .limit(1);
    
    if (currentEmployee.length === 0) {
      console.log(`✗ Employee ${employeeCode} not found`);
      return;
    }
    
    const current = currentEmployee[0];
    console.log(`Found employee: ${current.firstName} ${current.middleName || ''} ${current.lastName}`.trim());
    console.log(`Department: ${current.department}`);
    console.log(`Current suspect status: ${current.suspect}`);
    console.log(`Current suspect reason: ${current.susreason || 'None'}`);
    
    // Update the employee to mark as suspect
    const result = await db
      .update(employeeRecords)
      .set({
        suspect: true,
        susreason: 'no match in KHI data',
        updatedAt: new Date()
      })
      .where(eq(employeeRecords.employeeCode, employeeCode))
      .returning({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department,
        nationalId: employeeRecords.nationalId,
        suspect: employeeRecords.suspect,
        susreason: employeeRecords.susreason
      });
    
    if (result.length > 0) {
      const updated = result[0];
      console.log(`\n✓ Successfully marked as suspect:`);
      console.log(`Employee: ${updated.firstName} ${updated.middleName || ''} ${updated.lastName}`.trim());
      console.log(`Employee Code: ${updated.employeeCode}`);
      console.log(`Department: ${updated.department}`);
      console.log(`National ID: ${updated.nationalId || 'MISSING'}`);
      console.log(`Suspect: ${updated.suspect}`);
      console.log(`Suspect Reason: ${updated.susreason}`);
    } else {
      console.log(`✗ Failed to update employee ${employeeCode}`);
    }
    
  } catch (error) {
    console.error(`✗ Error marking employee as suspect:`, error);
  }
  
  // Show all current suspects
  console.log('\n=== Current Suspect Employees ===');
  const allSuspects = await db
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
    .where(eq(employeeRecords.suspect, true))
    .orderBy(employeeRecords.employeeCode);
  
  console.log(`Total suspect employees: ${allSuspects.length}\n`);
  
  allSuspects.forEach(emp => {
    const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
    console.log(`${emp.employeeCode}: ${fullName}`);
    console.log(`  Department: ${emp.department}`);
    console.log(`  National ID: ${emp.nationalId || 'MISSING'}`);
    console.log(`  Reason: ${emp.susreason || 'No reason'}`);
    console.log('');
  });
}

markJamelAsSuspect().catch(console.error);