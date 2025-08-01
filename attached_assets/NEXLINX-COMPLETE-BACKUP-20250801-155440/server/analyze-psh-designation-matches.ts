import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// PSH CSV data from existing files
const pshData = [
  { name: "Ishtiaq Ahmed", designation: "Ass. Manager Accounts", cnic: "17101-2437171-5", joining: "01-July-2012" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5", joining: "01-July-2012" },
  { name: "Zahid Hussain", designation: "Office Incharge-Abbotabad", cnic: "13101-0794417-5", joining: "01-July-2012" },
  { name: "Waqas Ahmed", designation: "Ass. Admin.", cnic: "17301-1229911-7", joining: "01-July-2012" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3", joining: "01-July-2012" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1", joining: "01-July-2012" },
  { name: "Naseer Anwar", designation: "Sales Executive-Haripur Part Time", cnic: "13302-0445027-9", joining: "01-July-2012" },
  { name: "Atiq-Ur-Rehman", designation: "Riggar", cnic: "", joining: "01-July-2024" },
  { name: "Abid Ali", designation: "C S Officer", cnic: "13101-2394113-3", joining: "16-Dec-2020" },
  { name: "Faiz Malik", designation: "C S Officer- Peshawar", cnic: "", joining: "15-Oct-2021" },
  { name: "Syed Fahad Ali Shah", designation: "C S Officer- Peshawar", cnic: "17301-3859714-1", joining: "10-Jan-2022" },
  { name: "SAJJAD", designation: "Security Guard", cnic: "17301-2925355-9", joining: "01-OCT-2022" },
  { name: "Raheel Pervez Sethi", designation: "C S Officer- Peshawar", cnic: "17301-3933105-7", joining: "01-Jan-2022" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager PSH", cnic: "17301-1562836-3", joining: "07-February-2022" },
  { name: "Asim Shahzad", designation: "C S Officer- Peshawar", cnic: "17301-1355079-7", joining: "15-Jan-2022" },
  { name: "Muhammad Umer", designation: "Office Boy", cnic: "17301-7331514-3", joining: "01-MAY-2023" }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Syed', 'Muhammad', 'Mohammad', 'Raja', 'Sheikh'];
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

async function analyzePshDesignationMatches() {
  console.log('🔍 Analyzing PSH designation matches...\n');
  
  const pshEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'PSH'));
  
  console.log(`📋 Found ${pshEmployees.length} PSH employees in database`);
  console.log(`📋 Found ${pshData.length} employees in PSH CSV data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of pshData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match
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
    
    // Check for near matches (similarity > 70%)
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
    }).filter(match => match.similarity > 70)
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
  
  console.log('\n📊 PSH Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | CNIC: ${match.cnic}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | CNIC: ${match.cnic}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}" (${match.similarity}%)`);
      console.log(`    ${match.designation}`);
      console.log(`    CSV CNIC: ${match.cnic} | DB CNIC: ${match.dbCnic}`);
      console.log('');
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvName}" | ${match.designation} | CNIC: ${match.cnic}`);
    });
  }
  
  console.log('\n🎯 PSH designation analysis completed!');
  console.log('📝 Please review near matches and authorize updates before proceeding.');
}

analyzePshDesignationMatches().catch(console.error);