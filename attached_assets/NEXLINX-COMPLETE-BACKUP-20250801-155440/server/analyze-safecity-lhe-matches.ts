import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { and, isNull, or, eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

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

async function analyzeSafecityLheMatches() {
  console.log("Analyzing Safecity-LHE employee matches for missing national IDs...\n");
  
  // Read and parse CSV file
  try {
    const csvContent = readFileSync('attached_assets/Safecity-lhe-designations_1752297154298.csv', 'latin1');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Loaded ${records.length} records from Safecity-LHE CSV file\n`);
    
    // Process CSV data
    const safecityData = records.map((record: any) => ({
      name: record['Name of  Employees'] || record['Name of Employees'] || record['Name'],
      designation: record['Designation'],
      department: record['Department'], 
      cnic: record['CNIC'],
      joiningDate: record['DATE OF JOINING']
    })).filter(emp => emp.name && emp.cnic);
    
    console.log(`Valid records with names and CNICs: ${safecityData.length}\n`);
    
    // Get all employees missing national IDs
    const employeesMissingIds = await db
      .select()
      .from(employeeRecords)
      .where(
        and(
          eq(employeeRecords.isActive, true),
          or(
            isNull(employeeRecords.nationalId),
            eq(employeeRecords.nationalId, '')
          )
        )
      )
      .orderBy(employeeRecords.department, employeeRecords.employeeCode);
    
    console.log(`Found ${employeesMissingIds.length} employees missing national IDs across all departments\n`);
    
    const allMatches = [];
    let employeeCounter = 0;
    
    // Analyze each missing employee
    for (const emp of employeesMissingIds) {
      employeeCounter++;
      const normalizedEmpName = normalizeDbName(emp.firstName || '', emp.middleName || '', emp.lastName || '');
      
      console.log(`${employeeCounter}. Employee Code: ${emp.employeeCode} (${emp.department})`);
      console.log(`   DB Name: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim());
      console.log(`   Normalized: ${normalizedEmpName}`);
      
      // Calculate match scores for all CSV entries
      const matchScores = safecityData.map(csvEmp => {
        const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
        const score = calculateMatchScore(normalizedEmpName, normalizedCsvName);
        
        return {
          empCode: emp.employeeCode,
          empDepartment: emp.department,
          dbName: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName || ''}`.trim(),
          csvName: csvEmp.name,
          cnic: csvEmp.cnic,
          designation: csvEmp.designation,
          csvDepartment: csvEmp.department,
          joiningDate: csvEmp.joiningDate,
          score: score,
          normalizedEmpName,
          normalizedCsvName
        };
      }).filter(match => match.score >= 40) // Only show medium+ confidence matches
        .sort((a, b) => b.score - a.score); // Sort by score descending
      
      if (matchScores.length > 0) {
        console.log(`   RANKED MATCHES:`);
        matchScores.forEach((match, index) => {
          const rank = index + 1;
          const confidence = match.score >= 70 ? 'HIGH' : match.score >= 40 ? 'MEDIUM' : 'LOW';
          console.log(`     ${rank}. [${match.score}% - ${confidence}] ${match.csvName}`);
          console.log(`        ${match.designation} (${match.csvDepartment}) | CNIC: ${match.cnic}`);
          console.log(`        Joining: ${match.joiningDate}`);
          
          // Add to all matches for summary
          allMatches.push({
            ...match,
            rank,
            confidence
          });
        });
      } else {
        console.log(`   ✗ NO MATCHES FOUND`);
      }
      
      console.log('');
    }
    
    // Group matches by confidence level
    const highConfidenceMatches = allMatches.filter(m => m.confidence === 'HIGH');
    const mediumConfidenceMatches = allMatches.filter(m => m.confidence === 'MEDIUM');
    
    console.log('\n=== HIGH CONFIDENCE MATCHES (70%+) ===');
    if (highConfidenceMatches.length > 0) {
      highConfidenceMatches.forEach(match => {
        console.log(`${match.empCode} (${match.empDepartment}): ${match.dbName} → ${match.csvName}`);
        console.log(`  Score: ${match.score}% | CNIC: ${match.cnic}`);
        console.log(`  Designation: ${match.designation} | CSV Dept: ${match.csvDepartment}`);
        console.log(`  Joining: ${match.joiningDate}\n`);
      });
    } else {
      console.log("No high confidence matches found.\n");
    }
    
    console.log('\n=== MEDIUM CONFIDENCE MATCHES (40-69%) ===');
    if (mediumConfidenceMatches.length > 0) {
      mediumConfidenceMatches.forEach(match => {
        console.log(`${match.empCode} (${match.empDepartment}): ${match.dbName} → ${match.csvName}`);
        console.log(`  Score: ${match.score}% | CNIC: ${match.cnic}`);
        console.log(`  Designation: ${match.designation} | CSV Dept: ${match.csvDepartment}`);
        console.log(`  Joining: ${match.joiningDate}\n`);
      });
    } else {
      console.log("No medium confidence matches found.\n");
    }
    
    // Department breakdown
    const departmentBreakdown = {};
    employeesMissingIds.forEach(emp => {
      if (!departmentBreakdown[emp.department]) {
        departmentBreakdown[emp.department] = 0;
      }
      departmentBreakdown[emp.department]++;
    });
    
    console.log('\n=== DEPARTMENT BREAKDOWN (Missing National IDs) ===');
    Object.entries(departmentBreakdown)
      .sort((a, b) => b[1] - a[1])
      .forEach(([dept, count]) => {
        console.log(`${dept}: ${count} employees`);
      });
    
    console.log('\n=== SAFECITY-LHE ANALYSIS SUMMARY ===');
    console.log(`Total Safecity-LHE CSV records: ${safecityData.length}`);
    console.log(`Total employees missing national IDs: ${employeesMissingIds.length}`);
    console.log(`High confidence matches: ${highConfidenceMatches.length}`);
    console.log(`Medium confidence matches: ${mediumConfidenceMatches.length}`);
    console.log(`Total potential matches: ${allMatches.length}`);
    
    // Show which CNICs are available for matching
    const availableCNICs = safecityData.map(emp => emp.cnic).filter(cnic => cnic);
    console.log(`Available CNICs for matching: ${availableCNICs.length}`);
    
    return {
      high: highConfidenceMatches,
      medium: mediumConfidenceMatches,
      departmentBreakdown,
      totalMissing: employeesMissingIds.length,
      availableCNICs: availableCNICs.length
    };
    
  } catch (error) {
    console.error("Error reading CSV file:", error);
    return null;
  }
}

analyzeSafecityLheMatches().catch(console.error);