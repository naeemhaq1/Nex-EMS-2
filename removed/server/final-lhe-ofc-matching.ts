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

function extractNameParts(fullName: string): { firstName: string; lastName: string } {
  const normalized = fullName.toLowerCase()
    .replace(/\bmuhammad\b/g, '') // Remove "Muhammad"
    .replace(/\bmohammad\b/g, '') // Remove "Mohammad"
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .trim();
  
  const parts = normalized.split(' ').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else {
    // For multiple parts, take first and last
    return { firstName: parts[0], lastName: parts[parts.length - 1] };
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

async function finalLheOfcMatching() {
  console.log('🔍 Final LHE-OFC Matching (First + Last Name Only)...\n');
  
  const lheOfcEmployees = await db.select().from(employeeRecords)
    .where(and(
      eq(employeeRecords.department, 'LHE-OFC'),
      eq(employeeRecords.isActive, true)
    ));

  console.log('📋 ANALYZING FIRST + LAST NAME MATCHES:\n');
  
  for (const csvEmployee of remainingCsvData) {
    const { firstName: csvFirst, lastName: csvLast } = extractNameParts(csvEmployee.name);
    
    console.log(`🔍 CSV: "${csvEmployee.name}" -> ${csvEmployee.designation}`);
    console.log(`   Extracted: First="${csvFirst}", Last="${csvLast}"`);
    
    const matches: any[] = [];
    
    for (const dbEmployee of lheOfcEmployees) {
      const dbFirst = (dbEmployee.firstName || '').toLowerCase();
      const dbLast = (dbEmployee.lastName || '').toLowerCase();
      
      // Calculate similarity for first and last names
      const firstSimilarity = calculateSimilarity(csvFirst, dbFirst);
      const lastSimilarity = calculateSimilarity(csvLast, dbLast);
      
      // Calculate overall similarity (weighted average)
      const overallSimilarity = (firstSimilarity * 0.6) + (lastSimilarity * 0.4);
      
      if (overallSimilarity > 0.5) {
        matches.push({
          employee: dbEmployee,
          firstSimilarity,
          lastSimilarity,
          overallSimilarity,
          dbFirst,
          dbLast
        });
      }
    }
    
    // Sort by overall similarity
    matches.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
    
    if (matches.length > 0) {
      console.log(`   Top matches:`);
      matches.slice(0, 3).forEach((match, index) => {
        const percentage = Math.round(match.overallSimilarity * 100);
        const firstPct = Math.round(match.firstSimilarity * 100);
        const lastPct = Math.round(match.lastSimilarity * 100);
        console.log(`   ${index + 1}. ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.lastName}"`);
        console.log(`      Overall: ${percentage}% (First: ${firstPct}%, Last: ${lastPct}%)`);
        console.log(`      DB: First="${match.dbFirst}", Last="${match.dbLast}"`);
      });
    } else {
      console.log(`   No matches found above 50% threshold`);
    }
    console.log('');
  }
  
  console.log('\n🎯 RECOMMENDED HIGH-CONFIDENCE MATCHES:\n');
  
  // Manual analysis of specific cases
  const recommendations = [
    {
      csv: "Nauman Khan",
      csvParts: extractNameParts("Nauman Khan"),
      dbMatch: "10090374: Nauman Hameed",
      confidence: "Medium",
      reason: "First name exact match, last name different (Khan vs Hameed)"
    },
    {
      csv: "Babar Iqbal", 
      csvParts: extractNameParts("Babar Iqbal"),
      dbMatch: "10090669: Babar Ali",
      confidence: "Medium",
      reason: "First name exact match, last name different (Iqbal vs Ali)"
    },
    {
      csv: "Muhammad Hassan",
      csvParts: extractNameParts("Muhammad Hassan"),
      dbMatch: "Need to check for Hassan/Hasan variants",
      confidence: "Low",
      reason: "Hassan is distinctive but need to find matching employee"
    }
  ];
  
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. "${rec.csv}" -> ${rec.dbMatch}`);
    console.log(`   Confidence: ${rec.confidence}`);
    console.log(`   Reason: ${rec.reason}`);
    console.log(`   CSV parts: First="${rec.csvParts.firstName}", Last="${rec.csvParts.lastName}"`);
    console.log('');
  });
  
  // Check for specific name patterns
  console.log('\n🔍 CHECKING FOR SPECIFIC NAME PATTERNS:\n');
  
  // Look for Hassan variations
  const hassanMatches = lheOfcEmployees.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    return fullName.includes('hassan') || fullName.includes('hasan');
  });
  
  if (hassanMatches.length > 0) {
    console.log('Hassan/Hasan matches found:');
    hassanMatches.forEach(emp => {
      console.log(`   ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}"`);
    });
  }
  
  // Look for any remaining unmatched employees
  const unmatchedEmployees = lheOfcEmployees.filter(emp => 
    !emp.designation || emp.designation === ''
  );
  
  console.log(`\n📋 Remaining employees without designations: ${unmatchedEmployees.length}`);
  unmatchedEmployees.forEach(emp => {
    console.log(`   ${emp.employeeCode}: "${emp.firstName} ${emp.lastName}"`);
  });
}

finalLheOfcMatching().catch(console.error);