import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { and, isNull, or, eq } from "drizzle-orm";

// KHI employee data from the image
const khiCsvData = [
  {
    name: "Amir Hameed",
    designation: "Sales/Office Coordinator",
    cnic: "42301-4123567-1",
    joining: "01-July-2012",
    entitlement: "01-Feb-2017"
  },
  {
    name: "Asad Mehmood",
    designation: "Office Boy",
    cnic: "42201-5039979-7",
    joining: "24-Jan-2019",
    entitlement: "24-Jan-2020"
  },
  {
    name: "Fareed",
    designation: "RF-Technician",
    cnic: "41306-9365809-3",
    joining: "4-SEP-2020",
    entitlement: "4-SEP-2021"
  }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(mr|mrs|ms|dr|prof|syed|hafiz|mian|ch|chaudhry|malik|khan|shah)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDbName(firstName: string, middleName: string, lastName: string): string {
  const parts = [firstName, middleName, lastName].filter(part => part && part.trim());
  return normalizeNameForMatching(parts.join(' '));
}

function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

function calculateMatchScore(empName: string, csvName: string): number {
  const empParts = empName.split(' ').filter(p => p.length > 1);
  const csvParts = csvName.split(' ').filter(p => p.length > 1);
  
  let score = 0;
  
  // Exact match = 100
  if (empName === csvName) return 100;
  
  // First name match = 40 points
  if (empParts.length > 0 && csvParts.length > 0 && empParts[0] === csvParts[0]) {
    score += 40;
  }
  
  // Last name match = 30 points
  if (empParts.length > 1 && csvParts.length > 1) {
    const empLast = empParts[empParts.length - 1];
    const csvLast = csvParts[csvParts.length - 1];
    if (empLast === csvLast) {
      score += 30;
    }
  }
  
  // Middle name matches = 20 points
  if (empParts.length > 2 && csvParts.length > 2) {
    const empMiddle = empParts.slice(1, -1);
    const csvMiddle = csvParts.slice(1, -1);
    const matchingMiddle = empMiddle.filter(part => csvMiddle.includes(part));
    score += matchingMiddle.length * 10;
  }
  
  // Contains match = 10 points
  if (empName.includes(csvName) || csvName.includes(empName)) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

async function analyzeKhiMatches() {
  console.log("Analyzing KHI employee matches for missing national IDs...\n");
  
  // Get KHI employees missing national IDs
  const khiEmployeesMissing = await db
    .select()
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.department, 'KHI'),
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.nationalId),
          eq(employeeRecords.nationalId, '')
        )
      )
    )
    .orderBy(employeeRecords.employeeCode);

  console.log(`Found ${khiEmployeesMissing.length} KHI employees missing national IDs:\n`);
  
  const allMatches = [];
  
  // Analyze each missing employee
  for (const emp of khiEmployeesMissing) {
    const normalizedEmpName = normalizeDbName(emp.firstName || '', emp.middleName || '', emp.lastName || '');
    
    console.log(`Employee Code: ${emp.employeeCode}`);
    console.log(`DB Name: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim());
    console.log(`Normalized: ${normalizedEmpName}`);
    
    // Calculate match scores for all KHI CSV entries
    const matchScores = khiCsvData.map(csvEmp => {
      const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
      const score = calculateMatchScore(normalizedEmpName, normalizedCsvName);
      
      return {
        empCode: emp.employeeCode,
        dbName: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
        csvName: csvEmp.name,
        cnic: csvEmp.cnic,
        designation: csvEmp.designation,
        joining: csvEmp.joining,
        entitlement: csvEmp.entitlement,
        score: score,
        normalizedEmpName,
        normalizedCsvName
      };
    }).filter(match => match.score > 0) // Only show matches with some score
      .sort((a, b) => b.score - a.score); // Sort by score descending
    
    if (matchScores.length > 0) {
      console.log(`  RANKED MATCHES:`);
      matchScores.forEach((match, index) => {
        const rank = index + 1;
        const confidence = match.score >= 70 ? 'HIGH' : match.score >= 40 ? 'MEDIUM' : 'LOW';
        console.log(`    ${rank}. [${match.score}% - ${confidence}] ${match.csvName}`);
        console.log(`       ${match.designation} | CNIC: ${match.cnic}`);
        console.log(`       Joining: ${match.joining} | Entitlement: ${match.entitlement}`);
        console.log(`       Normalized: ${match.normalizedCsvName}`);
        
        // Add to all matches for summary
        allMatches.push({
          ...match,
          rank,
          confidence
        });
      });
    } else {
      console.log(`  ✗ NO MATCHES FOUND`);
    }
    
    console.log('');
  }
  
  // Group matches by confidence level
  const highConfidenceMatches = allMatches.filter(m => m.confidence === 'HIGH');
  const mediumConfidenceMatches = allMatches.filter(m => m.confidence === 'MEDIUM');
  const lowConfidenceMatches = allMatches.filter(m => m.confidence === 'LOW');
  
  console.log('\n=== HIGH CONFIDENCE MATCHES (70%+) ===');
  if (highConfidenceMatches.length > 0) {
    highConfidenceMatches.forEach(match => {
      console.log(`${match.empCode}: ${match.dbName} → ${match.csvName}`);
      console.log(`  Score: ${match.score}% | CNIC: ${match.cnic}`);
      console.log(`  Designation: ${match.designation} | Joining: ${match.joining}\n`);
    });
  } else {
    console.log("No high confidence matches found.\n");
  }
  
  console.log('\n=== MEDIUM CONFIDENCE MATCHES (40-69%) ===');
  if (mediumConfidenceMatches.length > 0) {
    mediumConfidenceMatches.forEach(match => {
      console.log(`${match.empCode}: ${match.dbName} → ${match.csvName}`);
      console.log(`  Score: ${match.score}% | CNIC: ${match.cnic}`);
      console.log(`  Designation: ${match.designation} | Joining: ${match.joining}\n`);
    });
  } else {
    console.log("No medium confidence matches found.\n");
  }
  
  console.log('\n=== LOW CONFIDENCE MATCHES (1-39%) ===');
  if (lowConfidenceMatches.length > 0) {
    lowConfidenceMatches.forEach(match => {
      console.log(`${match.empCode}: ${match.dbName} → ${match.csvName}`);
      console.log(`  Score: ${match.score}% | CNIC: ${match.cnic}`);
      console.log(`  Designation: ${match.designation} | Joining: ${match.joining}\n`);
    });
  } else {
    console.log("No low confidence matches found.\n");
  }
  
  console.log('\n=== KHI ANALYSIS SUMMARY ===');
  console.log(`Total KHI CSV records: ${khiCsvData.length}`);
  console.log(`KHI employees missing national IDs: ${khiEmployeesMissing.length}`);
  console.log(`High confidence matches: ${highConfidenceMatches.length}`);
  console.log(`Medium confidence matches: ${mediumConfidenceMatches.length}`);
  console.log(`Low confidence matches: ${lowConfidenceMatches.length}`);
  console.log(`Total potential matches: ${allMatches.length}`);
  
  return {
    high: highConfidenceMatches,
    medium: mediumConfidenceMatches,
    low: lowConfidenceMatches,
    totalMissing: khiEmployeesMissing.length,
    availableCNICs: khiCsvData.length
  };
}

analyzeKhiMatches().catch(console.error);