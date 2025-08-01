import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Final approved matches from comprehensive analysis
const finalMatches = [
  { employeeCode: '10090669', designation: 'Driver - OFC', csvName: 'Babar Iqbal', confidence: '66%' },
  { employeeCode: '10090374', designation: 'Sub-Coordinator', csvName: 'Nauman Khan', confidence: '64%' }
];

async function updateFinalMatches() {
  console.log('🔄 Updating final LHE-OFC matches (with excluded prefixes)...\n');
  
  let updateCount = 0;
  
  for (const match of finalMatches) {
    try {
      // Get current employee data
      const employee = await db.select().from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, match.employeeCode))
        .limit(1);
      
      if (employee.length === 0) {
        console.log(`❌ Employee ${match.employeeCode} not found`);
        continue;
      }
      
      const currentEmployee = employee[0];
      
      // Update designation
      await db.update(employeeRecords)
        .set({ designation: match.designation })
        .where(eq(employeeRecords.employeeCode, match.employeeCode));
      
      console.log(`✅ Updated ${match.employeeCode} (${currentEmployee.firstName} ${currentEmployee.lastName})`);
      console.log(`   CSV Match: "${match.csvName}" -> ${match.designation} (${match.confidence} confidence)`);
      updateCount++;
      
    } catch (error) {
      console.error(`❌ Error updating ${match.employeeCode}:`, error);
    }
  }
  
  console.log(`\n📊 Summary: Updated ${updateCount}/${finalMatches.length} employees`);
  
  // Check final coverage
  console.log('\n📋 Checking final LHE-OFC coverage...');
  const coverage = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-OFC'));
  
  const totalEmployees = coverage.length;
  const withDesignations = coverage.filter(emp => emp.designation && emp.designation !== '').length;
  const percentage = Math.round((withDesignations / totalEmployees) * 100);
  
  console.log(`📊 Final Coverage: ${withDesignations}/${totalEmployees} employees (${percentage}%)`);
  
  if (withDesignations === totalEmployees) {
    console.log('🎉 COMPLETE! All LHE-OFC employees now have designations!');
  } else {
    const remaining = coverage.filter(emp => !emp.designation || emp.designation === '');
    console.log(`⚠️  Remaining employees without designations: ${remaining.length}`);
    remaining.forEach(emp => {
      console.log(`   ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}"`);
    });
  }
}

updateFinalMatches().catch(console.error);