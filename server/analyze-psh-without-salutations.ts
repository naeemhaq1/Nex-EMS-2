import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, and, isNull, or } from "drizzle-orm";

// PSH CSV data from the file (with salutations removed for matching)
const pshCsvData = [
  { name: "Ishtiaq Ahmed", designation: "Ass. Manager Accounts", cnic: "17101-2437171-5", joining: "01-July-2012" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5", joining: "01-July-2012" },
  { name: "Zahid Hussain", designation: "Office Incharge-Abbotabad", cnic: "13101-0794417-5", joining: "01-July-2012" },
  { name: "Waqas Ahmed", designation: "Ass. Admin.", cnic: "17301-1229911-7", joining: "01-July-2012" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3", joining: "01-July-2012" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1", joining: "01-July-2012" },
  { name: "Naseer Anwar", designation: "Sales Executive-Haripur Part Time", cnic: "13302-0445027-9", joining: "01-July-2012" },
  { name: "Atiq Ur Rehman", designation: "Riggar", cnic: "", joining: "01-July-2024" },
  { name: "Abid Ali", designation: "C S Officer", cnic: "13101-2394113-3", joining: "16-Dec-2020" },
  { name: "Faiz Malik", designation: "C S Officer- Peshawar", cnic: "", joining: "15-Oct-2021" },
  { name: "Syed Fahad Ali Shah", designation: "C S Officer- Peshawar", cnic: "17301-3859714-1", joining: "10-Jan-2022" },
  { name: "Sajjad", designation: "Security Guard", cnic: "17301-2925355-9", joining: "01-OCT-2022" },
  { name: "Raheel Pervez Sethi", designation: "C S Officer- Peshawar", cnic: "17301-3933105-7", joining: "01-Jan-2022" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager PSH", cnic: "17301-1562836-3", joining: "07-February-2022" },
  { name: "Asim Shahzad", designation: "C S Officer- Peshawar", cnic: "17301-1355079-7", joining: "15-Jan-2022" },
  { name: "Muhammad Umer", designation: "Office Boy", cnic: "17301-7331514-3", joining: "01-MAY-2023" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\b(mr|mrs|ms|dr|prof|syed|hafiz|mian|ch|chaudhry|malik|khan|shah)\b/g, '') // Remove common titles/prefixes
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDbName(firstName: string, middleName: string, lastName: string): string {
  const parts = [firstName, middleName, lastName].filter(part => part && part.trim());
  return normalizeNameForMatching(parts.join(' '));
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

async function analyzePshWithoutSalutations() {
  console.log("Analyzing PSH employees without salutations for better matching...\n");
  
  // Get PSH employees missing national IDs
  const pshEmployeesMissing = await db
    .select()
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.department, 'PSH'),
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.nationalId),
          eq(employeeRecords.nationalId, '')
        )
      )
    )
    .orderBy(employeeRecords.employeeCode);

  console.log(`Found ${pshEmployeesMissing.length} PSH employees missing national IDs:\n`);
  
  const allMatches = [];
  
  // Analyze each missing employee
  for (const emp of pshEmployeesMissing) {
    const normalizedEmpName = normalizeDbName(emp.firstName || '', emp.middleName || '', emp.lastName || '');
    
    console.log(`Employee Code: ${emp.employeeCode}`);
    console.log(`DB Name: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim());
    console.log(`Normalized: ${normalizedEmpName}`);
    
    // Calculate match scores for all CSV entries
    const matchScores = pshCsvData.map(csvEmp => {
      const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
      const score = calculateMatchScore(normalizedEmpName, normalizedCsvName);
      
      return {
        empCode: emp.employeeCode,
        dbName: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
        csvName: csvEmp.name,
        cnic: csvEmp.cnic,
        designation: csvEmp.designation,
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
        console.log(`    ${rank}. [${match.score}% - ${confidence}] ${match.csvName} (${match.designation})`);
        console.log(`       CNIC: ${match.cnic || 'MISSING'}`);
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
  const highConfidenceMatches = allMatches.filter(m => m.confidence === 'HIGH' && m.cnic);
  const mediumConfidenceMatches = allMatches.filter(m => m.confidence === 'MEDIUM' && m.cnic);
  const lowConfidenceMatches = allMatches.filter(m => m.confidence === 'LOW' && m.cnic);
  
  console.log('\n=== HIGH CONFIDENCE MATCHES (70%+) ===');
  highConfidenceMatches.forEach(match => {
    console.log(`${match.rank}. ${match.empCode}: ${match.dbName} → ${match.csvName}`);
    console.log(`   Score: ${match.score}% | CNIC: ${match.cnic} | ${match.designation}\n`);
  });
  
  console.log('\n=== MEDIUM CONFIDENCE MATCHES (40-69%) ===');
  mediumConfidenceMatches.forEach(match => {
    console.log(`${match.rank}. ${match.empCode}: ${match.dbName} → ${match.csvName}`);
    console.log(`   Score: ${match.score}% | CNIC: ${match.cnic} | ${match.designation}\n`);
  });
  
  console.log('\n=== LOW CONFIDENCE MATCHES (1-39%) ===');
  lowConfidenceMatches.forEach(match => {
    console.log(`${match.rank}. ${match.empCode}: ${match.dbName} → ${match.csvName}`);
    console.log(`   Score: ${match.score}% | CNIC: ${match.cnic} | ${match.designation}\n`);
  });
  
  console.log('\n=== PSH Analysis Summary ===');
  console.log(`Total PSH employees in CSV: ${pshCsvData.length}`);
  console.log(`PSH employees missing national IDs: ${pshEmployeesMissing.length}`);
  console.log(`CSV records with CNICs: ${pshCsvData.filter(emp => emp.cnic).length}`);
  console.log(`High confidence matches: ${highConfidenceMatches.length}`);
  console.log(`Medium confidence matches: ${mediumConfidenceMatches.length}`);
  console.log(`Low confidence matches: ${lowConfidenceMatches.length}`);
  console.log(`Total potential matches: ${allMatches.filter(m => m.cnic).length}`);
  
  return {
    high: highConfidenceMatches,
    medium: mediumConfidenceMatches,
    low: lowConfidenceMatches
  };
}

analyzePshWithoutSalutations().catch(console.error);