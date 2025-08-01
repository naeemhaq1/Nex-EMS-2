import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface CSVEmployee {
  name: string;
  designation: string;
}

// All remaining unmatched CSV employees
const remainingCsvData: CSVEmployee[] = [
  { name: "Nauman Khan", designation: "Sub-Coordinator" },
  { name: "Khurram Abbas", designation: "Sub-Coordinator" },
  { name: "Muhammad Hassan", designation: "Support Officer" },
  { name: "Babar Iqbal", designation: "Driver - OFC" },
  { name: "Hamza", designation: "Driver - OFC" },
  { name: "Phool Bilal Bashir", designation: "Driver - OFC" }
];

function extractNameParts(fullName: string): { firstName: string; lastName: string, cleanedName: string } {
  const normalized = fullName.toLowerCase()
    .replace(/\bsyed\b/g, '') // Remove "Syed"
    .replace(/\bmuhammad\b/g, '') // Remove "Muhammad"
    .replace(/\bmohammad\b/g, '') // Remove "Mohammad"
    .replace(/\braja\b/g, '') // Remove "Raja"
    .replace(/\bsheikh\b/g, '') // Remove "Sheikh"
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
  
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '', cleanedName: normalized };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', cleanedName: normalized };
  } else {
    // For multiple parts, take first and last
    return { firstName: parts[0], lastName: parts[parts.length - 1], cleanedName: normalized };
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
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

async function comprehensiveLheOfcMatching() {
  console.log('🔍 Comprehensive LHE-OFC Matching (Excluding: Syed, Muhammad, Raja, Sheikh)...\n');
  
  const lheOfcEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-OFC'),
      eq(employeeRecords.isActive, true)
    ));

  console.log('📋 ENHANCED MATCHING WITH EXCLUDED PREFIXES:\n');
  
  const allMatches: any[] = [];
  
  for (const csvEmployee of remainingCsvData) {
    const csvParts = extractNameParts(csvEmployee.name);
    
    console.log(`🔍 CSV: "${csvEmployee.name}" -> ${csvEmployee.designation}`);
    console.log(`   Cleaned: "${csvParts.cleanedName}"`);
    console.log(`   Parts: First="${csvParts.firstName}", Last="${csvParts.lastName}"`);
    
    const matches: any[] = [];
    
    for (const dbEmployee of lheOfcEmployees) {
      const dbParts = extractNameParts(`${dbEmployee.firstName} ${dbEmployee.lastName}`);
      
      // Calculate similarity for cleaned full names
      const fullNameSimilarity = calculateSimilarity(csvParts.cleanedName, dbParts.cleanedName);
      
      // Calculate similarity for first and last names
      const firstSimilarity = calculateSimilarity(csvParts.firstName, dbParts.firstName);
      const lastSimilarity = calculateSimilarity(csvParts.lastName, dbParts.lastName);
      
      // Calculate overall similarity (weighted: full name 50%, first name 30%, last name 20%)
      const overallSimilarity = (fullNameSimilarity * 0.5) + (firstSimilarity * 0.3) + (lastSimilarity * 0.2);
      
      if (overallSimilarity > 0.4) { // Lowered threshold to 40%
        matches.push({
          employee: dbEmployee,
          fullNameSimilarity,
          firstSimilarity,
          lastSimilarity,
          overallSimilarity,
          dbParts,
          csvEmployee
        });
      }
    }
    
    // Sort by overall similarity
    matches.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
    
    if (matches.length > 0) {
      console.log(`   Matches found:`);
      matches.slice(0, 3).forEach((match, index) => {
        const percentage = Math.round(match.overallSimilarity * 100);
        const fullPct = Math.round(match.fullNameSimilarity * 100);
        const firstPct = Math.round(match.firstSimilarity * 100);
        const lastPct = Math.round(match.lastSimilarity * 100);
        console.log(`   ${index + 1}. ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}"`);
        console.log(`      Overall: ${percentage}% (Full: ${fullPct}%, First: ${firstPct}%, Last: ${lastPct}%)`);
        console.log(`      DB cleaned: "${match.dbParts.cleanedName}"`);
        
        if (percentage >= 60) {
          allMatches.push({
            csvName: csvEmployee.name,
            dbEmployee: match.employee,
            designation: csvEmployee.designation,
            confidence: percentage >= 80 ? 'High' : 'Medium',
            similarity: percentage
          });
        }
      });
    } else {
      console.log(`   No matches found above 40% threshold`);
    }
    console.log('');
  }
  
  console.log('\n🎯 RECOMMENDED MATCHES FOR APPROVAL:\n');
  
  if (allMatches.length > 0) {
    allMatches.sort((a, b) => b.similarity - a.similarity);
    
    allMatches.forEach((match, index) => {
      console.log(`${index + 1}. "${match.csvName}" -> ${match.dbEmployee.employeeCode}: "${match.dbEmployee.firstName} ${match.dbEmployee.lastName}"`);
      console.log(`   Designation: ${match.designation}`);
      console.log(`   Confidence: ${match.confidence} (${match.similarity}%)`);
      console.log('');
    });
  } else {
    console.log('No high-confidence matches found.');
  }
  
  // Check remaining employees without designations
  const unmatchedEmployees = lheOfcEmployees.filter(emp => 
    !emp.designation || emp.designation === ''
  );
  
  console.log(`\n📋 Remaining employees without designations: ${unmatchedEmployees.length}`);
  unmatchedEmployees.forEach(emp => {
    const cleaned = extractNameParts(`${emp.firstName} ${emp.lastName}`);
    console.log(`   ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}" (cleaned: "${cleaned.cleanedName}")`);
  });
  
  return allMatches;
}

comprehensiveLheOfcMatching().catch(console.error);