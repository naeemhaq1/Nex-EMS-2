import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import { employeeRecords } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface DesignationData {
  name: string;
  designation: string;
  cnic: string;
  joiningDate: string;
  entitlementDate: string;
}

function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  return name
    .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Syed|Sh\.|Sheikh)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function investigateLheDesignations() {
  try {
    console.log('Starting investigation of LHE designations CSV...');
    
    // Read CSV file
    const csvPath = 'attached_assets/Lhe-designations_1752292893877.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Remove BOM if present
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    
    // Parse CSV
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
    
    let csvMatches = 0;
    let dbMatches = 0;
    let designationUpdates = 0;
    const unmatched: any[] = [];
    const matched: any[] = [];
    
    // Process each CSV record
    for (const record of records) {
      const csvData: DesignationData = {
        name: record.Name || '',
        designation: record.Designation || '',
        cnic: record.CNIC || '',
        joiningDate: record['Joining date'] || '',
        entitlementDate: record['Entitlement Date'] || ''
      };
      
      if (!csvData.cnic) {
        console.log(`Skipping record with no CNIC: ${csvData.name}`);
        continue;
      }
      
      csvMatches++;
      
      const normalizedCsvCnic = normalizeCNIC(csvData.cnic);
      
      // Try to find matching employee by CNIC
      const matchingEmployee = employees.find(emp => {
        if (!emp.nationalId) return false;
        const normalizedDbCnic = normalizeCNIC(emp.nationalId);
        return normalizedDbCnic === normalizedCsvCnic;
      });
      
      if (matchingEmployee) {
        dbMatches++;
        matched.push({
          csvName: csvData.name,
          dbName: `${matchingEmployee.firstName} ${matchingEmployee.middleName || ''} ${matchingEmployee.lastName || ''}`.trim(),
          employeeCode: matchingEmployee.employeeCode,
          department: matchingEmployee.department,
          cnic: csvData.cnic,
          designation: csvData.designation,
          currentDesignation: matchingEmployee.designation,
          needsUpdate: !matchingEmployee.designation
        });
        
        // Check if designation needs to be updated
        if (!matchingEmployee.designation && csvData.designation) {
          designationUpdates++;
        }
      } else {
        unmatched.push({
          name: csvData.name,
          cnic: csvData.cnic,
          designation: csvData.designation
        });
      }
    }
    
    console.log('\n=== INVESTIGATION RESULTS ===');
    console.log(`CSV Records with CNIC: ${csvMatches}`);
    console.log(`Database Matches Found: ${dbMatches}`);
    console.log(`Unmatched CSV Records: ${unmatched.length}`);
    console.log(`Employees needing designation updates: ${designationUpdates}`);
    
    console.log('\n=== MATCHED RECORDS ===');
    matched.forEach(match => {
      console.log(`${match.employeeCode} | ${match.dbName} | ${match.department} | ${match.designation} | ${match.needsUpdate ? 'NEEDS UPDATE' : 'HAS DESIGNATION'}`);
    });
    
    console.log('\n=== UNMATCHED CSV RECORDS ===');
    unmatched.forEach(record => {
      console.log(`${record.name} | ${record.cnic} | ${record.designation}`);
    });
    
    // Check if any CNICs in CSV exist in database but with different formatting
    console.log('\n=== CHECKING CNIC FORMATTING ISSUES ===');
    const allDbCnics = employees
      .filter(emp => emp.nationalId)
      .map(emp => ({ 
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
        cnic: emp.nationalId,
        normalizedCnic: normalizeCNIC(emp.nationalId!)
      }));
    
    for (const unmatchedRecord of unmatched) {
      const normalizedCsvCnic = normalizeCNIC(unmatchedRecord.cnic);
      const possibleMatch = allDbCnics.find(dbRecord => 
        dbRecord.normalizedCnic === normalizedCsvCnic
      );
      
      if (possibleMatch) {
        console.log(`FORMATTING ISSUE: ${unmatchedRecord.name} (${unmatchedRecord.cnic}) matches ${possibleMatch.name} (${possibleMatch.cnic})`);
      }
    }
    
    // Summary of database employees with CNICs but no designations
    console.log('\n=== EMPLOYEES WITH CNIC BUT NO DESIGNATION ===');
    const needsDesignation = employees.filter(emp => 
      emp.nationalId && !emp.designation
    );
    
    console.log(`Found ${needsDesignation.length} employees with CNIC but no designation:`);
    needsDesignation.forEach(emp => {
      const normalizedDbCnic = normalizeCNIC(emp.nationalId!);
      const csvMatch = records.find(record => 
        record.CNIC && normalizeCNIC(record.CNIC) === normalizedDbCnic
      );
      
      console.log(`${emp.employeeCode} | ${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim() + 
        ` | ${emp.department} | ${emp.nationalId} | ${csvMatch ? 'CSV_MATCH: ' + csvMatch.Designation : 'NO_CSV_MATCH'}`);
    });
    
  } catch (error) {
    console.error('Error investigating LHE designations:', error);
  }
}

// Run the investigation
investigateLheDesignations();