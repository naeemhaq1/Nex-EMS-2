import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { resolve } from "path";

// Function to normalize strings for comparison
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

// Function to normalize CNIC (remove dashes and spaces)
function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

async function restoreCorrectNationalIds() {
  console.log("Starting restoration of correct national IDs...");
  
  try {
    // Read the CSV file
    const csvPath = resolve(process.cwd(), "attached_assets/Lhe-designations_1752292820699.csv");
    const csvContent = readFileSync(csvPath, "utf-8");
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`CSV file loaded with ${records.length} records`);
    
    // Get all FSD and PSH employees that are missing national IDs
    const missingNationalIds = await db
      .select()
      .from(employeeRecords)
      .where(
        eq(employeeRecords.isActive, true)
      );
    
    console.log(`Found ${missingNationalIds.length} total employees`);
    
    let updatedCount = 0;
    
    // Process each CSV record
    for (const csvRecord of records) {
      if (!csvRecord.Name || !csvRecord.CNIC) {
        continue;
      }
      
      const csvName = normalizeString(csvRecord.Name);
      const csvCnic = normalizeCNIC(csvRecord.CNIC);
      
      if (!csvCnic || csvCnic.length < 13) {
        console.log(`Skipping invalid CNIC: ${csvRecord.CNIC} for ${csvRecord.Name}`);
        continue;
      }
      
      // Find matching employee
      for (const employee of missingNationalIds) {
        const employeeFullName = `${employee.salutation || ''} ${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.trim();
        const normalizedEmployeeName = normalizeString(employeeFullName);
        
        // Check for name match
        if (csvName.includes(normalizedEmployeeName.replace(/^(mr|syed|malik|sh)\s+/, '')) ||
            normalizedEmployeeName.includes(csvName.replace(/^(mr|syed|malik|sh)\s+/, ''))) {
          
          console.log(`MATCH FOUND: "${csvRecord.Name}" -> "${employeeFullName}" (${employee.department})`);
          console.log(`  CNIC: ${csvCnic}`);
          
          // Update the employee record
          await db
            .update(employeeRecords)
            .set({ 
              nationalId: csvCnic,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.employeeCode, employee.employeeCode));
          
          updatedCount++;
          break;
        }
      }
    }
    
    console.log(`\nRestoration completed. Updated ${updatedCount} employee records with correct national IDs.`);
    
  } catch (error) {
    console.error("Error during national ID restoration:", error);
  }
}

// Run the restoration
restoreCorrectNationalIds().catch(console.error);