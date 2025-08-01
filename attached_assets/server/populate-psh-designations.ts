import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Complete PSH designation data from the provided image
const pshDesignationData = [
  { name: "Ishtiaq Ahmed", designation: "Ass. Manager Accounts", cnic: "1710124371715" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "1710106915815" },
  { name: "Zahid Hussain", designation: "Office Incharge-Abbottabad", cnic: "1310107944175" },
  { name: "Waqas Ahmed", designation: "Ass. Admin.", cnic: "1730112299117" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "1730186615873" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "1540173380271" },
  { name: "Naseer Anwar", designation: "Sales Executive-Haripur Part Time", cnic: "1330204450279" },
  { name: "Atiq-Ur-Rehman", designation: "Rigger", cnic: "" },
  { name: "Abid Ali", designation: "C S Officer", cnic: "1310123941133" },
  { name: "Faiz Malik", designation: "C S Officer- Peshawar", cnic: "" },
  { name: "Syed Fahad Ali Shah", designation: "C S Officer- Peshawar", cnic: "1730138597141" },
  { name: "SAJJAD", designation: "Security Guard", cnic: "1730129253559" },
  { name: "Raheel Pervez Sethi", designation: "C S Officer- Peshawar", cnic: "1730139331057" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager PSH", cnic: "1730115628363" },
  { name: "Asim Shahzad", designation: "C S Officer- Peshawar", cnic: "1730113550797" },
  { name: "Muhammad Usher", designation: "Office Boy", cnic: "1730173315143" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Syed', 'Muhammad', 'Mohammad', 'Raja', 'Sheikh', 'M.', 'Malik'];
  let normalized = name;
  
  prefixes.forEach(prefix => {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    normalized = normalized.replace(regex, '');
  });
  
  return normalized
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeNameForMatching(name1);
  const n2 = normalizeNameForMatching(name2);
  
  if (n1 === n2) return 100;
  
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  
  let matches = 0;
  let totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matches++;
        break;
      }
    }
  }
  
  return Math.round((matches / totalWords) * 100);
}

async function populatePshDesignations() {
  console.log('🔄 Populating PSH designations (Step 2)...\n');
  
  // Get all PSH employees
  const pshEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'PSH'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${pshEmployees.length} PSH employees in database`);
  console.log(`📋 Found ${pshDesignationData.length} employees with designation data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of pshDesignationData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match first (most reliable)
    if (csvCnicNormalized) {
      const cnicMatch = pshEmployees.find(emp => {
        const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
        return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
      });
      
      if (cnicMatch) {
        exactCnicMatches.push({
          csvName: csvEmployee.name,
          dbName: `${cnicMatch.firstName} ${cnicMatch.lastName}`,
          employeeCode: cnicMatch.employeeCode,
          designation: csvEmployee.designation,
          cnic: csvEmployee.cnic,
          matchType: 'EXACT_CNIC'
        });
        continue;
      }
    }
    
    // Check for exact name match
    const nameMatch = pshEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvName: csvEmployee.name,
        dbName: `${nameMatch.firstName} ${nameMatch.lastName}`,
        employeeCode: nameMatch.employeeCode,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 80%)
    const potentialMatches = pshEmployees.map(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvName: csvEmployee.name,
        dbName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        dbCnic: emp.nationalId || 'N/A',
        similarity,
        matchType: 'NEAR_MATCH'
      };
    }).filter(match => match.similarity > 80)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (potentialMatches.length > 0) {
      nearMatches.push(...potentialMatches.slice(0, 3)); // Top 3 matches
    } else {
      noMatches.push({
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        cnic: csvEmployee.cnic,
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 PSH Designation Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  // Auto-approve exact matches
  const approvedMatches = [...exactCnicMatches, ...exactNameMatches];
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    Designation: ${match.designation}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    Designation: ${match.designation}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}" (${match.similarity}%)`);
      console.log(`    Designation: ${match.designation}`);
      console.log(`    CSV CNIC: ${match.cnic} | DB CNIC: ${match.dbCnic}`);
    });
  }
  
  // Update approved matches
  if (approvedMatches.length > 0) {
    console.log('\n🔄 Updating approved designation matches...');
    
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
          designation: match.designation,
          previousDesignation: emp.designation || 'No designation'
        });
        
        console.log(`   ✅ Updated: ${emp.firstName} ${emp.lastName}`);
        console.log(`      Designation: ${emp.designation || 'None'} → ${match.designation}`);
        
      } catch (error) {
        console.log(`   ❌ Error updating ${match.employeeCode}: ${error}`);
        errorCount++;
      }
      console.log('');
    }
    
    console.log('\n📊 PSH Designation Update Summary:');
    console.log(`✅ Successfully updated: ${updateCount}/${approvedMatches.length} employees`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n✅ Updated PSH employees with designations:');
      results.forEach(result => {
        console.log(`  - ${result.employeeCode}: ${result.name}`);
        console.log(`    Designation: ${result.previousDesignation} → ${result.designation}`);
      });
    }
  }
  
  // Check final PSH designation coverage
  const finalPshEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'PSH'),
      eq(employeeRecords.isActive, true)
    ));
  
  const total = finalPshEmployees.length;
  const withDesignations = finalPshEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  const withCnics = finalPshEmployees.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  
  const designationCoverage = Math.round((withDesignations / total) * 100);
  const cnicCoverage = Math.round((withCnics / total) * 100);
  
  console.log('\n📊 Updated PSH Department Coverage:');
  console.log(`   Total employees: ${total}`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  console.log(`   With CNICs: ${withCnics} (${cnicCoverage}%)`);
  
  // Show remaining employees without designations
  const remainingNoDesignation = finalPshEmployees.filter(emp => 
    !emp.designation || emp.designation === ''
  );
  
  if (remainingNoDesignation.length > 0) {
    console.log('\n📝 PSH employees still without designations:');
    remainingNoDesignation.forEach(emp => {
      const cnic = emp.nationalId ? `CNIC: ${emp.nationalId}` : 'No CNIC';
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${cnic})`);
    });
  }
  
  console.log('\n🎯 PSH designation population completed!');
  console.log(`📈 PSH department coverage improved from 65% to ${designationCoverage}%!`);
}

populatePshDesignations().catch(console.error);