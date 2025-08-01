import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function updateAllLheDesignations() {
  try {
    console.log('Starting comprehensive update of LHE designations...');
    
    // Read CSV file
    const csvPath = 'attached_assets/Lhe-designations_1752292893877.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Remove BOM and parse CSV
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    const records = parse(cleanContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in CSV`);
    
    // Get all employees from database
    const employees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    console.log(`Found ${employees.length} active employees in database`);
    
    let updates = 0;
    let newCnics = 0;
    let newDesignations = 0;
    
    // Process each CSV record
    for (const record of records) {
      const csvName = record.Name || '';
      const csvDesignation = record.Designation || '';
      const csvCnic = record.CNIC || '';
      const csvJoining = record['Joining date'] || '';
      
      if (!csvCnic || !csvDesignation) {
        console.log(`Skipping record with missing data: ${csvName}`);
        continue;
      }
      
      // Remove dashes from CSV CNIC
      const cleanCsvCnic = csvCnic.replace(/[-\s]/g, '');
      
      // Find matching employee by CNIC without dashes
      const matchingEmployee = employees.find(emp => {
        if (!emp.nationalId) return false;
        const cleanDbCnic = emp.nationalId.replace(/[-\s]/g, '');
        return cleanDbCnic === cleanCsvCnic;
      });
      
      if (matchingEmployee) {
        let updateFields: any = {};
        let hasUpdates = false;
        
        // Update designation if missing
        if (!matchingEmployee.designation) {
          updateFields.designation = csvDesignation;
          hasUpdates = true;
          newDesignations++;
        }
        
        // Update joining date if missing
        if (!matchingEmployee.joiningDate && csvJoining) {
          try {
            const joiningDate = new Date(csvJoining);
            if (!isNaN(joiningDate.getTime())) {
              updateFields.joiningDate = joiningDate;
              hasUpdates = true;
            }
          } catch (e) {
            console.log(`Invalid joining date for ${matchingEmployee.employeeCode}: ${csvJoining}`);
          }
        }
        
        if (hasUpdates) {
          updateFields.updatedAt = new Date();
          
          await db
            .update(employeeRecords)
            .set(updateFields)
            .where(eq(employeeRecords.employeeCode, matchingEmployee.employeeCode));
          
          updates++;
          console.log(`Updated ${matchingEmployee.employeeCode} (${matchingEmployee.firstName} ${matchingEmployee.lastName}): ${Object.keys(updateFields).join(', ')}`);
        }
      } else {
        // Try to find employee without CNIC and match by name
        const nameMatch = employees.find(emp => {
          if (emp.nationalId) return false; // Skip employees who already have CNIC
          
          const cleanCsvName = csvName
            .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Syed|Sh\.|Sheikh)\s+/i, '')
            .toLowerCase()
            .trim();
          
          const cleanDbName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.toLowerCase().trim();
          
          return cleanDbName.includes(cleanCsvName.split(' ')[0]) || 
                 cleanCsvName.includes(cleanDbName.split(' ')[0]);
        });
        
        if (nameMatch) {
          // Update with CNIC and designation
          await db
            .update(employeeRecords)
            .set({
              nationalId: cleanCsvCnic,
              designation: csvDesignation,
              cnicMissing: 'no',
              stopPay: false,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.employeeCode, nameMatch.employeeCode));
          
          updates++;
          newCnics++;
          newDesignations++;
          console.log(`Added CNIC and designation for ${nameMatch.employeeCode} (${nameMatch.firstName} ${nameMatch.lastName}): ${cleanCsvCnic}, ${csvDesignation}`);
        } else {
          console.log(`No match found for: ${csvName} (${csvCnic})`);
        }
      }
    }
    
    console.log('\n=== UPDATE SUMMARY ===');
    console.log(`Total updates performed: ${updates}`);
    console.log(`New CNICs added: ${newCnics}`);
    console.log(`New designations added: ${newDesignations}`);
    
    // Final verification
    const finalStats = await db
      .select({
        totalEmployees: sql<number>`COUNT(*)`,
        hasCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NOT NULL THEN 1 END)`,
        hasDesignation: sql<number>`COUNT(CASE WHEN ${employeeRecords.designation} IS NOT NULL THEN 1 END)`,
        missingCnic: sql<number>`COUNT(CASE WHEN ${employeeRecords.nationalId} IS NULL THEN 1 END)`,
        stopPayEnabled: sql<number>`COUNT(CASE WHEN ${employeeRecords.stopPay} = true THEN 1 END)`
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const stats = finalStats[0];
    console.log('\n=== FINAL STATISTICS ===');
    console.log(`Total employees: ${stats.totalEmployees}`);
    console.log(`With CNIC: ${stats.hasCnic}`);
    console.log(`With designation: ${stats.hasDesignation}`);
    console.log(`Missing CNIC: ${stats.missingCnic}`);
    console.log(`STOPPAY enabled: ${stats.stopPayEnabled}`);
    
  } catch (error) {
    console.error('Error updating LHE designations:', error);
  }
}

// Run the update
updateAllLheDesignations();