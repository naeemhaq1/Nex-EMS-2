import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// LHE-Safecity data from the image with designations and sub-departments
const lheSafecityData = [
  { name: "Fahad Manan", designation: "Senior Team Lead - PSCA - LHR", subDepartment: "PMU", cnic: "37406-6461178-9" },
  { name: "Muhammad Tauqeer", designation: "Helper", subDepartment: "OFC", cnic: "35201-9263240-9" },
  { name: "M. Fayyaz", designation: "Team Lead", subDepartment: "CAMERA", cnic: "35202-3504400-3" },
  { name: "Adeel Ahmed", designation: "Helper", subDepartment: "CAMERA", cnic: "41204-9839414-1" },
  { name: "M. Luqman", designation: "Helper", subDepartment: "CAMERA", cnic: "36104-4006319-3" },
  { name: "Hamza Naveed", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-7551205-5" },
  { name: "Izhar Mahmood", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-9734748-9" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "36502-3047776-9" },
  { name: "Zeshan Ali", designation: "Electrician", subDepartment: "CAMERA", cnic: "34503-0357599-3" },
  { name: "Waqar Ahmad", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-7646360-3" },
  { name: "Syed Qamar Abbas Naqvi", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-5772601-5" },
  { name: "Shahraz Shbir", designation: "Helper", subDepartment: "CAMERA", cnic: "38201-6587461-9" },
  { name: "M. Waqar", designation: "Helper", subDepartment: "CAMERA", cnic: "34602-1419096-1" },
  { name: "Abdul Rehman.", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-4754953-5" },
  { name: "Mujahid Ali", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6788167-5" },
  { name: "M. Aqeel Arshad", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-6495617-9" },
  { name: "Adnan Shahzad", designation: "Helper", subDepartment: "CAMERA", cnic: "32303-6204818-9" },
  { name: "Adil Jahangir", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6477899-7" },
  { name: "Muhammad Shakeel", designation: "Team Lead", subDepartment: "TRAFFIC", cnic: "33105-5103633-5" },
  { name: "Sunil Sharif", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-6216492-1" },
  { name: "Malik Muhammad Rizwan", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-4266038-9" },
  { name: "Muhammad Ijaz", designation: "Helper", subDepartment: "TRAFFIC", cnic: "38401-4508525-1" },
  { name: "Zubair Farooq", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35202-4201563-7" },
  { name: "Fayaz Farhat", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-9983029-5" },
  { name: "Maqsood ur Rehman", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-1127335-5" },
  { name: "Muhammad Zohaib", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "31102-9880475-1" },
  { name: "Yasir Ali", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35104-0385365-7" },
  { name: "Khurram Shahzad", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-0760728-9" },
  { name: "Zain Ul Abidin", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-4069179-3" },
  { name: "Zahid Iqbal", designation: "Technician", subDepartment: "OFC", cnic: "34301-0356941-7" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "OFC", cnic: "35201-1176740-1" },
  { name: "Muhammad Ashfaq", designation: "Technician", subDepartment: "TRAFFIC", cnic: "35201-5378663-3" },
  { name: "Mubashir", designation: "Helper", subDepartment: "CAMERA", cnic: "36103-6946022-5" },
  { name: "Azeem", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-8813250-9" },
  { name: "Muhammad Shahbaz", designation: "Helper", subDepartment: "LESCO", cnic: "35501-0286201-3" },
  { name: "SYED FARRUKH IQBAL", designation: "Store Executive", subDepartment: "PMU", cnic: "35202-6260713-9" },
  { name: "Abdullah", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-0542858-1" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "33202-1474976-9" },
  { name: "Muhammad Nisar", designation: "Helper", subDepartment: "OFC", cnic: "35201-8853422-9" },
  { name: "Muhammad Adeeb Masood", designation: "Helper", subDepartment: "CAMERA", cnic: "37403-7252988-5" },
  { name: "Hanan Azhar", designation: "Helper", subDepartment: "OFC", cnic: "33202-7363863-3" },
  { name: "Zeeshan Ali", designation: "Helper", subDepartment: "OFC", cnic: "35201-6114004-5" },
  { name: "Umer Daraz", designation: "Supervisor", subDepartment: "OFC", cnic: "36102-6292379-3" },
  { name: "Muhammad Ajmal", designation: "Helper", subDepartment: "OFC", cnic: "38401-1814000-9" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Syed', 'Muhammad', 'Mohammad', 'Raja', 'Sheikh'];
  let normalized = name;
  
  prefixes.forEach(prefix => {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    normalized = normalized.replace(regex, '');
  });
  
  return normalized
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function populateLheSafecityDesignations() {
  console.log('🔍 Populating LHE-Safecity designations and sub-departments...\n');
  
  // Get all LHE-Safecity employees
  const lheSafecityEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  console.log(`📋 Found ${lheSafecityEmployees.length} LHE-Safecity employees in database`);
  console.log(`📋 Found ${lheSafecityData.length} employees in CSV data`);
  
  let cnicMatches = 0;
  let nameMatches = 0;
  let updateCount = 0;
  const results: any[] = [];
  const unmatchedCsv: string[] = [];
  const unmatchedDb: any[] = [];
  
  // First pass: CNIC matching
  for (const csvEmployee of lheSafecityData) {
    if (!csvEmployee.cnic) continue;
    
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    
    const matchedEmployee = lheSafecityEmployees.find(emp => {
      const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
      return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
    });
    
    if (matchedEmployee) {
      cnicMatches++;
      
      // Update designation and sub-department
      await db.update(employeeRecords)
        .set({ 
          designation: csvEmployee.designation,
          subDepartment: csvEmployee.subDepartment
        })
        .where(eq(employeeRecords.id, matchedEmployee.id));
      
      updateCount++;
      
      results.push({
        matchType: 'CNIC',
        employeeCode: matchedEmployee.employeeCode,
        name: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic
      });
      
      console.log(`✅ CNIC MATCH: ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
      console.log(`   Designation: ${csvEmployee.designation}`);
      console.log(`   Sub-Department: ${csvEmployee.subDepartment}`);
      console.log(`   CNIC: ${csvEmployee.cnic}`);
      console.log('');
    }
  }
  
  // Second pass: Name matching for remaining employees
  const updatedEmployeeIds = results.map(r => {
    const emp = lheSafecityEmployees.find(e => e.employeeCode === r.employeeCode);
    return emp?.id;
  });
  
  const remainingEmployees = lheSafecityEmployees.filter(emp => !updatedEmployeeIds.includes(emp.id));
  const remainingCsvData = lheSafecityData.filter(csvEmp => {
    const csvCnicNormalized = normalizeCNIC(csvEmp.cnic);
    return !results.some(r => normalizeCNIC(r.cnic) === csvCnicNormalized);
  });
  
  for (const csvEmployee of remainingCsvData) {
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    const matchedEmployee = remainingEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (matchedEmployee) {
      nameMatches++;
      
      // Update designation and sub-department
      await db.update(employeeRecords)
        .set({ 
          designation: csvEmployee.designation,
          subDepartment: csvEmployee.subDepartment
        })
        .where(eq(employeeRecords.id, matchedEmployee.id));
      
      updateCount++;
      
      results.push({
        matchType: 'NAME',
        employeeCode: matchedEmployee.employeeCode,
        name: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic || 'N/A'
      });
      
      console.log(`✅ NAME MATCH: ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
      console.log(`   CSV Name: ${csvEmployee.name}`);
      console.log(`   Designation: ${csvEmployee.designation}`);
      console.log(`   Sub-Department: ${csvEmployee.subDepartment}`);
      console.log('');
    } else {
      unmatchedCsv.push(csvEmployee.name);
    }
  }
  
  // Find unmatched database employees
  const allMatchedIds = results.map(r => {
    const emp = lheSafecityEmployees.find(e => e.employeeCode === r.employeeCode);
    return emp?.id;
  });
  
  unmatchedDb.push(...lheSafecityEmployees.filter(emp => !allMatchedIds.includes(emp.id)));
  
  console.log('\n📊 LHE-Safecity Designation Population Summary:');
  console.log(`✅ CNIC matches: ${cnicMatches}`);
  console.log(`✅ Name matches: ${nameMatches}`);
  console.log(`✅ Total matches: ${results.length}`);
  console.log(`🔄 Updated records: ${updateCount}`);
  console.log(`❌ Unmatched CSV: ${unmatchedCsv.length}`);
  console.log(`❌ Unmatched DB: ${unmatchedDb.length}`);
  
  if (results.length > 0) {
    console.log('\n✅ Successfully updated:');
    results.forEach(result => {
      console.log(`  - ${result.employeeCode}: "${result.name}" (${result.matchType})`);
      console.log(`    ${result.designation} | ${result.subDepartment}`);
    });
  }
  
  if (unmatchedCsv.length > 0) {
    console.log('\n❌ Unmatched CSV employees:');
    unmatchedCsv.forEach(name => console.log(`  - ${name}`));
  }
  
  if (unmatchedDb.length > 0) {
    console.log('\n❌ Unmatched DB employees:');
    unmatchedDb.forEach(emp => {
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
    });
  }
  
  // Check final LHE-Safecity coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withSubDepartments = finalEmployees.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const subDepartmentCoverage = Math.round((withSubDepartments / total) * 100);
  
  console.log('\n📊 Final LHE-Safecity Coverage:');
  console.log(`   Total: ${total} employees`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With sub-departments: ${withSubDepartments} (${subDepartmentCoverage}%)`);
  
  console.log('\n🎯 LHE-Safecity designation and sub-department population completed!');
}

populateLheSafecityDesignations().catch(console.error);