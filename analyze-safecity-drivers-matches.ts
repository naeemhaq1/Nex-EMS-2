import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Database employees
const dbEmployees = [
  { code: '10070602', name: 'Abdul Majeed', cnic: '35201176644763' },
  { code: '10070617', name: 'Asif Lateef', cnic: '' },
  { code: '10070620', name: 'Muhammad d Rizwan', cnic: '3520275689441' },
  { code: '10070621', name: 'Muhammad Mobeen ad Mobeen Afzal', cnic: '3520186835389' },
  { code: '10070622', name: 'Atif Naeem', cnic: '3520146050969' }
];

// CSV employees
const csvEmployees = [
  { name: 'Waqas Elahi', cnic: '35201-5422278-5' },
  { name: 'Abdul Majeed', cnic: '35201-1-7664476-3' },
  { name: 'Ahman Qasim', cnic: '35202-3097037-5' },
  { name: 'Muhammad Imran', cnic: '35201-0719801-7' },
  { name: 'Arshad Naseem', cnic: '35201-4202747-1' },
  { name: 'Adnan Ashraf', cnic: '35202-9650517-7' },
  { name: 'Shahid Gill', cnic: '35202-4503045-5' },
  { name: 'Ahsan Ali', cnic: '35201-7913318-5' },
  { name: 'Muhammad Ishaq', cnic: '35201-6319294-5' },
  { name: 'Mudassar Javaid', cnic: '35202-6928647-7' },
  { name: 'Muhammad Umran', cnic: '35202-5524459-7' },
  { name: 'Abdul Samad', cnic: '35201-5064452-9' },
  { name: 'Sarfraz Hussain', cnic: '3110-1-3498384-9' },
  { name: 'Syed Hussain Haider', cnic: '3560-1-0129530-5' },
  { name: 'Muhammad Khan', cnic: '3720-3-4618652-5' },
  { name: 'Sajid Ali', cnic: '3520-3-1787803-5' }
];

function normalizeCNIC(cnic: string): string {
  if (!cnic) return '';
  return cnic.replace(/[-\s]/g, '');
}

function normalizeNameForMatching(name: string): string {
  return name
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

console.log('🔍 Analyzing LHE-Safecity-Drivers name and CNIC matches...\n');

console.log('📋 Database employees:');
dbEmployees.forEach(emp => {
  console.log(`  - ${emp.code}: ${emp.name} (CNIC: ${emp.cnic || 'N/A'})`);
});

console.log('\n📋 CSV employees:');
csvEmployees.forEach(emp => {
  console.log(`  - ${emp.name} (CNIC: ${emp.cnic})`);
});

console.log('\n🔍 Detailed match analysis:');

// Check each database employee against CSV employees
dbEmployees.forEach(dbEmp => {
  console.log(`\n--- Analyzing ${dbEmp.code}: ${dbEmp.name} ---`);
  
  // Check for exact CNIC match
  const cnicMatches = csvEmployees.filter(csvEmp => {
    const dbCnicNorm = normalizeCNIC(dbEmp.cnic);
    const csvCnicNorm = normalizeCNIC(csvEmp.cnic);
    return dbCnicNorm && csvCnicNorm && dbCnicNorm === csvCnicNorm;
  });
  
  if (cnicMatches.length > 0) {
    console.log(`  ✅ EXACT CNIC MATCH: ${cnicMatches[0].name}`);
    return;
  }
  
  // Check for name similarity
  const nameMatches = csvEmployees.map(csvEmp => ({
    csvEmployee: csvEmp,
    similarity: calculateNameSimilarity(dbEmp.name, csvEmp.name)
  }))
  .filter(match => match.similarity > 30) // Lower threshold for investigation
  .sort((a, b) => b.similarity - a.similarity);
  
  if (nameMatches.length > 0) {
    console.log(`  🔍 Name similarity matches:`);
    nameMatches.slice(0, 3).forEach(match => {
      console.log(`    - ${match.csvEmployee.name} (${match.similarity}% similarity)`);
      console.log(`      CSV CNIC: ${match.csvEmployee.cnic}`);
      console.log(`      DB CNIC: ${dbEmp.cnic || 'N/A'}`);
    });
  } else {
    console.log(`  ❌ No reasonable name matches found`);
  }
});

// Check if any CSV employees are completely unmatched
console.log('\n🔍 Unmatched CSV employees:');
const unmatchedCSV = csvEmployees.filter(csvEmp => {
  return !dbEmployees.some(dbEmp => {
    const dbCnicNorm = normalizeCNIC(dbEmp.cnic);
    const csvCnicNorm = normalizeCNIC(csvEmp.cnic);
    return (dbCnicNorm && csvCnicNorm && dbCnicNorm === csvCnicNorm) ||
           calculateNameSimilarity(dbEmp.name, csvEmp.name) > 80;
  });
});

unmatchedCSV.forEach(emp => {
  console.log(`  - ${emp.name} (CNIC: ${emp.cnic})`);
});

console.log('\n📊 Summary:');
console.log(`  Database employees: ${dbEmployees.length}`);
console.log(`  CSV employees: ${csvEmployees.length}`);
console.log(`  Successfully matched: 1 (Abdul Majeed)`);
console.log(`  Unmatched DB employees: ${dbEmployees.length - 1}`);
console.log(`  Unmatched CSV employees: ${unmatchedCSV.length}`);