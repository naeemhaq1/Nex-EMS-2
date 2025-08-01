import { db } from "../db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

interface SalutationStandardizationResult {
  totalProcessed: number;
  recordsModified: number;
  standardSalutations: string[];
  nonStandardMovedToFirstName: string[];
  modifiedEmployees: Array<{
    empCode: string;
    originalFirstName: string;
    originalMiddleName: string;
    originalSalutation: string;
    newFirstName: string;
    newMiddleName: string;
    newSalutation: string;
    action: string;
  }>;
}

/**
 * Salutation Standardization Service
 * Keeps only standard salutations and moves non-standard ones to first names
 */
async function standardizeSalutations(): Promise<SalutationStandardizationResult> {
  const result: SalutationStandardizationResult = {
    totalProcessed: 0,
    recordsModified: 0,
    standardSalutations: [],
    nonStandardMovedToFirstName: [],
    modifiedEmployees: []
  };

  // Standard salutations that should remain in the salutation field
  const standardSalutations = [
    'Mr.', 'Mr', 'Mrs.', 'Mrs', 'Ms.', 'Ms',
    'Dr.', 'Dr', 'Prof.', 'Prof', 'Sir', 'Madam'
  ];

  // Non-standard salutations that should be moved to first names
  const nonStandardSalutations = [
    'Syed', 'Muhammad', 'Chaudhry', 'Chaudry', 'Ch.', 'Ch',
    'Mirza', 'Sardar', 'Malik', 'Sheikh', 'Sh.', 'Sh',
    'Haji', 'Hafiz', 'Mian', 'Khan'
  ];

  try {
    console.log("🔧 SALUTATION STANDARDIZATION - MOVING NON-STANDARD TO FIRST NAMES");
    console.log("=" .repeat(80));
    
    // Get all employee records
    const employees = await db
      .select({
        id: employeeRecords.id,
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        middleName: employeeRecords.middleName,
        lastName: employeeRecords.lastName,
        salutation: employeeRecords.salutation
      })
      .from(employeeRecords);

    result.totalProcessed = employees.length;
    console.log(`📊 Processing ${result.totalProcessed} employee records`);

    // Process each employee
    for (const employee of employees) {
      let modified = false;
      let currentSalutation = employee.salutation?.trim() || '';
      let currentFirstName = employee.firstName?.trim() || '';
      let currentMiddleName = employee.middleName?.trim() || '';
      
      let newSalutation = currentSalutation;
      let newFirstName = currentFirstName;
      let newMiddleName = currentMiddleName;
      let action = '';

      // Check if current salutation is non-standard
      if (currentSalutation) {
        const isStandard = standardSalutations.some(std => 
          std.toLowerCase() === currentSalutation.toLowerCase()
        );
        
        const isNonStandard = nonStandardSalutations.some(nonstd => 
          nonstd.toLowerCase() === currentSalutation.toLowerCase()
        );

        if (!isStandard && isNonStandard) {
          // Move non-standard salutation to first name
          // Shift existing first name to middle name
          newMiddleName = currentFirstName ? 
            (currentMiddleName ? `${currentFirstName} ${currentMiddleName}` : currentFirstName) : 
            currentMiddleName;
          
          newFirstName = currentSalutation;
          newSalutation = null; // Clear the salutation field
          modified = true;
          action = `Moved "${currentSalutation}" to first name`;
          
          if (!result.nonStandardMovedToFirstName.includes(currentSalutation)) {
            result.nonStandardMovedToFirstName.push(currentSalutation);
          }
        } else if (isStandard) {
          // Keep standard salutations
          if (!result.standardSalutations.includes(currentSalutation)) {
            result.standardSalutations.push(currentSalutation);
          }
        }
      }

      // Also check first name for non-standard salutations
      if (currentFirstName) {
        const firstNameParts = currentFirstName.split(' ');
        const firstPart = firstNameParts[0];
        
        const isNonStandardInFirstName = nonStandardSalutations.some(nonstd => 
          nonstd.toLowerCase() === firstPart.toLowerCase()
        );

        if (isNonStandardInFirstName && !currentSalutation) {
          // Extract non-standard salutation from first name and move it to first name properly
          const remainingFirstName = firstNameParts.slice(1).join(' ');
          
          if (remainingFirstName) {
            newMiddleName = remainingFirstName ? 
              (currentMiddleName ? `${remainingFirstName} ${currentMiddleName}` : remainingFirstName) : 
              currentMiddleName;
            
            newFirstName = firstPart;
            modified = true;
            action = `Extracted "${firstPart}" from first name and reorganized`;
            
            if (!result.nonStandardMovedToFirstName.includes(firstPart)) {
              result.nonStandardMovedToFirstName.push(firstPart);
            }
          }
        }
      }

      // Update database if changes were made
      if (modified) {
        await db
          .update(employeeRecords)
          .set({
            firstName: newFirstName,
            middleName: newMiddleName || null,
            salutation: newSalutation,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, employee.id));

        result.modifiedEmployees.push({
          empCode: employee.employeeCode,
          originalFirstName: currentFirstName,
          originalMiddleName: currentMiddleName,
          originalSalutation: currentSalutation,
          newFirstName,
          newMiddleName,
          newSalutation: newSalutation || '',
          action
        });

        result.recordsModified++;
        
        console.log(`✅ ${employee.employeeCode}: ${action}`);
        console.log(`   Original: salutation="${currentSalutation}", firstName="${currentFirstName}", middleName="${currentMiddleName}"`);
        console.log(`   New: salutation="${newSalutation || ''}", firstName="${newFirstName}", middleName="${newMiddleName || ''}"`);
      }
    }

    console.log("\n📊 SALUTATION STANDARDIZATION RESULTS:");
    console.log(`   Total processed: ${result.totalProcessed}`);
    console.log(`   Records modified: ${result.recordsModified}`);
    console.log(`   Standard salutations kept: ${result.standardSalutations.join(', ')}`);
    console.log(`   Non-standard moved to first names: ${result.nonStandardMovedToFirstName.join(', ')}`);

    return result;

  } catch (error) {
    console.error("❌ Salutation standardization failed:", error);
    throw error;
  }
}

/**
 * Export standardization results to CSV
 */
async function exportStandardizationResults(result: SalutationStandardizationResult): Promise<void> {
  const csvData = [
    ['Employee Code', 'Original First Name', 'Original Middle Name', 'Original Salutation', 'New First Name', 'New Middle Name', 'New Salutation', 'Action'],
    ...result.modifiedEmployees.map(mod => [
      mod.empCode,
      mod.originalFirstName,
      mod.originalMiddleName,
      mod.originalSalutation,
      mod.newFirstName,
      mod.newMiddleName,
      mod.newSalutation,
      mod.action
    ])
  ];

  const csvContent = csvData.map(row => row.join(',')).join('\n');
  
  const fs = await import('fs');
  const filename = `salutation-standardization-${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(filename, csvContent);
  
  console.log(`📄 Standardization results exported to: ${filename}`);
}

// Run salutation standardization
standardizeSalutations().then(async (result) => {
  console.log("\n🎉 SALUTATION STANDARDIZATION COMPLETED");
  console.log(`Modified ${result.recordsModified} out of ${result.totalProcessed} employee records`);
  
  // Export results if any changes were made
  if (result.modifiedEmployees.length > 0) {
    await exportStandardizationResults(result);
  }
  
  // Show summary
  if (result.nonStandardMovedToFirstName.length > 0) {
    console.log(`\n📝 Non-standard salutations moved to first names: ${result.nonStandardMovedToFirstName.join(', ')}`);
  }
  
  if (result.standardSalutations.length > 0) {
    console.log(`📝 Standard salutations preserved: ${result.standardSalutations.join(', ')}`);
  }
  
  process.exit(0);
}).catch((error) => {
  console.error("❌ Salutation standardization failed:", error);
  process.exit(1);
});