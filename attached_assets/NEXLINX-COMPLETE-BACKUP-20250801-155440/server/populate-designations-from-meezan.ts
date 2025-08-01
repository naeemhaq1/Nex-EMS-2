import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, sql, isNull, or } from 'drizzle-orm';

async function populateDesignationsFromMeezan() {
  try {
    console.log('Starting designation population from Lahore Meezan salary file...');
    
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
    
    // Get employees missing designations (both with and without CNICs)
    const missingDesignationEmployees = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.designation),
          eq(employeeRecords.designation, '')
        )
      ));
    
    console.log(`Found ${missingDesignationEmployees.length} employees missing designations`);
    
    let updates = 0;
    let matches = 0;
    
    // Process each salary record
    for (const record of records) {
      if (!record[1] || !record[2]) continue; // Skip if no name or designation
      
      const csvName = record[1].toString().trim();
      const csvDesignation = record[2].toString().trim();
      const csvCnic = record[3] ? record[3].toString().trim().replace(/[-\s]/g, '') : '';
      
      if (!csvName || !csvDesignation) continue;
      
      // Try to match with missing designation employees
      const matchedEmployee = missingDesignationEmployees.find(emp => {
        // First try CNIC match if both have CNICs
        if (csvCnic && emp.nationalId && csvCnic === emp.nationalId) {
          return true;
        }
        
        // Then try name matching
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
        
        // Update the employee with designation
        try {
          await db
            .update(employeeRecords)
            .set({
              designation: csvDesignation,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.employeeCode, matchedEmployee.employeeCode));
          
          updates++;
          console.log(`✓ Updated ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
          console.log(`  Added designation: ${csvDesignation}`);
          console.log(`  CSV name: ${csvName}`);
          console.log('');
          
        } catch (error) {
          console.log(`✗ Failed to update ${matchedEmployee.employeeCode}: ${error}`);
        }
      }
    }
    
    console.log('\n=== DESIGNATION POPULATION RESULTS ===');
    console.log(`Total salary records: ${records.length}`);
    console.log(`Name matches found: ${matches}`);
    console.log(`Successful designation updates: ${updates}`);
    
    // Final verification
    const finalMissingDesignations = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.designation),
          eq(employeeRecords.designation, '')
        )
      ));
    
    console.log(`\nRemaining employees missing designations: ${finalMissingDesignations[0].count}`);
    
    // Show designation coverage
    const totalEmployees = await db
      .select({
        total: sql<number>`COUNT(*)`,
        hasDesignation: sql<number>`COUNT(CASE WHEN ${employeeRecords.designation} IS NOT NULL AND ${employeeRecords.designation} != '' THEN 1 END)`
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const coverage = (Number(totalEmployees[0].hasDesignation) / Number(totalEmployees[0].total)) * 100;
    console.log(`Current designation coverage: ${coverage.toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error populating designations from Meezan file:', error);
  }
}

// Run the processing
populateDesignationsFromMeezan();