import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Direct mappings based on database analysis
const cnicMappings = [
  { csvCnic: "33100-3037778-5", dbCnic: "3310003077785", csvName: "Mr. Ali Raza Shah", designation: "Accounts Officer" },
  { csvCnic: "33100-5477599-1", dbCnic: "3310954775991", csvName: "Mr. Safdar Ali Shah", designation: "Rigger" },
  { csvCnic: "33102-5103335-9", dbCnic: "3301251033359", csvName: "Mr. Shehryar Shakir", designation: "Tech. Support Engineer" },
  { csvCnic: "33100-5018814-1", dbCnic: "3520196693973", csvName: "Mr. Hafiz Muhammad Shoaib", designation: "Tech. Support Engineer" },
  { csvCnic: "33102-8479185-5", dbCnic: "3110284791855", csvName: "Affaq Tahir", designation: "Tech. Support Engineer" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '').substring(0, 13);
}

async function matchFsdFinalCnic() {
  console.log('🔍 Final FSD CNIC matching with direct mappings...\n');
  
  let matchCount = 0;
  let updateCount = 0;
  const results: any[] = [];
  
  for (const mapping of cnicMappings) {
    const csvCnicNormalized = normalizeCNIC(mapping.csvCnic);
    
    console.log(`🔍 Checking: "${mapping.csvName}"`);
    console.log(`   CSV CNIC: ${mapping.csvCnic} -> normalized: ${csvCnicNormalized}`);
    console.log(`   DB CNIC: ${mapping.dbCnic}`);
    
    // Check if normalized CNICs match
    if (csvCnicNormalized === mapping.dbCnic) {
      console.log(`   ✅ CNIC MATCH! Looking for employee...`);
      
      // Find employee by exact CNIC match
      const employee = await db.select().from(employeeRecords)
        .where(eq(employeeRecords.nationalId, mapping.dbCnic))
        .limit(1);
      
      if (employee.length > 0) {
        const emp = employee[0];
        matchCount++;
        
        console.log(`   ✅ EMPLOYEE FOUND: ${emp.employeeCode} (${emp.firstName} ${emp.lastName})`);
        
        // Update designation
        await db.update(employeeRecords)
          .set({ designation: mapping.designation })
          .where(eq(employeeRecords.id, emp.id));
        
        updateCount++;
        console.log(`   🔄 Updated designation: ${mapping.designation}`);
        
        results.push({
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          csvName: mapping.csvName,
          designation: mapping.designation,
          cnic: mapping.csvCnic
        });
      } else {
        console.log(`   ❌ No employee found with CNIC: ${mapping.dbCnic}`);
      }
    } else {
      console.log(`   ❌ CNIC mismatch: ${csvCnicNormalized} != ${mapping.dbCnic}`);
    }
    console.log('');
  }
  
  console.log('\n📊 Final FSD CNIC Matching Summary:');
  console.log(`✅ Matches found: ${matchCount}/${cnicMappings.length}`);
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
  
  console.log('\n📊 Final FSD Coverage:');
  console.log(`   Total: ${totalFsd} employees`);
  console.log(`   With designations: ${withDesignations}`);
  console.log(`   Coverage: ${coverage}%`);
  
  // Show remaining employees without designations
  const remaining = finalFsdEmployees.filter(emp => !emp.designation || emp.designation === '');
  if (remaining.length > 0) {
    console.log('\n⚠️  Remaining employees without designations:');
    remaining.forEach(emp => {
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (CNIC: ${emp.nationalId || 'None'})`);
    });
  }
  
  console.log('\n🎯 FSD final CNIC matching completed!');
}

matchFsdFinalCnic().catch(console.error);