import { db } from "./db";
import { employeeRecords } from "../shared/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { resolve } from "path";

// Function to normalize names for matching
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/mr\.|mrs\.|ms\./g, '').trim();
}

// Function to normalize CNIC (remove dashes)
function normalizeCNIC(cnic: string): string {
  return cnic.replace(/-/g, '');
}

async function updateIsbNationalIds() {
  console.log("Starting ISB national ID update process...");
  
  try {
    // Read the ISB CSV file
    const csvPath = resolve(process.cwd(), 'attached_assets/Isb-designations_1752294859163.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} records in ISB CSV`);
    
    // Get all ISB employees from database
    const isbEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.department, 'ISB'));
    
    console.log(`Found ${isbEmployees.length} ISB employees in database`);
    
    let matchedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each record from CSV
    for (const record of records) {
      const csvName = record['Name of  Employees'];
      const csvCnic = record['CNIC'];
      
      // Skip if no name or CNIC
      if (!csvName || !csvCnic) {
        continue;
      }
      
      const normalizedCsvName = normalizeName(csvName);
      const normalizedCnic = normalizeCNIC(csvCnic);
      
      console.log(`\nProcessing: ${csvName} (CNIC: ${csvCnic})`);
      
      // Try to find matching employee in database
      let matchedEmployee = null;
      
      for (const emp of isbEmployees) {
        // Build full name from database record
        const fullName = [emp.salutation, emp.firstName, emp.middleName, emp.lastName]
          .filter(Boolean)
          .join(' ');
        
        const normalizedDbName = normalizeName(fullName);
        
        // Check for exact match
        if (normalizedDbName === normalizedCsvName) {
          matchedEmployee = emp;
          break;
        }
        
        // Check if CSV name matches first+last name pattern
        const firstLastName = [emp.firstName, emp.lastName].filter(Boolean).join(' ');
        if (normalizeName(firstLastName) === normalizedCsvName) {
          matchedEmployee = emp;
          break;
        }
        
        // Check for partial matches (first name + last name)
        if (emp.firstName && emp.lastName) {
          const dbFirstLast = normalizeName(`${emp.firstName} ${emp.lastName}`);
          if (dbFirstLast === normalizedCsvName) {
            matchedEmployee = emp;
            break;
          }
        }
      }
      
      if (matchedEmployee) {
        matchedCount++;
        console.log(`  ✓ Matched with: ${matchedEmployee.employeeCode} - ${matchedEmployee.firstName} ${matchedEmployee.lastName}`);
        
        // Check if employee already has national ID
        if (matchedEmployee.nationalId) {
          console.log(`  ⚠ Employee already has national ID: ${matchedEmployee.nationalId} - SKIPPING`);
          skippedCount++;
          continue;
        }
        
        // Update the national ID
        await db
          .update(employeeRecords)
          .set({
            nationalId: normalizedCnic,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.id, matchedEmployee.id));
        
        console.log(`  ✓ Updated national ID to: ${normalizedCnic}`);
        updatedCount++;
        
      } else {
        console.log(`  ✗ No match found for: ${csvName}`);
      }
    }
    
    console.log(`\n=== ISB National ID Update Summary ===`);
    console.log(`Total CSV records processed: ${records.length}`);
    console.log(`Matched employees: ${matchedCount}`);
    console.log(`Updated with national IDs: ${updatedCount}`);
    console.log(`Skipped (already had national ID): ${skippedCount}`);
    console.log(`No matches found: ${records.length - matchedCount}`);
    
  } catch (error) {
    console.error("Error during ISB national ID update:", error);
  }
}

// Run the update
updateIsbNationalIds().catch(console.error);