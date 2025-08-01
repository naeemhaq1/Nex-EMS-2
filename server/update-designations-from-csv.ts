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
        'January': 0, 'Jan': 0, 'February': 1, 'Feb': 1, 'March': 2, 'Mar': 2,
        'April': 3, 'Apr': 3, 'May': 4, 'June': 5, 'Jun': 5,
        'July': 6, 'Jul': 6, 'August': 7, 'Aug': 7, 'September': 8, 'Sep': 8,
        'October': 9, 'Oct': 9, 'OCT': 9, 'November': 10, 'Nov': 10, 'December': 11, 'Dec': 11
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  // Handle formats like "03-August-2020", "20-Sep-2021"
  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);
      
      const months = {
        'January': 0, 'Jan': 0, 'February': 1, 'Feb': 1, 'March': 2, 'Mar': 2,
        'April': 3, 'Apr': 3, 'May': 4, 'June': 5, 'Jun': 5,
        'July': 6, 'Jul': 6, 'August': 7, 'Aug': 7, 'September': 8, 'Sep': 8,
        'October': 9, 'Oct': 9, 'OCT': 9, 'November': 10, 'Nov': 10, 'December': 11, 'Dec': 11,
        'MAY': 4, 'JUNE': 5
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function updateDesignationsFromCSV() {
  console.log("Updating employee designations, joining dates, and entitlement dates from CSV files...\n");
  
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
          
          // Get CNIC from various possible column names
          const cnic = record.CNIC || record.cnic || record['CNIC '] || record['cnic '] || '';
          const name = record['Name of  Employees'] || record['Name'] || record['NAME OF EMPLOYEES'] || record['name'] || '';
          const designation = record['Designation'] || record['DESIGNATION'] || record['designation'] || '';
          const joiningDate = record['DATE OF JOINING'] || record['Joining date'] || record['joining date'] || '';
          const entitlementDate = record['DATE OF ENTITLEMENT'] || record['Entitlement Date'] || record['entitlement date'] || '';
          
          if (!cnic || cnic.trim() === '') {
            console.log(`Skipping record with no CNIC: ${name}`);
            continue;
          }
          
          const normalizedCNIC = normalizeCNIC(cnic);
          
          // Find matching employee by normalized CNIC
          const matchingEmployees = await db
            .select()
            .from(employeeRecords)
            .where(eq(employeeRecords.nationalId, normalizedCNIC));
          
          if (matchingEmployees.length === 0) {
            console.log(`No match found for CNIC: ${cnic} (${normalizedCNIC}) - ${name}`);
            continue;
          }
          
          if (matchingEmployees.length > 1) {
            console.log(`Multiple matches found for CNIC: ${cnic} - ${name}`);
            continue;
          }
          
          const employee = matchingEmployees[0];
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
              cnic: normalizedCNIC,
              designation: updateData.designation || 'No change',
              joiningDate: parsedJoiningDate ? parsedJoiningDate.toISOString().split('T')[0] : 'No change',
              entitlementDate: parsedEntitlementDate ? parsedEntitlementDate.toISOString().split('T')[0] : 'No change',
              location: csvInfo.location
            };
            
            updateLog.push(logEntry);
            
            console.log(`✓ Updated ${employee.employeeCode}: ${employee.firstName} ${employee.lastName}`);
            console.log(`  Designation: ${updateData.designation || 'unchanged'}`);
            console.log(`  Joining Date: ${parsedJoiningDate ? parsedJoiningDate.toISOString().split('T')[0] : 'unchanged'}`);
            console.log(`  Entitlement Date: ${parsedEntitlementDate ? parsedEntitlementDate.toISOString().split('T')[0] : 'unchanged'}`);
            console.log('');
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${csvInfo.file}:`, error);
      }
    }
    
    console.log(`\n=== FINAL SUMMARY ===`);
    console.log(`Total records processed: ${totalProcessed}`);
    console.log(`Total employees matched by CNIC: ${totalMatched}`);
    console.log(`Total employees updated: ${totalUpdated}`);
    
    if (updateLog.length > 0) {
      console.log(`\n=== DETAILED UPDATE LOG ===`);
      updateLog.forEach(entry => {
        console.log(`${entry.employeeCode}: ${entry.name} (${entry.location})`);
        console.log(`  CNIC: ${entry.cnic}`);
        console.log(`  Designation: ${entry.designation}`);
        console.log(`  Joining Date: ${entry.joiningDate}`);
        console.log(`  Entitlement Date: ${entry.entitlementDate}`);
        console.log('');
      });
    }
    
    // Summary by location
    const locationCounts = {};
    updateLog.forEach(entry => {
      if (!locationCounts[entry.location]) {
        locationCounts[entry.location] = 0;
      }
      locationCounts[entry.location]++;
    });
    
    console.log(`\n=== UPDATES BY LOCATION ===`);
    Object.entries(locationCounts).forEach(([location, count]) => {
      console.log(`${location}: ${count} employees updated`);
    });
    
  } catch (error) {
    console.error("Error updating designations:", error);
  }
}

updateDesignationsFromCSV().catch(console.error);