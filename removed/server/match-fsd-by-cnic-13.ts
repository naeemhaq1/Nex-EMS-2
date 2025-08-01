import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Unmatched CSV employees from previous run
const unmatchedCsvData = [
  { name: "Mr. Ali Raza Shah", designation: "Accounts Officer", cnic: "33100-3037778-5" },
  { name: "Mr. Safdar Ali Shah", designation: "Rigger", cnic: "33100-5477599-1" },
  { name: "Mr. Shehryar Shakir", designation: "Tech. Support Engineer", cnic: "33102-5103335-9" },
  { name: "Mr. Hafiz Muhammad Shoaib", designation: "Tech. Support Engineer", cnic: "33100-5018814-1" },
  { name: "Affaq Tahir", designation: "Tech. Support Engineer", cnic: "33102-8479185-5" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '').substring(0, 13); // Take first 13 characters
}

async function matchFsdByCnic13() {
  console.log('🔍 Matching remaining FSD employees by CNIC (13 characters)...\n');
  
  // Get all FSD employees
  const fsdEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'FSD'));
  
  console.log(`📋 Found ${fsdEmployees.length} FSD employees in database`);
  console.log(`📋 Checking ${unmatchedCsvData.length} unmatched CSV employees`);
  
  let matchCount = 0;
  let updateCount = 0;
  const matchedEmployees: any[] = [];
  const stillUnmatched: string[] = [];
  
  for (const csvEmployee of unmatchedCsvData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    
    console.log(`🔍 Looking for: "${csvEmployee.name}"`);
    console.log(`   CSV CNIC (13 chars): ${csvCnicNormalized}`);
    
    // Find matching employee in database by first 13 characters of CNIC
    const matchedEmployee = fsdEmployees.find(emp => {
      const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
      return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
    });
    
    if (matchedEmployee) {
      matchCount++;
      matchedEmployees.push({
        csvName: csvEmployee.name,
        dbName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        employeeCode: matchedEmployee.employeeCode,
        designation: csvEmployee.designation,
        currentDesignation: matchedEmployee.designation,
        csvCnic: csvEmployee.cnic,
        dbCnic: matchedEmployee.nationalId
      });
      
      console.log(`   ✅ MATCH FOUND: ${matchedEmployee.employeeCode} (${matchedEmployee.firstName} ${matchedEmployee.lastName})`);
      console.log(`   DB CNIC: ${matchedEmployee.nationalId}`);
      
      // Update designation if different or empty
      if (!matchedEmployee.designation || matchedEmployee.designation !== csvEmployee.designation) {
        await db.update(employeeRecords)
          .set({ designation: csvEmployee.designation })
          .where(eq(employeeRecords.id, matchedEmployee.id));
        updateCount++;
        console.log(`   🔄 Updated designation: ${csvEmployee.designation}`);
      } else {
        console.log(`   ℹ️  Already has correct designation`);
      }
    } else {
      stillUnmatched.push(csvEmployee.name);
      console.log(`   ❌ No match found`);
      
      // Show potential matches for debugging
      const potentialMatches = fsdEmployees.filter(emp => {
        const dbCnic = normalizeCNIC(emp.nationalId || '');
        return dbCnic.substring(0, 10) === csvCnicNormalized.substring(0, 10); // First 10 chars
      });
      
      if (potentialMatches.length > 0) {
        console.log(`   🔍 Potential matches (first 10 chars):`);
        potentialMatches.forEach(emp => {
          console.log(`     ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${emp.nationalId})`);
        });
      }
    }
    console.log('');
  }
  
  console.log('\n📊 FSD CNIC-13 Matching Summary:');
  console.log(`✅ New matches found: ${matchCount}/${unmatchedCsvData.length}`);
  console.log(`🔄 Updated designations: ${updateCount}`);
  console.log(`❌ Still unmatched: ${stillUnmatched.length}`);
  
  if (matchedEmployees.length > 0) {
    console.log('\n✅ Successfully matched:');
    matchedEmployees.forEach(emp => {
      console.log(`  - ${emp.employeeCode}: "${emp.dbName}" -> ${emp.designation}`);
      console.log(`    CSV: ${emp.csvCnic} | DB: ${emp.dbCnic}`);
    });
  }
  
  if (stillUnmatched.length > 0) {
    console.log('\n❌ Still unmatched:');
    stillUnmatched.forEach(name => console.log(`  - ${name}`));
  }
  
  // Check updated FSD coverage
  const finalFsdEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'FSD'));
  
  const totalFsd = finalFsdEmployees.length;
  const withDesignations = finalFsdEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const coverage = Math.round((withDesignations / totalFsd) * 100);
  
  console.log('\n📊 Updated FSD Coverage:');
  console.log(`   Total: ${totalFsd} employees`);
  console.log(`   With designations: ${withDesignations}`);
  console.log(`   Coverage: ${coverage}%`);
  console.log(`   Improvement: +${matchCount} employees`);
  
  console.log('\n🎯 FSD CNIC-13 matching completed!');
}

matchFsdByCnic13().catch(console.error);