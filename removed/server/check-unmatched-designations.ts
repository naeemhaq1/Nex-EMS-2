import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

interface DesignationData {
  name: string;
  designation: string;
  cnic: string;
  joiningDate: string;
  entitlementDate: string;
}

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '').trim();
}

async function checkUnmatchedDesignations() {
  try {
    console.log('Reading CSV file...');
    const csvContent = readFileSync('../attached_assets/Lhe-designations_1752288756490.csv', 'utf-8');
    
    console.log('Parsing CSV data...');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as any[];

    console.log(`Found ${records.length} records in CSV`);

    // Get all employees from database
    const allEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));

    console.log(`Found ${allEmployees.length} active employees in database`);

    const unmatchedRecords: any[] = [];
    const matchedRecords: any[] = [];

    for (const record of records) {
      const name = record['Name']?.trim() || '';
      const cnic = normalizeCNIC(record['CNIC'] || '');
      const designation = record['Designation']?.trim() || '';

      // Skip empty rows
      if (!name && !cnic && !designation) {
        continue;
      }

      if (!cnic || !designation) {
        unmatchedRecords.push({
          name,
          cnic,
          designation,
          reason: 'Missing CNIC or designation'
        });
        continue;
      }

      // Find employee by normalized CNIC
      const matchingEmployee = allEmployees.find(emp => {
        const empCnic = normalizeCNIC(emp.nationalId || '');
        return empCnic === cnic;
      });

      if (matchingEmployee) {
        matchedRecords.push({
          name,
          cnic,
          designation,
          employeeCode: matchingEmployee.employeeCode,
          employeeName: `${matchingEmployee.firstName} ${matchingEmployee.lastName}`,
          status: 'MATCHED'
        });
      } else {
        unmatchedRecords.push({
          name,
          cnic,
          designation,
          reason: 'No matching employee found in database'
        });
      }
    }

    console.log('\n=== UNMATCHED DESIGNATIONS REPORT ===');
    console.log(`Total CSV records: ${records.length}`);
    console.log(`Successfully matched: ${matchedRecords.length}`);
    console.log(`Could not match: ${unmatchedRecords.length}`);

    console.log('\n=== EMPLOYEES THAT COULD NOT BE MATCHED ===');
    unmatchedRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.name || 'Unknown Name'}`);
      console.log(`   CNIC: ${record.cnic || 'Missing'}`);
      console.log(`   Designation: ${record.designation || 'Missing'}`);
      console.log(`   Reason: ${record.reason}`);
      console.log('');
    });

    // Check if any of the unmatched CNICs exist in database with different format
    console.log('\n=== CHECKING FOR PARTIAL CNIC MATCHES ===');
    const unmatchedCnics = unmatchedRecords.filter(r => r.cnic && r.cnic.length > 10);
    
    for (const record of unmatchedCnics) {
      const partialMatches = allEmployees.filter(emp => {
        const empCnic = normalizeCNIC(emp.nationalId || '');
        if (!empCnic) return false;
        
        // Check if CNICs contain each other or have similar patterns
        return empCnic.includes(record.cnic.substring(0, 8)) || 
               record.cnic.includes(empCnic.substring(0, 8));
      });

      if (partialMatches.length > 0) {
        console.log(`Potential match for: ${record.name} (CNIC: ${record.cnic})`);
        partialMatches.forEach(emp => {
          console.log(`  → ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (CNIC: ${emp.nationalId})`);
        });
        console.log('');
      }
    }

    console.log('\n=== SUMMARY BY DESIGNATION ===');
    const designationSummary = new Map<string, { matched: number, unmatched: number }>();

    // Count matched designations
    matchedRecords.forEach(record => {
      const designation = record.designation;
      if (!designationSummary.has(designation)) {
        designationSummary.set(designation, { matched: 0, unmatched: 0 });
      }
      designationSummary.get(designation)!.matched++;
    });

    // Count unmatched designations
    unmatchedRecords.forEach(record => {
      const designation = record.designation;
      if (!designationSummary.has(designation)) {
        designationSummary.set(designation, { matched: 0, unmatched: 0 });
      }
      designationSummary.get(designation)!.unmatched++;
    });

    // Sort by total (matched + unmatched)
    const sortedDesignations = Array.from(designationSummary.entries())
      .sort((a, b) => (b[1].matched + b[1].unmatched) - (a[1].matched + a[1].unmatched));

    sortedDesignations.forEach(([designation, counts]) => {
      const total = counts.matched + counts.unmatched;
      const percentage = ((counts.matched / total) * 100).toFixed(1);
      console.log(`${designation}: ${counts.matched}/${total} matched (${percentage}%)`);
    });

  } catch (error) {
    console.error('Error checking unmatched designations:', error);
  }
}

checkUnmatchedDesignations().then(() => {
  console.log('\nUnmatched designations check completed');
  process.exit(0);
}).catch(error => {
  console.error('Process failed:', error);
  process.exit(1);
});