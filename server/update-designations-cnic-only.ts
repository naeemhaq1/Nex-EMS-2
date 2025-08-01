import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

// Normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

// Parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleanDateStr = dateStr.trim();
  
  // Handle formats like "01-July-2012", "01-Feb-2017", "14-March-2025"
  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);
      
      // Convert month names to numbers
      const months = {
        'January': 0, 'Jan': 0, 'JAN': 0, 'February': 1, 'Feb': 1, 'FEB': 1, 'March': 2, 'Mar': 2, 'MAR': 2,
        'April': 3, 'Apr': 3, 'APR': 3, 'May': 4, 'MAY': 4, 'June': 5, 'Jun': 5, 'JUNE': 5, 'JUN': 5,
        'July': 6, 'Jul': 6, 'JULY': 6, 'JUL': 6, 'August': 7, 'Aug': 7, 'AUG': 7, 'September': 8, 'Sep': 8, 'SEP': 8,
        'October': 9, 'Oct': 9, 'OCT': 9, 'November': 10, 'Nov': 10, 'NOV': 10, 'December': 11, 'Dec': 11, 'DEC': 11
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function updateDesignationsFromAllCSVs() {
  console.log("Updating employee designations from all CSV files - matching on CNIC only...\n");
  
  try {
    const csvFiles = [
      { file: 'attached_assets/Isb-designations_1752294859163.csv', location: 'ISB' },
      { file: 'attached_assets/Lhe-designations_1752288756490.csv', location: 'LHE' },
      { file: 'attached_assets/Psh-designations_1752294499989.csv', location: 'PSH' },
      { file: 'attached_assets/Safecity-lhe-designations_1752297154298.csv', location: 'LHE-Safecity' }
    ];
    
    let totalUpdated = 0;
    let totalProcessed = 0;
    let totalMatched = 0;
    const updateLog = [];
    
    for (const csvInfo of csvFiles) {
      console.log(`\n=== Processing ${csvInfo.file} ===`);
      
      try {
        const csvContent = readFileSync(csvInfo.file, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        console.log(`Found ${records.length} records in CSV`);
        
        for (const record of records) {
          totalProcessed++;
          
          // Get CNIC from all possible column names
          const cnic = record.CNIC || record.cnic || record['CNIC '] || record['cnic '] || '';
          // Get name from all possible column names
          const name = record['Name of  Employees'] || record['Name'] || record['NAME OF EMPLOYEES'] || record['name'] || '';
          // Get designation from all possible column names
          const designation = record['Designation'] || record['DESIGNATION'] || record['designation'] || '';
          // Get joining date from all possible column names
          const joiningDate = record['DATE OF JOINING'] || record['Joining date'] || record['joining date'] || '';
          // Get entitlement date from all possible column names
          const entitlementDate = record['DATE OF ENTITLEMENT'] || record['Entitlement Date'] || record['entitlement date'] || '';
          
          if (!cnic || cnic.trim() === '') {
            console.log(`Skipping record with no CNIC: ${name}`);
            continue;
          }
          
          const normalizedCNIC = normalizeCNIC(cnic);
          
          // Find matching employee by normalized CNIC - ignore department
          const matchingEmployees = await db
            .select()
            .from(employeeRecords)
            .where(eq(employeeRecords.nationalId, normalizedCNIC));
          
          if (matchingEmployees.length === 0) {
            console.log(`No match found for CNIC: ${cnic} (${normalizedCNIC}) - ${name}`);
            continue;
          }
          
          if (matchingEmployees.length > 1) {
            console.log(`Multiple matches found for CNIC: ${cnic} - ${name} (updating all)`);
          }
          
          // Update all matching employees
          for (const employee of matchingEmployees) {
            totalMatched++;
            
            // Parse dates
            const parsedJoiningDate = parseDate(joiningDate);
            const parsedEntitlementDate = parseDate(entitlementDate);
            
            // Update employee record
            const updateData: any = {};
            
            if (designation && designation.trim() !== '') {
              updateData.designation = designation.trim();
            }
            
            if (parsedJoiningDate) {
              updateData.joiningDate = parsedJoiningDate;
            }
            
            if (parsedEntitlementDate) {
              updateData.entitlementDate = parsedEntitlementDate;
            }
            
            if (Object.keys(updateData).length > 0) {
              await db
                .update(employeeRecords)
                .set(updateData)
                .where(eq(employeeRecords.id, employee.id));
              
              totalUpdated++;
              
              const logEntry = {
                employeeCode: employee.employeeCode,
                name: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim(),
                department: employee.department,
                cnic: normalizedCNIC,
                designation: updateData.designation || 'No change',
                joiningDate: parsedJoiningDate ? parsedJoiningDate.toISOString().split('T')[0] : 'No change',
                entitlementDate: parsedEntitlementDate ? parsedEntitlementDate.toISOString().split('T')[0] : 'No change',
                csvSource: csvInfo.location,
                csvName: name
              };
              
              updateLog.push(logEntry);
              
              console.log(`✓ Updated ${employee.employeeCode}: ${employee.firstName} ${employee.lastName} (${employee.department})`);
              console.log(`  CSV Name: ${name}`);
              console.log(`  Designation: ${updateData.designation || 'unchanged'}`);
              console.log(`  Joining Date: ${parsedJoiningDate ? parsedJoiningDate.toISOString().split('T')[0] : 'unchanged'}`);
              console.log(`  Entitlement Date: ${parsedEntitlementDate ? parsedEntitlementDate.toISOString().split('T')[0] : 'unchanged'}`);
              console.log('');
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${csvInfo.file}:`, error);
      }
    }
    
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Total CSV records processed: ${totalProcessed}`);
    console.log(`Total employees matched by CNIC: ${totalMatched}`);
    console.log(`Total employees updated: ${totalUpdated}`);
    
    if (updateLog.length > 0) {
      console.log(`\n=== UPDATES BY CSV SOURCE ===`);
      const sourceCounts = {};
      updateLog.forEach(entry => {
        if (!sourceCounts[entry.csvSource]) {
          sourceCounts[entry.csvSource] = 0;
        }
        sourceCounts[entry.csvSource]++;
      });
      
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`${source}: ${count} employees updated`);
      });
      
      console.log(`\n=== DESIGNATION DISTRIBUTION ===`);
      const designationCounts = {};
      updateLog.forEach(entry => {
        if (entry.designation !== 'No change') {
          if (!designationCounts[entry.designation]) {
            designationCounts[entry.designation] = 0;
          }
          designationCounts[entry.designation]++;
        }
      });
      
      Object.entries(designationCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([designation, count]) => {
          console.log(`${designation}: ${count} employees`);
        });
    }
    
    // Final verification
    console.log(`\n=== FINAL VERIFICATION ===`);
    const finalCount = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const withDesignation = finalCount.filter(emp => emp.designation).length;
    const withoutDesignation = finalCount.length - withDesignation;
    
    console.log(`Total active employees: ${finalCount.length}`);
    console.log(`Employees with designation: ${withDesignation} (${((withDesignation / finalCount.length) * 100).toFixed(1)}%)`);
    console.log(`Employees without designation: ${withoutDesignation} (${((withoutDesignation / finalCount.length) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error("Error updating designations:", error);
  }
}

updateDesignationsFromAllCSVs().catch(console.error);