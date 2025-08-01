import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

// Normalize name for matching by removing titles, extra spaces, and converting to lowercase
function normalizeNameForMatching(name: string): string {
  if (!name) return '';
  
  // Remove common titles and prefixes
  const cleanName = name
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Hafiz|Syed|Muhammad|Mohammad|Shah|Khan)\s+/gi, '')
    .replace(/\s+(Khan|Shah|Malik|Chaudhry|Qureshi|Butt|Ahmed|Ali|Hussain|Hassan)$/gi, '')
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .toLowerCase();
  
  return cleanName;
}

// Calculate similarity score between two names
function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeNameForMatching(name1);
  const norm2 = normalizeNameForMatching(name2);
  
  if (norm1 === norm2) return 100;
  
  // Split names into words
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  // Calculate word overlap
  let matchingWords = 0;
  const totalWords = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matchingWords++;
    }
  }
  
  const similarity = (matchingWords / totalWords) * 100;
  
  // Boost score for exact substring matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.min(similarity + 20, 100);
  }
  
  return similarity;
}

async function analyzeNameMatches() {
  console.log("Analyzing name-based matches for employees without designations...\n");
  
  try {
    // Get employees without designations
    const employeesWithoutDesignations = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true))
      .where(isNull(employeeRecords.designation));
    
    console.log(`Found ${employeesWithoutDesignations.length} employees without designations\n`);
    
    const csvFiles = [
      { file: 'attached_assets/Isb-designations_1752294859163.csv', location: 'ISB' },
      { file: 'attached_assets/Lhe-designations_1752288756490.csv', location: 'LHE' },
      { file: 'attached_assets/Lhe-designations_1752292820699.csv', location: 'LHE-Updated' },
      { file: 'attached_assets/Psh-designations_1752294499989.csv', location: 'PSH' },
      { file: 'attached_assets/Safecity-lhe-designations_1752297154298.csv', location: 'LHE-Safecity' }
    ];
    
    const allCsvRecords = [];
    
    // Load all CSV records
    for (const csvInfo of csvFiles) {
      try {
        const csvContent = readFileSync(csvInfo.file, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        
        for (const record of records) {
          const name = record['Name of  Employees'] || record['Name'] || record['NAME OF EMPLOYEES'] || record['name'] || '';
          const designation = record['Designation'] || record['DESIGNATION'] || record['designation'] || '';
          const cnic = record.CNIC || record.cnic || record['CNIC '] || record['cnic '] || '';
          
          if (name && designation) {
            allCsvRecords.push({
              name: name.trim(),
              designation: designation.trim(),
              cnic: cnic.trim(),
              source: csvInfo.location
            });
          }
        }
      } catch (error) {
        console.error(`Error loading ${csvInfo.file}:`, error.message);
      }
    }
    
    console.log(`Loaded ${allCsvRecords.length} records from CSV files\n`);
    
    const potentialMatches = [];
    
    // Analyze each employee without designation
    for (const employee of employeesWithoutDesignations) {
      const employeeFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
      
      // Find potential matches based on name similarity
      const nameMatches = [];
      
      for (const csvRecord of allCsvRecords) {
        const similarity = calculateNameSimilarity(employeeFullName, csvRecord.name);
        
        if (similarity >= 60) { // Only consider matches with 60%+ similarity
          nameMatches.push({
            csvName: csvRecord.name,
            designation: csvRecord.designation,
            cnic: csvRecord.cnic,
            source: csvRecord.source,
            similarity: Math.round(similarity)
          });
        }
      }
      
      // Sort by similarity and take top matches
      nameMatches.sort((a, b) => b.similarity - a.similarity);
      
      if (nameMatches.length > 0) {
        potentialMatches.push({
          employeeCode: employee.employeeCode,
          employeeName: employeeFullName,
          department: employee.department,
          pop: employee.pop,
          employeeCnic: employee.nationalId || 'No CNIC',
          matches: nameMatches.slice(0, 3) // Top 3 matches
        });
      }
    }
    
    // Display results
    console.log(`\n=== POTENTIAL NAME MATCHES ===`);
    console.log(`Found ${potentialMatches.length} employees with potential name matches\n`);
    
    // Group by PoP for better organization
    const matchesByPop = {};
    potentialMatches.forEach(match => {
      if (!matchesByPop[match.pop]) {
        matchesByPop[match.pop] = [];
      }
      matchesByPop[match.pop].push(match);
    });
    
    for (const [pop, matches] of Object.entries(matchesByPop)) {
      console.log(`\n=== ${pop} (${matches.length} potential matches) ===`);
      
      for (const match of matches) {
        console.log(`\n📋 ${match.employeeCode}: ${match.employeeName}`);
        console.log(`   Department: ${match.department}`);
        console.log(`   Employee CNIC: ${match.employeeCnic}`);
        console.log(`   Potential Matches:`);
        
        for (let i = 0; i < match.matches.length; i++) {
          const csvMatch = match.matches[i];
          console.log(`   ${i + 1}. ${csvMatch.csvName} (${csvMatch.similarity}% match)`);
          console.log(`      Designation: ${csvMatch.designation}`);
          console.log(`      CSV CNIC: ${csvMatch.cnic || 'No CNIC'}`);
          console.log(`      Source: ${csvMatch.source}`);
        }
      }
    }
    
    // Summary statistics
    console.log(`\n=== SUMMARY STATISTICS ===`);
    
    const highConfidenceMatches = potentialMatches.filter(match => match.matches[0].similarity >= 85);
    const mediumConfidenceMatches = potentialMatches.filter(match => match.matches[0].similarity >= 70 && match.matches[0].similarity < 85);
    const lowConfidenceMatches = potentialMatches.filter(match => match.matches[0].similarity < 70);
    
    console.log(`High confidence matches (≥85%): ${highConfidenceMatches.length}`);
    console.log(`Medium confidence matches (70-84%): ${mediumConfidenceMatches.length}`);
    console.log(`Low confidence matches (60-69%): ${lowConfidenceMatches.length}`);
    console.log(`No name matches found: ${employeesWithoutDesignations.length - potentialMatches.length}`);
    
    // Show designation distribution of potential matches
    console.log(`\n=== DESIGNATION DISTRIBUTION IN MATCHES ===`);
    const designationCounts = {};
    potentialMatches.forEach(match => {
      match.matches.forEach(csvMatch => {
        if (!designationCounts[csvMatch.designation]) {
          designationCounts[csvMatch.designation] = 0;
        }
        designationCounts[csvMatch.designation]++;
      });
    });
    
    Object.entries(designationCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([designation, count]) => {
        console.log(`${designation}: ${count} potential matches`);
      });
    
    // Show departments with most potential matches
    console.log(`\n=== DEPARTMENTS WITH MOST POTENTIAL MATCHES ===`);
    const departmentCounts = {};
    potentialMatches.forEach(match => {
      if (!departmentCounts[match.department]) {
        departmentCounts[match.department] = 0;
      }
      departmentCounts[match.department]++;
    });
    
    Object.entries(departmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([department, count]) => {
        console.log(`${department}: ${count} employees with potential matches`);
      });
    
  } catch (error) {
    console.error("Error analyzing name matches:", error);
  }
}

analyzeNameMatches().catch(console.error);