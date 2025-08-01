import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

async function processLahoreMeezanSalary() {
  try {
    console.log('Starting processing of Lahore Meezan salary file...');
    
    // Read CSV file
    const csvPath = 'attached_assets/Lahore Meezan TRF_1752303734098.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV - skip header rows
    const records = parse(csvContent, {
      skip_empty_lines: true,
      trim: true,
      from_line: 5 // Skip the header rows
    });
    
    console.log(`Found ${records.length} records in salary file`);
    
    // Get employees currently missing CNICs
    const missingCnicEmployees = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        isNull(employeeRecords.nationalId)
      ));
    
    console.log(`Found ${missingCnicEmployees.length} employees missing CNICs`);
    
    let updates = 0;
    let matches = 0;
    
    // Process each salary record
    for (const record of records) {
      if (!record[1] || !record[3]) continue; // Skip if no name or CNIC
      
      const csvName = record[1].toString().trim();
      const csvCnic = record[3].toString().trim();
      const csvDesignation = record[2] ? record[2].toString().trim() : '';
      const csvJoining = record[4] ? record[4].toString().trim() : '';
      
      if (!csvName || !csvCnic || csvCnic.length < 10) continue;
      
      // Clean CNIC
      const cleanCnic = csvCnic.replace(/[-\s]/g, '');
      
      // Try to match with missing CNIC employees by name
      const matchedEmployee = missingCnicEmployees.find(emp => {
        const empFullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.toLowerCase().trim();
        const csvNameClean = csvName.toLowerCase().trim();
        
        // Direct match
        if (empFullName === csvNameClean) return true;
        
        // Match first and last name
        const empFirstLast = `${emp.firstName} ${emp.lastName || ''}`.toLowerCase().trim();
        if (empFirstLast === csvNameClean) return true;
        
        // Match with variations
        const empNames = empFullName.split(' ').filter(n => n.length > 2);
        const csvNames = csvNameClean.split(' ').filter(n => n.length > 2);
        
        // Check if at least 2 names match
        let matchCount = 0;
        for (const empName of empNames) {
          for (const csvName of csvNames) {
            if (empName === csvName) matchCount++;
          }
        }
        
        return matchCount >= 2;
      });
      
      if (matchedEmployee) {
        matches++;
        
        // Check if CNIC already exists in database
        const existingCnic = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.nationalId, cleanCnic));
        
        if (existingCnic.length > 0) {
          console.log(`CNIC ${cleanCnic} already exists for ${existingCnic[0].firstName} ${existingCnic[0].lastName} - skipping ${csvName}`);
          continue;
        }
        
        // Update the employee
        try {
          await db
            .update(employeeRecords)
            .set({
              nationalId: cleanCnic,
              designation: csvDesignation || matchedEmployee.designation,
              cnicMissing: 'no',
              stopPay: false,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.employeeCode, matchedEmployee.employeeCode));
          
          updates++;
          console.log(`✓ Updated ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
          console.log(`  Added CNIC: ${cleanCnic}`);
          console.log(`  Added designation: ${csvDesignation}`);
          console.log(`  CSV name: ${csvName}`);
          console.log('');
          
        } catch (error) {
          console.log(`✗ Failed to update ${matchedEmployee.employeeCode}: ${error}`);
        }
      }
    }
    
    console.log('\n=== LAHORE MEEZAN SALARY PROCESSING RESULTS ===');
    console.log(`Total salary records: ${records.length}`);
    console.log(`Name matches found: ${matches}`);
    console.log(`Successful updates: ${updates}`);
    
    // Final verification
    const finalMissingCnic = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        isNull(employeeRecords.nationalId)
      ));
    
    console.log(`\nRemaining employees missing CNICs: ${finalMissingCnic[0].count}`);
    
    // Show coverage improvement
    const totalEmployees = await db
      .select({
        total: sql<number>`COUNT(*)`,
        hasCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NOT NULL THEN 1 END)`
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const coverage = (Number(totalEmployees[0].hasCnic) / Number(totalEmployees[0].total)) * 100;
    console.log(`Current CNIC coverage: ${coverage.toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error processing Lahore Meezan salary file:', error);
  }
}

// Run the processing
processLahoreMeezanSalary();