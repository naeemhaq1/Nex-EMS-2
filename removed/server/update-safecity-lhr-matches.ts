import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Approved SafeCity-LHR matches (3 CNIC + 11 Name matches)
const approvedMatches = [
  // EXACT CNIC MATCHES
  { employeeCode: "10070505", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070556", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070511", designation: "Coordinator (Safe City O & M Infra)", subDepartment: "PMU" },
  
  // EXACT NAME MATCHES
  { employeeCode: "10070501", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070502", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070503", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070557", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070560", designation: "Technician", subDepartment: "OFC" },
  { employeeCode: "10070507", designation: "Helper", subDepartment: "PMU" },
  { employeeCode: "10070508", designation: "Helper", subDepartment: "PMU" },
  { employeeCode: "10070509", designation: "Office Boy", subDepartment: "PMU" },
  { employeeCode: "10070512", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070562", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070571", designation: "Helper", subDepartment: "OFC" }
];

async function updateSafecityLhrMatches() {
  console.log('🔄 Updating SafeCity-LHR matches...\n');
  
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
      
      // Update designation and sub-department
      await db.update(employeeRecords)
        .set({ 
          designation: match.designation,
          subDepartment: match.subDepartment
        })
        .where(eq(employeeRecords.id, emp.id));
      
      updateCount++;
      
      results.push({
        employeeCode: match.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        designation: match.designation,
        subDepartment: match.subDepartment
      });
      
      console.log(`   ✅ Updated: ${emp.firstName} ${emp.lastName}`);
      console.log(`      Designation: ${match.designation}`);
      console.log(`      Sub-Department: ${match.subDepartment}`);
      
    } catch (error) {
      console.log(`   ❌ Error updating ${match.employeeCode}: ${error}`);
      errorCount++;
    }
    console.log('');
  }
  
  console.log('\n📊 SafeCity-LHR Update Summary:');
  console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (results.length > 0) {
    console.log('\n✅ Updated employees:');
    
    // Group by sub-department
    const bySubDept = results.reduce((acc, emp) => {
      if (!acc[emp.subDepartment]) acc[emp.subDepartment] = [];
      acc[emp.subDepartment].push(emp);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(bySubDept).forEach(subDept => {
      console.log(`\n📍 ${subDept} (${bySubDept[subDept].length} employees):`);
      bySubDept[subDept].forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.name} (${emp.designation})`);
      });
    });
  }
  
  // Check updated LHE-Safecity coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withSubDepartments = finalEmployees.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const subDepartmentCoverage = Math.round((withSubDepartments / total) * 100);
  
  console.log('\n📊 Updated LHE-Safecity Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With sub-departments: ${withSubDepartments} (${subDepartmentCoverage}%)`);
  console.log(`   Additional improvement: +${updateCount} employees with designations and sub-departments`);
  
  console.log('\n🎯 SafeCity-LHR designation update completed!');
}

updateSafecityLhrMatches().catch(console.error);