import { db } from "../db";
import { employeeRecords } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface NameCleaningResult {
  totalProcessed: number;
  namesModified: number;
  salutationsRemoved: string[];
  modifiedEmployees: Array<{
    empCode: string;
    originalName: string;
    cleanedName: string;
    salutationRemoved: string;
  }>;
}

/**
 * Comprehensive Name Cleaning Service
 * Extracts salutations from names into dedicated salutation field
 */
async function extractSalutationsFromNames(): Promise<NameCleaningResult> {
  const result: NameCleaningResult = {
    totalProcessed: 0,
    namesModified: 0,
    salutationsRemoved: [],
    modifiedEmployees: []
  };

  // Common salutations to extract
  const salutations = [
    'Mr.', 'Mr', 'Mrs.', 'Mrs', 'Ms.', 'Ms',
    'Dr.', 'Dr', 'Prof.', 'Prof', 'Sir', 'Madam',
    'Mian', 'Sardar', 'Chaudhry', 'Ch.', 'Ch',
    'Malik', 'Sheikh', 'Syed', 'Haji', 'Hafiz'
  ];

  try {
    console.log("🧹 EMPLOYEE NAME CLEANING - EXTRACTING SALUTATIONS TO FIELD");
    console.log("=" .repeat(70));

    // Get all employee records
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        salutation: employeeRecords.salutation
      })
      .from(employeeRecords);

    result.totalProcessed = employees.length;
    console.log(`📊 Processing ${result.totalProcessed} employee records`);

    for (const employee of employees) {
      let modified = false;
      let originalFirstName = employee.firstName || '';
      let originalLastName = employee.lastName || '';
      let cleanedFirstName = originalFirstName;
      let cleanedLastName = originalLastName;
      let extractedSalutations: string[] = [];
      let currentSalutation = employee.salutation || '';

      // Extract salutation from first name
      for (const salutation of salutations) {
        const regex = new RegExp(`^${salutation}\\s+`, 'i');
        if (regex.test(cleanedFirstName)) {
          const match = cleanedFirstName.match(regex);
          if (match) {
            extractedSalutations.push(match[0].trim());
            cleanedFirstName = cleanedFirstName.replace(regex, '').trim();
            modified = true;
          }
        }
      }

      // Extract salutation from last name
      for (const salutation of salutations) {
        const regex = new RegExp(`^${salutation}\\s+`, 'i');
        if (regex.test(cleanedLastName)) {
          const match = cleanedLastName.match(regex);
          if (match) {
            extractedSalutations.push(match[0].trim());
            cleanedLastName = cleanedLastName.replace(regex, '').trim();
            modified = true;
          }
        }
      }

      // Update database if names were modified
      if (modified) {
        const newSalutation = extractedSalutations.length > 0 ? extractedSalutations[0] : currentSalutation;
        
        await db
          .update(employeeRecords)
          .set({
            firstName: cleanedFirstName,
            lastName: cleanedLastName,
            salutation: newSalutation,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, employee.id));

        result.modifiedEmployees.push({
          empCode: employee.employeeCode,
          originalName: `${originalFirstName} ${originalLastName}`.trim(),
          cleanedName: `${cleanedFirstName} ${cleanedLastName}`.trim(),
          salutationRemoved: extractedSalutations.join(', ')
        });

        result.namesModified++;
        extractedSalutations.forEach(sal => {
          if (!result.salutationsRemoved.includes(sal)) {
            result.salutationsRemoved.push(sal);
          }
        });

        console.log(`✅ ${employee.employeeCode}: "${originalFirstName} ${originalLastName}" → "${cleanedFirstName} ${cleanedLastName}"`);
      }
    }

    console.log("\n📊 NAME CLEANING RESULTS:");
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Names modified: ${result.namesModified}`);
    console.log(`   Salutations extracted: ${result.salutationsRemoved.join(', ')}`);

    // Show detailed modifications
    if (result.modifiedEmployees.length > 0) {
      console.log(`\n🧹 DETAILED MODIFICATIONS (${Math.min(result.modifiedEmployees.length, 20)}):`);
      result.modifiedEmployees.slice(0, 20).forEach(mod => {
        console.log(`   ${mod.empCode}: "${mod.originalName}" → "${mod.cleanedName}" (extracted: ${mod.salutationRemoved})`);
      });
    }

    return result;

  } catch (error) {
    console.error("❌ Name cleaning failed:", error);
    throw error;
  }
}

/**
 * Export cleaning results to CSV
 */
async function exportCleaningResults(result: NameCleaningResult): Promise<void> {
  const csvData = [
    ['Employee Code', 'Original Name', 'Cleaned Name', 'Salutation Extracted'],
    ...result.modifiedEmployees.map(mod => [
      mod.empCode,
      mod.originalName,
      mod.cleanedName,
      mod.salutationRemoved
    ])
  ];

  const csvContent = csvData.map(row => row.join(',')).join('\n');
  
  // Write to file
  const fs = await import('fs');
  const filename = `name-cleaning-${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csvContent);
  
  console.log(`📄 Cleaning results exported to: ${filename}`);
}

// Run name cleaning
extractSalutationsFromNames().then(async (result) => {
  console.log("\n🎉 SALUTATION EXTRACTION COMPLETED");
  console.log(`Modified ${result.namesModified} out of ${result.totalProcessed} employee names`);
  
  // Export results
  if (result.modifiedEmployees.length > 0) {
    await exportCleaningResults(result);
  }
  
  process.exit(0);
}).catch((error) => {
  console.error("❌ Salutation extraction failed:", error);
  process.exit(1);
});