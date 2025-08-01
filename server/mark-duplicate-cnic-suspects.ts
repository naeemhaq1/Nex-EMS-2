import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

async function markDuplicateCnicSuspects() {
  console.log("Finding and marking employees with duplicate CNIC 33105-5103633-5 as suspects...\n");
  
  const duplicateCnic = normalizeCNIC("33105-5103633-5");
  
  try {
    // Find all employees with this CNIC
    const employeesWithDuplicateCnic = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.nationalId, duplicateCnic));
    
    console.log(`Found ${employeesWithDuplicateCnic.length} employees with CNIC ${duplicateCnic}:`);
    
    employeesWithDuplicateCnic.forEach(emp => {
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName} (${emp.department})`);
    });
    
    if (employeesWithDuplicateCnic.length === 0) {
      console.log("No employees found with this CNIC.");
      return;
    }
    
    console.log('\nMarking all employees with this CNIC as suspects...\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const emp of employeesWithDuplicateCnic) {
      try {
        const result = await db
          .update(employeeRecords)
          .set({
            suspect: true,
            susreason: 'duplicate CNIC',
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.employeeCode, emp.employeeCode))
          .returning({
            employeeCode: employeeRecords.employeeCode,
            firstName: employeeRecords.firstName,
            middleName: employeeRecords.middleName,
            lastName: employeeRecords.lastName,
            department: employeeRecords.department,
            suspect: employeeRecords.suspect,
            susreason: employeeRecords.susreason
          });
        
        if (result.length > 0) {
          const updated = result[0];
          console.log(`  ✓ ${updated.employeeCode}: ${updated.firstName} ${updated.middleName || ''} ${updated.lastName} (${updated.department})`);
          console.log(`    Status: Suspect = ${updated.suspect}, Reason = ${updated.susreason}`);
          successCount++;
        } else {
          console.log(`  ✗ Failed to update ${emp.employeeCode}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`  ✗ Error updating ${emp.employeeCode}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n=== Duplicate CNIC Suspect Marking Summary ===');
    console.log(`Total employees with duplicate CNIC: ${employeesWithDuplicateCnic.length}`);
    console.log(`Successfully marked as suspect: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    // Show all suspect employees
    console.log('\n=== All Suspect Employees Status ===');
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
    
    console.log(`Total suspect employees: ${allSuspects.length}`);
    allSuspects.forEach(emp => {
      console.log(`${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName} (${emp.department})`);
      console.log(`  CNIC: ${emp.nationalId || 'MISSING'} | Reason: ${emp.susreason || 'No reason'}`);
    });
    
  } catch (error) {
    console.error("Error processing duplicate CNIC suspects:", error);
  }
}

markDuplicateCnicSuspects().catch(console.error);