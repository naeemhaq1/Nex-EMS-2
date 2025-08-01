import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CSVEmployee {
  name: string;
  designation: string;
}

const csvData: CSVEmployee[] = [
  { name: "Muhammad Moazzam Rana", designation: "Manager - OFC Network" },
  { name: "Nauman Khan", designation: "Sub-Coordinator" },
  { name: "Khurram Abbas", designation: "Sub-Coordinator" },
  { name: "Muhammad Hassan", designation: "Support Officer" },
  { name: "Muhammad Umar Majeed", designation: "Network Engineer - OFC" },
  { name: "Muhammad Basit Ali", designation: "Helper - OFC" },
  { name: "Muhammad Salman Haris", designation: "Technician - OFC" },
  { name: "Fareed Ahmed", designation: "Driver - OFC" },
  { name: "Yasir Mehmood", designation: "Driver - OFC" },
  { name: "Muhammad Sultan Bin Qasim", designation: "Helper - OFC" },
  { name: "Ijaz Ahmed", designation: "Technician - OFC" },
  { name: "Babar Iqbal", designation: "Driver - OFC" },
  { name: "Shahzad Ali", designation: "Helper - OFC" },
  { name: "Sheikh Muhammad Raheel Qaiser", designation: "Technician - OFC" },
  { name: "Muhammad Gul Zaib", designation: "Helper - OFC" },
  { name: "Hamza", designation: "Driver - OFC" },
  { name: "Phool Bilal Bashir", designation: "Driver - OFC" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function showNearMatches() {
  console.log('🔍 Analyzing LHE-OFC Near Matches...\n');
  
  const lheOfcEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-OFC'),
      eq(employeeRecords.isActive, true)
    ));

  console.log('📋 NEAR MATCHES FOR APPROVAL:\n');
  
  const potentialMatches: any[] = [];
  
  for (const csvEmployee of csvData) {
    const csvNormalized = normalizeNameForMatching(csvEmployee.name);
    const bestMatches: any[] = [];
    
    for (const dbEmployee of lheOfcEmployees) {
      const dbName = `${dbEmployee.firstName} ${dbEmployee.lastName}`;
      const dbNormalized = normalizeNameForMatching(dbName);
      
      const similarity = calculateSimilarity(csvNormalized, dbNormalized);
      
      if (similarity > 0.6) { // 60% similarity threshold
        bestMatches.push({
          dbEmployee,
          dbName,
          similarity,
          csvEmployee
        });
      }
    }
    
    if (bestMatches.length > 0) {
      bestMatches.sort((a, b) => b.similarity - a.similarity);
      potentialMatches.push({
        csvName: csvEmployee.name,
        designation: csvEmployee.designation,
        matches: bestMatches.slice(0, 3) // Top 3 matches
      });
    }
  }
  
  potentialMatches.forEach((match, index) => {
    console.log(`${index + 1}. CSV: "${match.csvName}" -> ${match.designation}`);
    match.matches.forEach((m: any, i: number) => {
      const percentage = Math.round(m.similarity * 100);
      console.log(`   ${i + 1}. ${m.dbEmployee.employeeCode}: "${m.dbName}" (${percentage}% match)`);
    });
    console.log('');
  });
  
  console.log('\n🎯 SPECIFIC NEAR MATCHES TO CONSIDER:\n');
  
  // Specific likely matches based on manual analysis
  const likelyMatches = [
    { csv: "Muhammad Moazzam Rana", db: "10090385: Moazzam Rana", confidence: "High" },
    { csv: "Muhammad Umar Majeed", db: "10090472: Umer Majeed", confidence: "High" },
    { csv: "Muhammad Basit Ali", db: "10090526: Muhammad Basit Ali", confidence: "Exact" },
    { csv: "Muhammad Salman Haris", db: "10090617: Salman Haris", confidence: "High" },
    { csv: "Fareed Ahmed", db: "10090564: Fareed Ahmed Sheikh", confidence: "High" },
    { csv: "Yasir Mehmood", db: "10090696: Yasir Mahmood", confidence: "High" },
    { csv: "Muhammad Sultan Bin Qasim", db: "10090618: Sultan Bin Qasim", confidence: "High" },
    { csv: "Ijaz Ahmed", db: "10090697: Ijaz hmed", confidence: "High (typo in DB)" },
    { csv: "Babar Iqbal", db: "10090669: Babar Ali", confidence: "Medium" },
    { csv: "Shahzad Ali", db: "10090666: Shehzad Ali", confidence: "High (typo in DB)" },
    { csv: "Sheikh Muhammad Raheel Qaiser", db: "10090665: Raheel Qaiser", confidence: "High" },
    { csv: "Muhammad Gul Zaib", db: "10090675: Muhammad Gulzaib", confidence: "High" }
  ];
  
  likelyMatches.forEach((match, index) => {
    console.log(`${index + 1}. ${match.csv} -> ${match.db} (${match.confidence})`);
  });
  
  console.log('\n❓ NEED MANUAL VERIFICATION:\n');
  console.log('1. Nauman Khan -> No clear match found');
  console.log('2. Khurram Abbas -> No clear match found');
  console.log('3. Muhammad Hassan -> No clear match found');
  console.log('4. Hamza -> No clear match found');
  console.log('5. Phool Bilal Bashir -> No clear match found');
  
  console.log('\n💡 RECOMMENDATION:');
  console.log('Approve the high-confidence matches above and investigate the medium/unclear ones manually.');
}

showNearMatches().catch(console.error);