import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Approved matches from analysis (30 CNIC + 12 Name matches)
const approvedMatches = [
  // EXACT CNIC MATCHES
  { employeeCode: "10070572", designation: "Senior Team Lead - PSCA - LHR", subDepartment: "PMU" },
  { employeeCode: "10070513", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070515", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070516", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070519", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070520", designation: "Electrician", subDepartment: "CAMERA" },
  { employeeCode: "10070522", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070525", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070526", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070527", designation: "Helper", subDepartment: "TRAFFIC" },
  { employeeCode: "10070529", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070530", designation: "Team Lead", subDepartment: "TRAFFIC" },
  { employeeCode: "10070531", designation: "Helper", subDepartment: "TRAFFIC" },
  { employeeCode: "10070532", designation: "Helper", subDepartment: "TRAFFIC" },
  { employeeCode: "10070534", designation: "Electrician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070535", designation: "Electrician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070536", designation: "Electrician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070538", designation: "Electrician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070539", designation: "Electrician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070540", designation: "Helper", subDepartment: "TRAFFIC" },
  { employeeCode: "10070542", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070544", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070545", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070548", designation: "Store Executive", subDepartment: "PMU" },
  { employeeCode: "10070564", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070565", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070566", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070567", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070569", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070570", designation: "Supervisor", subDepartment: "OFC" },
  
  // EXACT NAME MATCHES
  { employeeCode: "10070514", designation: "Team Lead", subDepartment: "CAMERA" },
  { employeeCode: "10070517", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070518", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070521", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070524", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070528", designation: "Helper", subDepartment: "CAMERA" },
  { employeeCode: "10070533", designation: "Helper", subDepartment: "TRAFFIC" },
  { employeeCode: "10070541", designation: "Technician", subDepartment: "OFC" },
  { employeeCode: "10070543", designation: "Technician", subDepartment: "TRAFFIC" },
  { employeeCode: "10070546", designation: "Helper", subDepartment: "LESCO" },
  { employeeCode: "10070568", designation: "Helper", subDepartment: "OFC" },
  { employeeCode: "10070506", designation: "Helper", subDepartment: "OFC" }
];

async function updateApprovedLheSafecityMatches() {
  console.log('🔄 Updating approved LHE-Safecity matches...\n');
  
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
  
  console.log('\n📊 Update Summary:');
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
  
  // Check final LHE-Safecity coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withSubDepartments = finalEmployees.filter(emp => emp.subDepartment && emp.subDepartment !== '').length;
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const subDepartmentCoverage = Math.round((withSubDepartments / total) * 100);
  
  console.log('\n📊 Final LHE-Safecity Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With sub-departments: ${withSubDepartments} (${subDepartmentCoverage}%)`);
  console.log(`   Improvement: +${updateCount} employees with designations and sub-departments`);
  
  // Show sub-department distribution
  const subDeptCounts = finalEmployees.reduce((acc, emp) => {
    const subDept = emp.subDepartment || 'No Sub-Department';
    acc[subDept] = (acc[subDept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📈 Sub-Department Distribution:');
  Object.entries(subDeptCounts).forEach(([subDept, count]) => {
    console.log(`   ${subDept}: ${count} employees`);
  });
  
  console.log('\n🎯 LHE-Safecity designation and sub-department update completed!');
}

updateApprovedLheSafecityMatches().catch(console.error);