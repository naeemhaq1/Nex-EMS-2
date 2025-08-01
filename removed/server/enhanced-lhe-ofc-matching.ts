import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CSVEmployee {
  name: string;
  designation: string;
}

// Remaining unmatched CSV employees
const remainingCsvData: CSVEmployee[] = [
  { name: "Nauman Khan", designation: "Sub-Coordinator" },
  { name: "Khurram Abbas", designation: "Sub-Coordinator" },
  { name: "Muhammad Hassan", designation: "Support Officer" },
  { name: "Babar Iqbal", designation: "Driver - OFC" },
  { name: "Hamza", designation: "Driver - OFC" },
  { name: "Phool Bilal Bashir", designation: "Driver - OFC" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\bmuhammad\b/g, '') // Remove "Muhammad"
    .replace(/\bmohammad\b/g, '') // Remove "Mohammad"
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Multiple spaces to single space
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

async function enhancedLheOfcMatching() {
  console.log('🔍 Enhanced LHE-OFC Matching (ignoring Muhammad/Mohammad)...\n');
  
  const lheOfcEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-OFC'),
      eq(employeeRecords.isActive, true)
    ));

  console.log('📋 ENHANCED MATCHES (ignoring Muhammad/Mohammad):\n');
  
  const potentialMatches: any[] = [];
  
  for (const csvEmployee of remainingCsvData) {
    const csvNormalized = normalizeNameForMatching(csvEmployee.name);
    const bestMatches: any[] = [];
    
    for (const dbEmployee of lheOfcEmployees) {
      const dbName = `${dbEmployee.firstName} ${dbEmployee.lastName}`;
      const dbNormalized = normalizeNameForMatching(dbName);
      
      const similarity = calculateSimilarity(csvNormalized, dbNormalized);
      
      if (similarity > 0.5) { // 50% similarity threshold
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
      const csvNorm = normalizeNameForMatching(match.csvName);
      const dbNorm = normalizeNameForMatching(m.dbName);
      console.log(`   ${i + 1}. ${m.dbEmployee.employeeCode}: "${m.dbName}" (${percentage}% match)`);
      console.log(`      CSV normalized: "${csvNorm}"`);
      console.log(`      DB normalized:  "${dbNorm}"`);
    });
    console.log('');
  });
  
  console.log('\n🎯 RECOMMENDED MATCHES (ignoring Muhammad/Mohammad):\n');
  
  // Enhanced recommendations
  const enhancedRecommendations = [
    { 
      csv: "Muhammad Hassan", 
      csvNorm: "hassan",
      matches: lheOfcEmployees.filter(emp => {
        const dbNorm = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
        return dbNorm.includes('hassan') || dbNorm.includes('hussan');
      })
    },
    { 
      csv: "Babar Iqbal", 
      csvNorm: "babar iqbal",
      matches: lheOfcEmployees.filter(emp => {
        const dbNorm = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
        return dbNorm.includes('babar');
      })
    },
    { 
      csv: "Nauman Khan", 
      csvNorm: "nauman khan",
      matches: lheOfcEmployees.filter(emp => {
        const dbNorm = normalizeNameForMatching(`${emp.firstName} ${emp.lastName}`);
        return dbNorm.includes('nauman');
      })
    }
  ];
  
  enhancedRecommendations.forEach((rec, index) => {
    if (rec.matches.length > 0) {
      console.log(`${index + 1}. "${rec.csv}" (normalized: "${rec.csvNorm}")`);
      rec.matches.forEach(match => {
        const dbNorm = normalizeNameForMatching(`${match.firstName} ${match.lastName}`);
        console.log(`   -> ${match.employeeCode}: "${match.firstName} ${match.lastName}" (normalized: "${dbNorm}")`);
      });
      console.log('');
    }
  });
}

enhancedLheOfcMatching().catch(console.error);