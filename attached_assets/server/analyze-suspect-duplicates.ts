import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function analyzeSuspectDuplicates() {
  console.log("Analyzing what made the other suspect records duplicates...\n");
  
  // Get all suspect employees
  const suspectEmployees = await db
    .select()
    .from(employeeRecords)
    .where(eq(employeeRecords.suspect, true))
    .orderBy(employeeRecords.employeeCode);
  
  console.log(`Found ${suspectEmployees.length} suspect employees:\n`);
  
  // Group by suspect reason
  const reasonGroups = {};
  suspectEmployees.forEach(emp => {
    const reason = emp.susreason || 'No reason';
    if (!reasonGroups[reason]) {
      reasonGroups[reason] = [];
    }
    reasonGroups[reason].push(emp);
  });
  
  // Analyze each group
  for (const [reason, employees] of Object.entries(reasonGroups)) {
    console.log(`=== SUSPECT REASON: ${reason} ===`);
    console.log(`Count: ${employees.length} employees\n`);
    
    employees.forEach(emp => {
      console.log(`${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`  Department: ${emp.department}`);
      console.log(`  National ID: ${emp.nationalId || 'MISSING'}`);
      console.log(`  Employee Code: ${emp.employeeCode}`);
      console.log(`  Is Active: ${emp.isActive}`);
      console.log(`  Created: ${emp.createdAt}`);
      console.log('');
    });
  }
  
  // Focus on the "duplicate" reason group
  const duplicateReasonEmployees = reasonGroups['duplicate'] || [];
  
  if (duplicateReasonEmployees.length > 0) {
    console.log('\n=== ANALYZING "duplicate" REASON GROUP ===');
    console.log(`Found ${duplicateReasonEmployees.length} employees marked as "duplicate"\n`);
    
    // Check for duplicate national IDs
    const nationalIds = duplicateReasonEmployees
      .map(emp => emp.nationalId)
      .filter(id => id && id.trim() !== '');
    
    console.log('National IDs of duplicate employees:');
    duplicateReasonEmployees.forEach(emp => {
      console.log(`  ${emp.employeeCode}: ${emp.nationalId || 'MISSING'}`);
    });
    
    // Check if any of these national IDs appear elsewhere in the database
    if (nationalIds.length > 0) {
      console.log('\nChecking if these National IDs appear elsewhere in the database...\n');
      
      for (const nationalId of nationalIds) {
        const employeesWithSameNationalId = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.nationalId, nationalId));
        
        if (employeesWithSameNationalId.length > 1) {
          console.log(`⚠️  DUPLICATE NATIONAL ID FOUND: ${nationalId}`);
          employeesWithSameNationalId.forEach(emp => {
            console.log(`    ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName} (${emp.department}) - Suspect: ${emp.suspect}`);
          });
          console.log('');
        } else {
          console.log(`✓ National ID ${nationalId} is unique (only in ${employeesWithSameNationalId[0]?.employeeCode})`);
        }
      }
    }
    
    // Check for duplicate names
    console.log('\nChecking for duplicate names...\n');
    
    const nameFrequency = {};
    duplicateReasonEmployees.forEach(emp => {
      const fullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim().toLowerCase();
      if (!nameFrequency[fullName]) {
        nameFrequency[fullName] = [];
      }
      nameFrequency[fullName].push(emp);
    });
    
    Object.entries(nameFrequency).forEach(([name, employees]) => {
      if (employees.length > 1) {
        console.log(`⚠️  DUPLICATE NAME FOUND: ${name}`);
        employees.forEach(emp => {
          console.log(`    ${emp.employeeCode}: ${emp.department} - National ID: ${emp.nationalId || 'MISSING'}`);
        });
        console.log('');
      }
    });
    
    // Check for duplicate employee codes (shouldn't happen due to primary key)
    console.log('\nEmployee codes in duplicate group:');
    duplicateReasonEmployees.forEach(emp => {
      console.log(`  ${emp.employeeCode}`);
    });
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total suspect employees: ${suspectEmployees.length}`);
  Object.entries(reasonGroups).forEach(([reason, employees]) => {
    console.log(`  ${reason}: ${employees.length} employees`);
  });
  
  console.log('\n📊 Analysis completed successfully!');
}

analyzeSuspectDuplicates().catch(console.error);le.error);