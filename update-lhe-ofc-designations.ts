import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CSVEmployee {
  name: string;
  designation: string;
  dateOfJoining: string;
  dateOfEntitlement: string;
}

// CSV data from the uploaded file
const csvData: CSVEmployee[] = [
  { name: "Muhammad Moazzam Rana", designation: "Manager - OFC Network", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Adil Rasheed", designation: "Cable Technician", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Nauman Khan", designation: "Sub-Coordinator", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Khurram Abbas", designation: "Sub-Coordinator", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Sajjad", designation: "Driver - OFC", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Nauman Hameed", designation: "Trainee Engineer - OFC", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Muhammad Hassan", designation: "Support Officer", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Haroon Fazal", designation: "Technician - OFC", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Sohail Sarwar", designation: "Team Lead - OFC", dateOfJoining: "12-May-17", dateOfEntitlement: "1-Jun-18" },
  { name: "Umair Hussain", designation: "Team Lead - OFC", dateOfJoining: "15-May-25", dateOfEntitlement: "" },
  { name: "Shahid Ali", designation: "Technician - OFC", dateOfJoining: "1-Feb-17", dateOfEntitlement: "1-Feb-17" },
  { name: "Muhammad Umar Majeed", designation: "Network Engineer - OFC", dateOfJoining: "1-Feb-19", dateOfEntitlement: "1-Feb-20" },
  { name: "Muhammad Basit Ali", designation: "Helper - OFC", dateOfJoining: "23-Nov-20", dateOfEntitlement: "23-Nov-21" },
  { name: "Muhammad Salman Haris", designation: "Technician - OFC", dateOfJoining: "14-Dec-21", dateOfEntitlement: "14-Dec-22" },
  { name: "Fareed Ahmed", designation: "Driver - OFC", dateOfJoining: "1-Feb-22", dateOfEntitlement: "1-Feb-23" },
  { name: "Mazhar Ali", designation: "Helper - OFC", dateOfJoining: "1-Sep-22", dateOfEntitlement: "1-Sep-23" },
  { name: "Yasir Mehmood", designation: "Driver - OFC", dateOfJoining: "25-Aug-22", dateOfEntitlement: "1-Sep-23" },
  { name: "Muhammad Sultan Bin Qasim", designation: "Helper - OFC", dateOfJoining: "1-Jun-23", dateOfEntitlement: "" },
  { name: "Ijaz Ahmed", designation: "Technician - OFC", dateOfJoining: "25-Sep-22", dateOfEntitlement: "1-Oct-23" },
  { name: "Usama Haider", designation: "Technician - OFC", dateOfJoining: "24-May-23", dateOfEntitlement: "" },
  { name: "Rashid Ali", designation: "Helper - OFC", dateOfJoining: "15-Jan-24", dateOfEntitlement: "" },
  { name: "Babar Iqbal", designation: "Driver - OFC", dateOfJoining: "20-Oct-23", dateOfEntitlement: "" },
  { name: "Shahzad Ali", designation: "Helper - OFC", dateOfJoining: "27-Dec-23", dateOfEntitlement: "" },
  { name: "Muhammad Waseem", designation: "Helper - OFC", dateOfJoining: "15-Oct-23", dateOfEntitlement: "" },
  { name: "Danish Ali", designation: "Helper - OFC", dateOfJoining: "15-Apr-24", dateOfEntitlement: "" },
  { name: "Sheikh Muhammad Raheel Qaiser", designation: "Technician - OFC", dateOfJoining: "1-May-24", dateOfEntitlement: "" },
  { name: "Basharat Ali", designation: "Surveyor - OFC", dateOfJoining: "1-Aug-17", dateOfEntitlement: "1-Aug-18" },
  { name: "Muhammad Fahad", designation: "Helper - OFC", dateOfJoining: "25-Apr-24", dateOfEntitlement: "" },
  { name: "Adnan Masih", designation: "Technician - OFC", dateOfJoining: "1-May-24", dateOfEntitlement: "" },
  { name: "Muhammad Gul Zaib", designation: "Helper - OFC", dateOfJoining: "24-Jun-24", dateOfEntitlement: "" },
  { name: "Rubas Sajid", designation: "Helper - OFC", dateOfJoining: "1-Aug-24", dateOfEntitlement: "" },
  { name: "Shahzaib", designation: "Helper - OFC", dateOfJoining: "21-Feb-25", dateOfEntitlement: "" },
  { name: "Hamza", designation: "Driver - OFC", dateOfJoining: "15-Jun-25", dateOfEntitlement: "" },
  { name: "Phool Bilal Bashir", designation: "Driver - OFC", dateOfJoining: "1-Jun-25", dateOfEntitlement: "" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function extractFirstLastName(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.trim();
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  } else {
    // For names with more than 2 parts, first name is the first part, last name is the last part
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
  }
}

async function updateLHEOfcDesignations() {
  console.log('🔄 Starting LHE-OFC designation update...');
  
  try {
    // Get all LHE-OFC employees
    const lheOfcEmployees = await db.select().from(employeeRecords)
      .where(and(
        eq(employeeRecords.department, 'LHE-OFC'),
        eq(employeeRecords.isActive, true)
      ));

    console.log(`📋 Found ${lheOfcEmployees.length} LHE-OFC employees in database`);
    console.log(`📋 Found ${csvData.length} employees in CSV file`);

    let matchCount = 0;
    let updateCount = 0;
    const matchedEmployees: any[] = [];
    const unmatchedCsvEmployees: string[] = [];
    const unmatchedDbEmployees: any[] = [];

    // Process each CSV employee
    for (const csvEmployee of csvData) {
      const { firstName: csvFirstName, lastName: csvLastName } = extractFirstLastName(csvEmployee.name);
      const csvNormalizedFirst = normalizeNameForMatching(csvFirstName);
      const csvNormalizedLast = normalizeNameForMatching(csvLastName);

      // Try to find matching employee in database
      let matchedEmployee = null;

      // First try: exact first and last name match
      matchedEmployee = lheOfcEmployees.find(emp => {
        const dbNormalizedFirst = normalizeNameForMatching(emp.firstName || '');
        const dbNormalizedLast = normalizeNameForMatching(emp.lastName || '');
        return dbNormalizedFirst === csvNormalizedFirst && dbNormalizedLast === csvNormalizedLast;
      });

      // Second try: if no exact match, try partial matching for single names
      if (!matchedEmployee && csvLastName === '') {
        matchedEmployee = lheOfcEmployees.find(emp => {
          const dbNormalizedFirst = normalizeNameForMatching(emp.firstName || '');
          const dbNormalizedLast = normalizeNameForMatching(emp.lastName || '');
          return dbNormalizedFirst === csvNormalizedFirst || dbNormalizedLast === csvNormalizedFirst;
        });
      }

      if (matchedEmployee) {
        matchCount++;
        matchedEmployees.push({
          csvName: csvEmployee.name,
          dbName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
          employeeCode: matchedEmployee.employeeCode,
          designation: csvEmployee.designation,
          currentDesignation: matchedEmployee.designation
        });

        // Update designation if different or empty
        if (!matchedEmployee.designation || matchedEmployee.designation !== csvEmployee.designation) {
          await db.update(employeeRecords)
            .set({ designation: csvEmployee.designation })
            .where(eq(employeeRecords.id, matchedEmployee.id));
          updateCount++;
          console.log(`✅ Updated ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName}) -> ${csvEmployee.designation}`);
        } else {
          console.log(`ℹ️  ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName}) already has correct designation`);
        }
      } else {
        unmatchedCsvEmployees.push(csvEmployee.name);
        console.log(`❌ No match found for CSV employee: ${csvEmployee.name}`);
      }
    }

    // Find unmatched database employees
    const matchedDbIds = matchedEmployees.map(emp => {
      const dbEmp = lheOfcEmployees.find(e => `${e.firstName} ${e.lastName}` === emp.dbName);
      return dbEmp?.id;
    });

    unmatchedDbEmployees.push(...lheOfcEmployees.filter(emp => !matchedDbIds.includes(emp.id)));

    // Summary
    console.log('\n📊 LHE-OFC Designation Update Summary:');
    console.log(`✅ Matched employees: ${matchCount}/${csvData.length}`);
    console.log(`🔄 Updated designations: ${updateCount}`);
    console.log(`❌ Unmatched CSV employees: ${unmatchedCsvEmployees.length}`);
    console.log(`❌ Unmatched DB employees: ${unmatchedDbEmployees.length}`);

    if (unmatchedCsvEmployees.length > 0) {
      console.log('\n🔍 Unmatched CSV employees:');
      unmatchedCsvEmployees.forEach(name => console.log(`  - ${name}`));
    }

    if (unmatchedDbEmployees.length > 0) {
      console.log('\n🔍 Unmatched DB employees:');
      unmatchedDbEmployees.forEach(emp => console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName}`));
    }

    console.log('\n🎯 Successfully completed LHE-OFC designation update!');
    
  } catch (error) {
    console.error('❌ Error updating LHE-OFC designations:', error);
    throw error;
  }
}

// Run the update
updateLHEOfcDesignations().catch(console.error);