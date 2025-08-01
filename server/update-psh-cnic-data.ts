import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// PSH CNIC data from the provided image
const pshCnicData = [
  { name: "Ishtiaq Ahmed", designation: "Ass. Manager Accounts", cnic: "17101-2437171-5" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5" },
  { name: "Zahid Hussain", designation: "Office Incharge-Abbottabad", cnic: "13101-0794417-5" },
  { name: "Waqas Ahmed", designation: "Ass. Admin.", cnic: "17301-1229911-7" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1" },
  { name: "Naseer Anwar", designation: "Sales Executive-Haripur Part Time", cnic: "13302-0445027-9" },
  { name: "Atiq-Ur-Rehman", designation: "Rigger", cnic: "" },
  { name: "Abid Ali", designation: "C S Officer", cnic: "13101-2394113-3" },
  { name: "Faiz Malik", designation: "C S Officer- Peshawar", cnic: "" },
  { name: "Syed Fahad Ali Shah", designation: "C S Officer- Peshawar", cnic: "17301-3859714-1" },
  { name: "SAJJAD", designation: "Security Guard", cnic: "17301-2925355-9" },
  { name: "Raheel Pervez Sethi", designation: "C S Officer- Peshawar", cnic: "17301-3933105-7" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager PSH", cnic: "17301-1562836-3" },
  { name: "Asim Shahzad", designation: "C S Officer- Peshawar", cnic: "17301-1355079-7" },
  { name: "Muhammad Usher", designation: "Office Boy", cnic: "17301-7331514-3" }
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

async function updatePshCnicData() {
  console.log('🔍 Updating PSH National ID (CNIC) data...\n');
  
  // Get all PSH employees
  const pshEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'PSH'),
      eq(employeeRecords.isActive, true)
    ));
  
  console.log(`📋 Found ${pshEmployees.length} PSH employees in database`);
  console.log(`📋 Found ${pshCnicData.length} employees with CNIC data`);
  
  let updateCount = 0;
  let errorCount = 0;
  const results: any[] = [];
  
  for (const csvData of pshCnicData) {
    if (!csvData.cnic || csvData.cnic.trim() === '') {
      console.log(`⚠️  Skipping ${csvData.name} - no CNIC provided`);
      continue;
    }
    
    const csvNameNormalized = normalizeNameForMatching(csvData.name);
    
    // Find best match in database
    const matches = pshEmployees.map(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      const similarity = calculateNameSimilarity(csvData.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        employee: emp,
        similarity,
        dbName: `${emp.firstName} ${emp.lastName}`
      };
    }).filter(match => match.similarity > 80)
      .sort((a, b) => b.similarity - a.similarity);
    
    if (matches.length === 0) {
      console.log(`❌ No match found for: ${csvData.name}`);
      errorCount++;
      continue;
    }
    
    const bestMatch = matches[0];
    
    try {
      console.log(`🔄 Updating ${bestMatch.employee.employeeCode}...`);
      
      // Update National ID (CNIC) - normalize by removing dashes
      const normalizedCnic = normalizeCNIC(csvData.cnic);
      
      await db.update(employeeRecords)
        .set({ 
          nationalId: normalizedCnic,
          // Also update designation if employee doesn't have one
          designation: bestMatch.employee.designation || csvData.designation
        })
        .where(eq(employeeRecords.id, bestMatch.employee.id));
      
      updateCount++;
      
      results.push({
        employeeCode: bestMatch.employee.employeeCode,
        dbName: bestMatch.dbName,
        csvName: csvData.name,
        cnic: normalizedCnic,
        originalCnic: csvData.cnic,
        designation: csvData.designation,
        similarity: bestMatch.similarity,
        previousCnic: bestMatch.employee.nationalId || 'No CNIC'
      });
      
      console.log(`   ✅ Updated: ${bestMatch.dbName} <- ${csvData.name} (${bestMatch.similarity}%)`);
      console.log(`      CNIC: ${csvData.cnic} → ${normalizedCnic}`);
      console.log(`      Designation: ${csvData.designation}`);
      
    } catch (error) {
      console.log(`   ❌ Error updating ${bestMatch.employee.employeeCode}: ${error}`);
      errorCount++;
    }
    console.log('');
  }
  
  console.log('\n📊 PSH CNIC Update Summary:');
  console.log(`✅ Successfully updated: ${updateCount}/${pshCnicData.filter(d => d.cnic).length} employees`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (results.length > 0) {
    console.log('\n✅ Updated PSH employees with CNIC data:');
    results.forEach(result => {
      console.log(`  - ${result.employeeCode}: ${result.dbName}`);
      console.log(`    CNIC: ${result.previousCnic} → ${result.cnic} (from ${result.originalCnic})`);
      console.log(`    Designation: ${result.designation}`);
      console.log(`    Match: ${result.similarity}%`);
      console.log('');
    });
  }
  
  // Check final PSH CNIC coverage
  const updatedPshEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'PSH'),
      eq(employeeRecords.isActive, true)
    ));
  
  const totalPsh = updatedPshEmployees.length;
  const withCnic = updatedPshEmployees.filter(emp => emp.nationalId && emp.nationalId !== '').length;
  const withDesignations = updatedPshEmployees.filter(emp => emp.designation && emp.designation !== '').length;
  
  const cnicCoverage = Math.round((withCnic / totalPsh) * 100);
  const designationCoverage = Math.round((withDesignations / totalPsh) * 100);
  
  console.log('\n📊 Updated PSH Department Coverage:');
  console.log(`   Total employees: ${totalPsh}`);
  console.log(`   With CNIC: ${withCnic} (${cnicCoverage}%)`);
  console.log(`   With designations: ${withDesignations} (${designationCoverage}%)`);
  
  // Show remaining employees without CNIC
  const remainingNoCnic = updatedPshEmployees.filter(emp => !emp.nationalId || emp.nationalId === '');
  
  if (remainingNoCnic.length > 0) {
    console.log('\n📝 PSH employees still without CNIC:');
    remainingNoCnic.forEach(emp => {
      console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} (${emp.designation || 'No designation'})`);
    });
  }
  
  console.log('\n🎯 PSH CNIC update completed!');
  console.log('📈 PSH department now has improved CNIC coverage for better matching capabilities!');
}

updatePshCnicData().catch(console.error);