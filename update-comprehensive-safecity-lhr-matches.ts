import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Approved comprehensive SafeCity-LHR matches (20 CNIC + 29 Name matches)
const approvedMatches = [
  // EXACT CNIC MATCHES
  { employeeCode: "10070505", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070556", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-07-01" },
  { employeeCode: "10070507", designation: "Helper", subDepartment: "PMU", joiningDate: "2024-09-01" },
  { employeeCode: "10070510", designation: "Supervisor", subDepartment: "LESCO", joiningDate: "2024-08-01" },
  { employeeCode: "10070511", designation: "Coordinator (Safe City O & M Infra)", subDepartment: "PMU", joiningDate: "2024-09-01" },
  { employeeCode: "10070562", designation: "Helper", subDepartment: "OFC", joiningDate: "2025-01-01" },
  { employeeCode: "10070513", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070515", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070522", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070528", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070534", designation: "Electrician", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070536", designation: "Electrician", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070542", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-07-01" },
  { employeeCode: "10070543", designation: "Technician", subDepartment: "TRAFFIC", joiningDate: "2024-09-01" },
  { employeeCode: "10070544", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-08-19" },
  { employeeCode: "10070564", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-11-01" },
  { employeeCode: "10070565", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-11-01" },
  { employeeCode: "10070569", designation: "Helper", subDepartment: "OFC", joiningDate: "2025-02-08" },
  { employeeCode: "10070570", designation: "Supervisor", subDepartment: "OFC", joiningDate: "2024-08-24" },
  { employeeCode: "10070506", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-07-01" },
  
  // EXACT NAME MATCHES
  { employeeCode: "10070501", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070502", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070503", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070504", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-06-01" },
  { employeeCode: "10070557", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-07-01" },
  { employeeCode: "10070560", designation: "Technician", subDepartment: "OFC", joiningDate: "2024-07-01" },
  { employeeCode: "10070508", designation: "Helper", subDepartment: "PMU", joiningDate: "2024-08-20" },
  { employeeCode: "10070509", designation: "Office Boy", subDepartment: "PMU", joiningDate: "2024-08-01" },
  { employeeCode: "10070512", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-08-19" },
  { employeeCode: "10070563", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-09-05" },
  { employeeCode: "10070571", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-12-17" },
  { employeeCode: "10070572", designation: "Senior Team Lead - PSCA - LHR", subDepartment: "PMU", joiningDate: "2025-03-17" },
  { employeeCode: "10070514", designation: "Team Lead", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070516", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070518", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070521", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070525", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070526", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2024-07-01" },
  { employeeCode: "10070527", designation: "Helper", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070530", designation: "Team Lead", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070531", designation: "Helper", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070539", designation: "Electrician", subDepartment: "TRAFFIC", joiningDate: "2024-07-01" },
  { employeeCode: "10070541", designation: "Technician", subDepartment: "OFC", joiningDate: "2024-07-01" },
  { employeeCode: "10070546", designation: "Helper", subDepartment: "LESCO", joiningDate: "2024-08-16" },
  { employeeCode: "10070566", designation: "Helper", subDepartment: "OFC", joiningDate: "2024-12-06" },
  { employeeCode: "10070567", designation: "Helper", subDepartment: "CAMERA", joiningDate: "2025-01-01" },
  { employeeCode: "10070547", designation: "Technician-LT", subDepartment: "LESCO", joiningDate: "2024-08-16" }
];

// Note: Some matches had conflicts between CNIC and Name match data - using the more complete records
const duplicateHandling = [
  // 10070542 appears in both CNIC and Name matches - using OFC assignment from CNIC match
  // 10070569 appears in both CNIC and Name matches - using OFC assignment from CNIC match  
];

function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function updateComprehensiveSafecityLhrMatches() {
  console.log('🔄 Updating comprehensive SafeCity-LHR matches...\n');
  
  let updateCount = 0;
  let errorCount = 0;
  const results: any[] = [];
  
  for (const match of approvedMatches) {
    try {
      console.log(`🔄 Updating ${match.employeeCode}...`);
      
      // Get current employee data
      const employee = await db.select().from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, match.employeeCode))
        .limit(1);
      
      if (employee.length === 0) {
        console.log(`   ❌ Employee not found: ${match.employeeCode}`);
        errorCount++;
        continue;
      }
      
      const emp = employee[0];
      
      // Parse joining date
      const joiningDate = parseDate(match.joiningDate);
      
      // Update designation, sub-department, and joining date
      await db.update(employeeRecords)
        .set({ 
          designation: match.designation,
          subDepartment: match.subDepartment,
          joiningDate: joiningDate
        })
        .where(eq(employeeRecords.id, emp.id));
      
      updateCount++;
      
      results.push({
        employeeCode: match.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        designation: match.designation,
        subDepartment: match.subDepartment,
        joiningDate: match.joiningDate
      });
      
      console.log(`   ✅ Updated: ${emp.firstName} ${emp.lastName}`);
      console.log(`      Designation: ${match.designation}`);
      console.log(`      Sub-Department: ${match.subDepartment}`);
      console.log(`      Joining Date: ${match.joiningDate}`);
      
    } catch (error) {
      console.log(`   ❌ Error updating ${match.employeeCode}: ${error}`);
      errorCount++;
    }
    console.log('');
  }
  
  console.log('\n📊 Comprehensive SafeCity-LHR Update Summary:');
  console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (results.length > 0) {
    console.log('\n✅ Updated employees by sub-department:');
    
    // Group by sub-department
    const bySubDept = results.reduce((acc, emp) => {
      if (!acc[emp.subDepartment]) acc[emp.subDepartment] = [];
      acc[emp.subDepartment].push(emp);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(bySubDept).sort().forEach(subDept => {
      console.log(`\n📍 ${subDept} (${bySubDept[subDept].length} employees):`);
      
      // Group by designation within sub-department
      const byDesignation = bySubDept[subDept].reduce((acc, emp) => {
        if (!acc[emp.designation]) acc[emp.designation] = [];
        acc[emp.designation].push(emp);
        return acc;
      }, {} as Record<string, any[]>);
      
      Object.keys(byDesignation).sort().forEach(designation => {
        console.log(`  ${designation} (${byDesignation[designation].length}):`);
        byDesignation[designation].forEach(emp => {
          console.log(`    - ${emp.employeeCode}: ${emp.name}`);
        });
      });
    });
  }
  
  // Check updated LHE-Safecity coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withSubDepartments = finalEmployees.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const withJoiningDates = finalEmployees.filter(emp => emp.joiningDate).length;
  
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const subDepartmentCoverage = Math.round((withSubDepartments / total) * 100);
  const joiningDateCoverage = Math.round((withJoiningDates / total) * 100);
  
  console.log('\n📊 Updated LHE-Safecity Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With sub-departments: ${withSubDepartments} (${subDepartmentCoverage}%)`);
  console.log(`   With joining dates: ${withJoiningDates} (${joiningDateCoverage}%)`);
  console.log(`   Comprehensive data improvement: +${updateCount} employees`);
  
  // Show remaining employees without complete data
  const remainingIncomplete = finalEmployees.filter(emp => 
    !emp.designation || emp.designation === '' || 
    !emp.subDepartment || emp.subDepartment === '' ||
    !emp.joiningDate
  );
  
  if (remainingIncomplete.length > 0) {
    console.log('\n📝 Remaining employees with incomplete data:');
    remainingIncomplete.forEach(emp => {
      const missing = [];
      if (!emp.designation || emp.designation === '') missing.push('designation');
      if (!emp.subDepartment || emp.subDepartment === '') missing.push('sub-department');
      if (!emp.joiningDate) missing.push('joining date');
      
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
      console.log(`    Missing: ${missing.join(', ')}`);
    });
  }
  
  console.log('\n🎯 Comprehensive SafeCity-LHR update completed!');
  console.log('📈 LHE-Safecity department now has comprehensive designation, sub-department, and joining date coverage!');
}

updateComprehensiveSafecityLhrMatches().catch(console.error);