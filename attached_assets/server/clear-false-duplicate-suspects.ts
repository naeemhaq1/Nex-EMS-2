import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function clearFalseDuplicateSuspects() {
  console.log("Clearing false duplicate flags for employees with unique CNICs...\n");
  
  // The 4 employees that were incorrectly marked as duplicates
  const falseDuplicateEmployees = [
    '10070501', // Muhammad Raza - CNIC: 3220315812597
    '10070502', // Muhammad Zeeshan - CNIC: 3520167057675
    '10070503', // Muhammad Awais Raza - CNIC: 3520149519355
    '10070504'  // Muhammad Ahmad Nisar - CNIC: 3520163476533
  ];
  
  try {
    // First, verify these employees and their current status
    const employeesToUpdate = await db
      .select()
      .from(employeeRecords)
      .where(inArray(employeeRecords.employeeCode, falseDuplicateEmployees));
    
    console.log(`Found ${employeesToUpdate.length} employees to update:\n`);
    
    employeesToUpdate.forEach(emp => {
      console.log(`${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`  Department: ${emp.department}`);
      console.log(`  National ID: ${emp.nationalId}`);
      console.log(`  Current Status: Suspect = ${emp.suspect}, Reason = ${emp.susreason}`);
      console.log('');
    });
    
    // Update these employees to remove suspect flag
    const result = await db
      .update(employeeRecords)
      .set({
        suspect: false,
        susreason: null,
        updatedAt: new Date()
      })
      .where(inArray(employeeRecords.employeeCode, falseDuplicateEmployees))
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
    
    console.log(`\n=== Successfully Updated ${result.length} Employees ===`);
    result.forEach(emp => {
      console.log(`✓ ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`  Department: ${emp.department}`);
      console.log(`  National ID: ${emp.nationalId}`);
      console.log(`  New Status: Suspect = ${emp.suspect}, Reason = ${emp.susreason || 'None'}`);
      console.log('');
    });
    
    // Show remaining suspect employees
    console.log('\n=== Remaining Suspect Employees ===');
    const remainingSuspects = await db
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
    
    console.log(`Total remaining suspects: ${remainingSuspects.length}`);
    remainingSuspects.forEach(emp => {
      console.log(`${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`  Department: ${emp.department}`);
      console.log(`  National ID: ${emp.nationalId || 'MISSING'}`);
      console.log(`  Reason: ${emp.susreason || 'No reason'}`);
      console.log('');
    });
    
    console.log('\n=== Summary ===');
    console.log(`Employees cleared from suspect status: ${result.length}`);
    console.log(`Remaining suspect employees: ${remainingSuspects.length}`);
    
  } catch (error) {
    console.error("Error clearing false duplicate suspects:", error);
  }
}

clearFalseDuplicateSuspects().catch(console.error);