import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Direct name mappings based on database analysis
const nameMappings = [
  { csvName: "Mr. Ali Raza Shah", dbName: "Ali Raza", employeeCode: "10009300", designation: "Accounts Officer" },
  { csvName: "Mr. Safdar Ali Shah", dbName: "Safdar Ali", employeeCode: "10090584", designation: "Rigger" },
  { csvName: "Mr. Shehryar Shakir", dbName: "Shehryar Shakir", employeeCode: "10090631", designation: "Tech. Support Engineer" },
  { csvName: "Mr. Hafiz Muhammad Shoaib", dbName: "Hafiz Muhammad uhammad Shoaib", employeeCode: "10090643", designation: "Tech. Support Engineer" },
  { csvName: "Affaq Tahir", dbName: "Affaq Tahir", employeeCode: "10090688", designation: "Tech. Support Engineer" },
  { csvName: "Mr. Sheroz", dbName: "Sheroz haukat", employeeCode: "10090690", designation: "Sweeper- Part Time" }
];

async function matchFsdByName() {
  console.log('🔍 Final FSD name-based matching...\n');
  
  let matchCount = 0;
  let updateCount = 0;
  const results: any[] = [];
  
  for (const mapping of nameMappings) {
    console.log(`🔍 Updating: "${mapping.csvName}" -> "${mapping.dbName}"`);
    console.log(`   Employee Code: ${mapping.employeeCode}`);
    console.log(`   Designation: ${mapping.designation}`);
    
    try {
      // Find employee by employee code
      const employee = await db.select().from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, mapping.employeeCode))
        .limit(1);
      
      if (employee.length > 0) {
        const emp = employee[0];
        matchCount++;
        
        // Update designation
        await db.update(employeeRecords)
          .set({ designation: mapping.designation })
          .where(eq(employeeRecords.id, emp.id));
        
        updateCount++;
        console.log(`   ✅ Updated successfully`);
        
        results.push({
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          csvName: mapping.csvName,
          designation: mapping.designation
        });
      } else {
        console.log(`   ❌ Employee not found: ${mapping.employeeCode}`);
      }
    } catch (error) {
      console.log(`   ❌ Error updating: ${error}`);
    }
    console.log('');
  }
  
  console.log('\n📊 Final FSD Name-based Matching Summary:');
  console.log(`✅ Matches processed: ${matchCount}/${nameMappings.length}`);
  console.log(`🔄 Updated designations: ${updateCount}`);
  
  if (results.length > 0) {
    console.log('\n✅ Successfully updated:');
    results.forEach(result => {
      console.log(`  - ${result.employeeCode}: "${result.name}" -> ${result.designation}`);
    });
  }
  
  // Check final FSD coverage
  const finalFsdEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'FSD'));
  
  const totalFsd = finalFsdEmployees.length;
  const withDesignations = finalFsdEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const coverage = Math.round((withDesignations / totalFsd) * 100);
  
  console.log('\n📊 FINAL FSD COVERAGE:');
  console.log(`   Total: ${totalFsd} employees`);
  console.log(`   With designations: ${withDesignations}`);
  console.log(`   Coverage: ${coverage}%`);
  
  // Show remaining employees without designations
  const remaining = finalFsdEmployees.filter(emp => !emp.designation || emp.designation === '');
  if (remaining.length > 0) {
    console.log('\n⚠️  Remaining employees without designations:');
    remaining.forEach(emp => {
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName}`);
    });
  } else {
    console.log('\n🎉 ALL FSD EMPLOYEES NOW HAVE DESIGNATIONS!');
  }
  
  console.log('\n🎯 FSD designation matching completed!');
}

matchFsdByName().catch(console.error);