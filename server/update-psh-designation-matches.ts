import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Approved PSH matches (11 CNIC + 1 Name match)
const approvedMatches = [
  // EXACT CNIC MATCHES
  { employeeCode: "10090519", designation: "Office Incharge-Abbotabad" },
  { employeeCode: "10090369", designation: "Manager Technical" },
  { employeeCode: "10090319", designation: "Office Boy" },
  { employeeCode: "10090317", designation: "Sales Executive-Haripur Part Time" },
  { employeeCode: "10090552", designation: "C S Officer" },
  { employeeCode: "10090628", designation: "C S Officer- Peshawar" },
  { employeeCode: "10090313", designation: "Security Guard" },
  { employeeCode: "10090625", designation: "C S Officer- Peshawar" },
  { employeeCode: "10090565", designation: "Key Accounts Manager PSH" },
  { employeeCode: "10090626", designation: "C S Officer- Peshawar" },
  { employeeCode: "10090627", designation: "Office Boy" },
  
  // EXACT NAME MATCHES  
  { employeeCode: "10090547", designation: "C S Officer- Peshawar" }
];

async function updatePshDesignationMatches() {
  console.log('🔄 Updating PSH designation matches...\n');
  
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
      
      // Update designation
      await db.update(employeeRecords)
        .set({ designation: match.designation })
        .where(eq(employeeRecords.id, emp.id));
      
      updateCount++;
      
      results.push({
        employeeCode: match.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        designation: match.designation
      });
      
      console.log(`   ✅ Updated: ${emp.firstName} ${emp.lastName}`);
      console.log(`      Designation: ${match.designation}`);
      
    } catch (error) {
      console.log(`   ❌ Error updating ${match.employeeCode}: ${error}`);
      errorCount++;
    }
    console.log('');
  }
  
  console.log('\n📊 PSH Update Summary:');
  console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (results.length > 0) {
    console.log('\n✅ Updated PSH employees:');
    
    // Group by designation type
    const byDesignation = results.reduce((acc, emp) => {
      const type = emp.designation.includes('Manager') ? 'Management' :
                   emp.designation.includes('C S Officer') ? 'Customer Service' :
                   emp.designation.includes('Office') ? 'Office Support' :
                   'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(emp);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.keys(byDesignation).forEach(type => {
      console.log(`\n📍 ${type} (${byDesignation[type].length} employees):`);
      byDesignation[type].forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.name} (${emp.designation})`);
      });
    });
  }
  
  // Check updated PSH coverage
  const finalEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'PSH'));
  
  const total = finalEmployees.length;
  const withDesignations = finalEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const designationCoverage = Math.round((withDesignations / total) * 100);
  
  console.log('\n📊 Updated PSH Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   Improvement: +${updateCount} employees with designations`);
  console.log(`   Coverage improvement: from 20% to ${designationCoverage}%`);
  
  // Show remaining employees without designations
  const remainingWithout = finalEmployees.filter(emp => !emp.designation || emp.designation === '');
  if (remainingWithout.length > 0) {
    console.log('\n📝 Remaining employees without designations:');
    remainingWithout.forEach(emp => {
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
    });
  }
  
  console.log('\n🎯 PSH designation update completed!');
}

updatePshDesignationMatches().catch(console.error);