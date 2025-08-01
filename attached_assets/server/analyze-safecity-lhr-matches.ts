import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// SafeCity-LHR data from the attached image
const safecityLhrData = [
  { name: "Muhammad Raza", designation: "Helper", subDepartment: "OFC", cnic: "35202-1581256-7" },
  { name: "Muhammad Zeeshan", designation: "Helper", subDepartment: "OFC", cnic: "35202-0652178-5" },
  { name: "Muhammad Awais Raza", designation: "Helper", subDepartment: "OFC", cnic: "35201-6957935-5" },
  { name: "Muhammad Abid Nisar", designation: "Helper", subDepartment: "OFC", cnic: "35201-8347683-3" },
  { name: "Muhammad Amir Bilal", designation: "Helper", subDepartment: "OFC", cnic: "38102-9423859-3" },
  { name: "Muhammad Ali", designation: "Helper", subDepartment: "OFC", cnic: "35301-9412247-5" },
  { name: "Muhammad Ahmed", designation: "Helper", subDepartment: "OFC", cnic: "35201-1002137-5" },
  { name: "Shoaib Yousef", designation: "Helper", subDepartment: "OFC", cnic: "35202-8527075-1" },
  { name: "Muhammad Awais", designation: "Technician", subDepartment: "OFC", cnic: "35202-2233003-5" },
  { name: "Ahtisham Ul Haq Qadri", designation: "Technician", subDepartment: "OFC", cnic: "82102-6830252-3" },
  { name: "Adnan Ali", designation: "Helper", subDepartment: "PMU", cnic: "31102-4883632-5" },
  { name: "Muhammad Ahmad Ali", designation: "Helper", subDepartment: "PMU", cnic: "31102-4883632-5" },
  { name: "Raheel", designation: "Office Boy", subDepartment: "PMU", cnic: "35202-7464270-9" },
  { name: "Syed Hadi Abbas Naqvi", designation: "Supervisor", subDepartment: "LESCO", cnic: "35202-5310386-5" },
  { name: "Muhammad Noman Akram", designation: "Coordinator (Safe City O & M Infra)", subDepartment: "PMU", cnic: "33102-3999725-1" },
  { name: "Umer Farooq", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6550506-7" },
  { name: "Asrar Ahmad", designation: "Helper", subDepartment: "OFC", cnic: "35201-8937032-1" },
  { name: "Qaiser Ahmad", designation: "Helper", subDepartment: "OFC", cnic: "35201-9201020-1" },
  { name: "Muhammad Qasim", designation: "Helper", subDepartment: "OFC", cnic: "36102-0568717-3" }
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

async function analyzeSafecityLhrMatches() {
  console.log('🔍 Analyzing SafeCity-LHR employee matches...\n');
  
  const lheSafecityEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  console.log(`📋 Found ${lheSafecityEmployees.length} LHE-Safecity employees in database`);
  console.log(`📋 Found ${safecityLhrData.length} employees in SafeCity-LHR CSV data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of safecityLhrData) {
    const csvCnicNormalized = normalizeCNIC(csvEmployee.cnic);
    const csvNameNormalized = normalizeNameForMatching(csvEmployee.name);
    
    // Check for exact CNIC match
    const cnicMatch = lheSafecityEmployees.find(emp => {
      const dbCnicNormalized = normalizeCNIC(emp.nationalId || '');
      return dbCnicNormalized === csvCnicNormalized && dbCnicNormalized !== '';
    });
    
    if (cnicMatch) {
      exactCnicMatches.push({
        csvName: csvEmployee.name,
        dbName: `${cnicMatch.firstName} ${cnicMatch.lastName}`,
        employeeCode: cnicMatch.employeeCode,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        matchType: 'EXACT_CNIC'
      });
      continue;
    }
    
    // Check for exact name match
    const nameMatch = lheSafecityEmployees.find(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      return dbNameNormalized === csvNameNormalized;
    });
    
    if (nameMatch) {
      exactNameMatches.push({
        csvName: csvEmployee.name,
        dbName: `${nameMatch.firstName} ${nameMatch.lastName}`,
        employeeCode: nameMatch.employeeCode,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        matchType: 'EXACT_NAME'
      });
      continue;
    }
    
    // Check for near matches (similarity > 70%)
    const potentialMatches = lheSafecityEmployees.map(emp => {
      const dbNameNormalized = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
      const similarity = calculateNameSimilarity(csvEmployee.name, `${emp.firstName} ${emp.lastName}`);
      
      return {
        csvName: csvEmployee.name,
        dbName: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        designation: csvEmployee.designation,
        subDepartment: csvEmployee.subDepartment,
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
        subDepartment: csvEmployee.subDepartment,
        cnic: csvEmployee.cnic,
        matchType: 'NO_MATCH'
      });
    }
  }
  
  console.log('\n📊 SafeCity-LHR Match Analysis Results:');
  console.log(`✅ Exact CNIC matches: ${exactCnicMatches.length}`);
  console.log(`✅ Exact name matches: ${exactNameMatches.length}`);
  console.log(`⚠️  Near matches requiring approval: ${nearMatches.length}`);
  console.log(`❌ No matches found: ${noMatches.length}`);
  
  if (exactCnicMatches.length > 0) {
    console.log('\n✅ EXACT CNIC MATCHES (Auto-approve):');
    exactCnicMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | ${match.subDepartment} | CNIC: ${match.cnic}`);
    });
  }
  
  if (exactNameMatches.length > 0) {
    console.log('\n✅ EXACT NAME MATCHES (Auto-approve):');
    exactNameMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}"`);
      console.log(`    ${match.designation} | ${match.subDepartment} | CNIC: ${match.cnic}`);
    });
  }
  
  if (nearMatches.length > 0) {
    console.log('\n⚠️  NEAR MATCHES (Require Authorization):');
    nearMatches.forEach(match => {
      console.log(`  - ${match.employeeCode}: "${match.dbName}" <- "${match.csvName}" (${match.similarity}%)`);
      console.log(`    ${match.designation} | ${match.subDepartment}`);
      console.log(`    CSV CNIC: ${match.cnic} | DB CNIC: ${match.dbCnic}`);
      console.log('');
    });
  }
  
  if (noMatches.length > 0) {
    console.log('\n❌ NO MATCHES FOUND:');
    noMatches.forEach(match => {
      console.log(`  - "${match.csvName}" | ${match.designation} | ${match.subDepartment} | CNIC: ${match.cnic}`);
    });
  }
  
  console.log('\n🎯 SafeCity-LHR analysis completed!');
  console.log('📝 Please review near matches and authorize updates before proceeding.');
}

analyzeSafecityLhrMatches().catch(console.error);