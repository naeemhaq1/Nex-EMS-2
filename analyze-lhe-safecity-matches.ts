import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq } from 'drizzle-orm';

// LHE-Safecity data from the image with designations and sub-departments
const lheSafecityData = [
  { name: "Fahad Manan", designation: "Senior Team Lead - PSCA - LHR", subDepartment: "PMU", cnic: "37406-6461178-9" },
  { name: "Muhammad Tauqeer", designation: "Helper", subDepartment: "OFC", cnic: "35201-9263240-9" },
  { name: "Muhammad Fayyaz", designation: "Team Lead", subDepartment: "CAMERA", cnic: "35202-3504400-3" },
  { name: "Adeel Ahmed", designation: "Helper", subDepartment: "CAMERA", cnic: "41204-9839414-1" },
  { name: "M. Luqman", designation: "Helper", subDepartment: "CAMERA", cnic: "36104-4006319-3" },
  { name: "Hamza Naveed", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-7551205-5" },
  { name: "Izhar Mahmood", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-9734748-9" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "36502-3047776-9" },
  { name: "Zeshan Ali", designation: "Electrician", subDepartment: "CAMERA", cnic: "34503-0357599-3" },
  { name: "Waqar Ahmad", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-7646360-3" },
  { name: "Syed Qamar Abbas Naqvi", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-5772601-5" },
  { name: "Shahraz Shabbir", designation: "Helper", subDepartment: "CAMERA", cnic: "38201-6587461-9" },
  { name: "M. Waqar", designation: "Helper", subDepartment: "CAMERA", cnic: "34602-1419096-1" },
  { name: "Abdul Rehman.", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-4754953-5" },
  { name: "Mujahid Ali", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6788167-5" },
  { name: "M. Aqeel Arshad", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-6495617-9" },
  { name: "Adnan Shahzad", designation: "Helper", subDepartment: "CAMERA", cnic: "32303-6204818-9" },
  { name: "Adil Jahangir", designation: "Helper", subDepartment: "CAMERA", cnic: "35202-6477899-7" },
  { name: "Muhammad Shakeel", designation: "Team Lead", subDepartment: "TRAFFIC", cnic: "33105-5103633-5" },
  { name: "Sunil Sharif", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-6216492-1" },
  { name: "Malik Muhammad Rizwan", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35202-4266038-9" },
  { name: "Muhammad Ijaz", designation: "Helper", subDepartment: "TRAFFIC", cnic: "38401-4508525-1" },
  { name: "Zubair Farooq", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35202-4201563-7" },
  { name: "Fayaz Farhat", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-9983029-5" },
  { name: "Maqsood ur Rehman", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-1127335-5" },
  { name: "Muhammad Zohaib", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "31102-9880475-1" },
  { name: "Yasir Ali", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35104-0385365-7" },
  { name: "Khurram Shahzad", designation: "Electrician", subDepartment: "TRAFFIC", cnic: "35201-0760728-9" },
  { name: "Zain Ul Abidin", designation: "Helper", subDepartment: "TRAFFIC", cnic: "35201-4069179-3" },
  { name: "Zahid Iqbal", designation: "Technician", subDepartment: "OFC", cnic: "34301-0356941-7" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "OFC", cnic: "35201-1176740-1" },
  { name: "Muhammad Ashfaq", designation: "Technician", subDepartment: "TRAFFIC", cnic: "35201-5378663-3" },
  { name: "Mubashir", designation: "Helper", subDepartment: "CAMERA", cnic: "36103-6946022-5" },
  { name: "Azeem", designation: "Helper", subDepartment: "CAMERA", cnic: "35201-8813250-9" },
  { name: "Muhammad Shahbaz", designation: "Helper", subDepartment: "LESCO", cnic: "35501-0286201-3" },
  { name: "SYED FARRUKH IQBAL", designation: "Store Executive", subDepartment: "PMU", cnic: "35202-6260713-9" },
  { name: "Abdullah", designation: "Helper", subDepartment: "CAMERA", cnic: "35102-0542858-1" },
  { name: "Ali Raza", designation: "Helper", subDepartment: "CAMERA", cnic: "33202-1474976-9" },
  { name: "Muhammad Nisar", designation: "Helper", subDepartment: "OFC", cnic: "35201-8853422-9" },
  { name: "Muhammad Adeeb Masood", designation: "Helper", subDepartment: "CAMERA", cnic: "37403-7252988-5" },
  { name: "Hanan Azhar", designation: "Helper", subDepartment: "OFC", cnic: "33202-7363863-3" },
  { name: "Zeeshan Ali", designation: "Helper", subDepartment: "OFC", cnic: "35201-6114004-5" },
  { name: "Umer Daraz", designation: "Supervisor", subDepartment: "OFC", cnic: "36102-6292379-3" },
  { name: "Muhammad Ajmal", designation: "Helper", subDepartment: "OFC", cnic: "38401-1814000-9" }
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

async function analyzeLheSafecityMatches() {
  console.log('🔍 Analyzing LHE-Safecity employee matches...\n');
  
  const lheSafecityEmployees = await db.select().from(employeeRecords)
    .where(eq(employeeRecords.department, 'LHE-Safecity'));
  
  console.log(`📋 Found ${lheSafecityEmployees.length} LHE-Safecity employees in database`);
  console.log(`📋 Found ${lheSafecityData.length} employees in CSV data`);
  
  const exactCnicMatches: any[] = [];
  const exactNameMatches: any[] = [];
  const nearMatches: any[] = [];
  const noMatches: any[] = [];
  
  for (const csvEmployee of lheSafecityData) {
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
  
  console.log('\n📊 LHE-Safecity Match Analysis Results:');
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
  
  console.log('\n🎯 Analysis completed!');
  console.log('📝 Please review near matches and authorize updates before proceeding.');
}

analyzeLheSafecityMatches().catch(console.error);