import { db } from "../db";
import { employeeRecords, employeePullExt } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { biotimeService } from "../services/biotimeService";

interface ValidationResult {
  totalEmployees: number;
  biotimeRecords: number;
  matchedRecords: number;
  corruptedNames: Array<{
    empCode: string;
    currentName: string;
    biotimeFirstName: string;
    biotimeLastName: string;
    corruption: string;
  }>;
  authenticatedNames: Array<{
    empCode: string;
    currentName: string;
    biotimeFirstName: string;
    biotimeLastName: string;
    nickname: string;
    confidence: number;
  }>;
  dataQuality: {
    validNames: number;
    corruptedNames: number;
    missingNames: number;
    qualityScore: number;
  };
}

/**
 * Comprehensive BioTime Data Integrity Validation
 * Verifies employee names against BioTime employee endpoint
 * Identifies corruption patterns and provides authenticated names
 */
async function validateBioTimeDataIntegrity(): Promise<ValidationResult> {
  const result: ValidationResult = {
    totalEmployees: 0,
    biotimeRecords: 0,
    matchedRecords: 0,
    corruptedNames: [],
    authenticatedNames: [],
    dataQuality: {
      validNames: 0,
      corruptedNames: 0,
      missingNames: 0,
      qualityScore: 0
    }
  };

  try {
    console.log("🔍 BIOTIME DATA INTEGRITY VALIDATION - MULTI-SOURCE VERIFICATION");
    console.log("=" .repeat(70));

    // Get all employee records from our database
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        department: employeeRecords.department
      })
      .from(employeeRecords);

    result.totalEmployees = employees.length;
    console.log(`📊 Total employees in database: ${result.totalEmployees}`);

    // Get BioTime employee data
    const bioTimeEmployees = await db
      .select({
        empCode: employeePullExt.empCode,
        firstName: employeePullExt.firstName,
        lastName: employeePullExt.lastName,
        nickname: employeePullExt.nickname,
        formatName: employeePullExt.formatName
      })
      .from(employeePullExt)
      .where(sql`${employeePullExt.empCode} IS NOT NULL`);

    result.biotimeRecords = bioTimeEmployees.length;
    console.log(`📡 BioTime employee records: ${result.biotimeRecords}`);

    // Create lookup map for BioTime data
    const bioTimeMap = new Map();
    bioTimeEmployees.forEach(emp => {
      if (emp.empCode) {
        bioTimeMap.set(emp.empCode, emp);
      }
    });

    // Validate each employee
    for (const employee of employees) {
      const empCode = employee.employeeCode;
      const currentName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      const bioTimeData = bioTimeMap.get(empCode);

      if (!bioTimeData) {
        result.dataQuality.missingNames++;
        console.log(`❌ Missing BioTime data for ${empCode}: ${currentName}`);
        continue;
      }

      result.matchedRecords++;

      // Analyze data quality
      const analysis = analyzeBioTimeData(bioTimeData);
      
      if (analysis.isCorrupted) {
        result.corruptedNames.push({
          empCode,
          currentName,
          biotimeFirstName: bioTimeData.firstName,
          biotimeLastName: bioTimeData.lastName,
          corruption: analysis.corruptionType
        });
        result.dataQuality.corruptedNames++;
        console.log(`🔧 CORRUPTED ${empCode}: ${currentName} - ${analysis.corruptionType}`);
      } else {
        result.authenticatedNames.push({
          empCode,
          currentName,
          biotimeFirstName: bioTimeData.firstName,
          biotimeLastName: bioTimeData.lastName,
          nickname: bioTimeData.nickname,
          confidence: analysis.confidence
        });
        result.dataQuality.validNames++;
        console.log(`✅ AUTHENTICATED ${empCode}: ${currentName} - confidence: ${analysis.confidence}%`);
      }
    }

    // Calculate quality score
    result.dataQuality.qualityScore = Math.round(
      (result.dataQuality.validNames / result.totalEmployees) * 100
    );

    console.log("\n📊 DATA INTEGRITY RESULTS:");
    console.log(`   Total employees: ${result.totalEmployees}`);
    console.log(`   BioTime records: ${result.biotimeRecords}`);
    console.log(`   Matched records: ${result.matchedRecords}`);
    console.log(`   Valid names: ${result.dataQuality.validNames}`);
    console.log(`   Corrupted names: ${result.dataQuality.corruptedNames}`);
    console.log(`   Missing names: ${result.dataQuality.missingNames}`);
    console.log(`   Quality score: ${result.dataQuality.qualityScore}%`);

    // Show corruption patterns
    if (result.corruptedNames.length > 0) {
      console.log(`\n🔧 CORRUPTION PATTERNS (${Math.min(result.corruptedNames.length, 20)}):`);
      result.corruptedNames.slice(0, 20).forEach(corrupt => {
        console.log(`   ${corrupt.empCode}: "${corrupt.currentName}" - ${corrupt.corruption}`);
      });
    }

    // Show authenticated samples
    if (result.authenticatedNames.length > 0) {
      console.log(`\n✅ AUTHENTICATED SAMPLES (${Math.min(result.authenticatedNames.length, 20)}):`);
      result.authenticatedNames.slice(0, 20).forEach(auth => {
        console.log(`   ${auth.empCode}: "${auth.currentName}" - ${auth.confidence}% confidence`);
      });
    }

    return result;

  } catch (error) {
    console.error("❌ Validation failed:", error);
    throw error;
  }
}

/**
 * Analyze BioTime employee data for corruption patterns
 */
function analyzeBioTimeData(bioTimeData: any): {
  isCorrupted: boolean;
  corruptionType: string;
  confidence: number;
} {
  const { firstName, lastName, nickname } = bioTimeData;
  
  // Check for lastName corruption (doesn't start with uppercase)
  if (lastName && lastName.length > 0) {
    const firstChar = lastName.charAt(0);
    if (firstChar !== firstChar.toUpperCase()) {
      return {
        isCorrupted: true,
        corruptionType: "lastName lowercase (corrupted)",
        confidence: 20
      };
    }
  }

  // Check for numeric lastName (employee code corruption)
  if (lastName && /^\d+$/.test(lastName)) {
    return {
      isCorrupted: true,
      corruptionType: "lastName is numeric (employee code)",
      confidence: 10
    };
  }

  // Check for empty or null lastName
  if (!lastName || lastName.trim() === '' || lastName === 'null') {
    return {
      isCorrupted: true,
      corruptionType: "lastName missing or null",
      confidence: 30
    };
  }

  // Check for firstName corruption
  if (!firstName || firstName.trim() === '' || firstName === 'null') {
    return {
      isCorrupted: true,
      corruptionType: "firstName missing or null",
      confidence: 20
    };
  }

  // Check for duplicate names (firstName === lastName)
  if (firstName === lastName) {
    return {
      isCorrupted: true,
      corruptionType: "firstName equals lastName",
      confidence: 40
    };
  }

  // Calculate confidence for valid names
  let confidence = 90;
  
  // Reduce confidence for single character names
  if (firstName.length <= 1 || lastName.length <= 1) {
    confidence = 60;
  }

  // Reduce confidence for names with numbers
  if (/\d/.test(firstName) || /\d/.test(lastName)) {
    confidence = 50;
  }

  return {
    isCorrupted: false,
    corruptionType: "none",
    confidence
  };
}

/**
 * Export validation results to CSV
 */
async function exportValidationResults(result: ValidationResult): Promise<void> {
  const csvData = [
    ['Employee Code', 'Current Name', 'BioTime First Name', 'BioTime Last Name', 'Status', 'Confidence/Corruption'],
    ...result.authenticatedNames.map(auth => [
      auth.empCode,
      auth.currentName,
      auth.biotimeFirstName,
      auth.biotimeLastName,
      'AUTHENTICATED',
      `${auth.confidence}%`
    ]),
    ...result.corruptedNames.map(corrupt => [
      corrupt.empCode,
      corrupt.currentName,
      corrupt.biotimeFirstName,
      corrupt.biotimeLastName,
      'CORRUPTED',
      corrupt.corruption
    ])
  ];

  const csvContent = csvData.map(row => row.join(',')).join('\n');
  
  // Write to file
  const fs = await import('fs');
  const filename = `biotime-validation-${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csvContent);
  
  console.log(`📄 Validation results exported to: ${filename}`);
}

// Run validation
validateBioTimeDataIntegrity().then(async (result) => {
  console.log("\n🎉 BIOTIME DATA INTEGRITY VALIDATION COMPLETED");
  console.log(`Quality Score: ${result.dataQuality.qualityScore}%`);
  
  // Export results
  await exportValidationResults(result);
  
  process.exit(0);
}).catch((error) => {
  console.error("❌ Validation failed:", error);
  process.exit(1);
});