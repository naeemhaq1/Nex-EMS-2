import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface CSVRecord {
  name: string;
  designation: string;
  cnic: string;
  joiningDate: string;
  entitlementDate: string;
}

// Function to normalize names for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
    .replace(/\bmr\b\.?\s*/g, '')
    .replace(/\bmrs\b\.?\s*/g, '')
    .replace(/\bms\b\.?\s*/g, '')
    .replace(/\bdr\b\.?\s*/g, '')
    .replace(/\bsh\b\.?\s*/g, '')
    .replace(/\bmalik\b\.?\s*/g, '')
    .replace(/\bsyed\b\.?\s*/g, '');
}

// Function to normalize CNIC by removing dashes and spaces
function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

// Function to parse CSV data
function parseCSV(csvContent: string): CSVRecord[] {
  const lines = csvContent.split('\n');
  const records: CSVRecord[] = [];
  
  // Skip header and empty lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length >= 3 && columns[0] && columns[2]) {
      records.push({
        name: columns[0].trim(),
        designation: columns[1] ? columns[1].trim() : '',
        cnic: columns[2].trim(),
        joiningDate: columns[3] ? columns[3].trim() : '',
        entitlementDate: columns[4] ? columns[4].trim() : ''
      });
    }
  }
  
  return records;
}

async function updateNationalIdsFromCSV() {
  console.log("Starting national ID update process...");
  
  try {
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Lhe-designations_1752292820699.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    console.log("CSV file loaded successfully");
    
    // Parse CSV records
    const csvRecords = parseCSV(csvContent);
    console.log(`Found ${csvRecords.length} records in CSV file`);
    
    // Get employees missing national IDs
    const employeesMissingNationalId = await db
      .select()
      .from(employeeRecords)
      .where(
        or(
          isNull(employeeRecords.nationalId),
          eq(employeeRecords.nationalId, '')
        )
      );
    
    console.log(`Found ${employeesMissingNationalId.length} employees missing national IDs`);
    
    let matchedCount = 0;
    let updatedCount = 0;
    
    // Process each employee missing national ID
    for (const employee of employeesMissingNationalId) {
      // Build full name for comparison
      const fullName = [
        employee.salutation,
        employee.firstName,
        employee.middleName,
        employee.lastName
      ].filter(Boolean).join(' ');
      
      const normalizedEmployeeName = normalizeName(fullName);
      
      // Try to find matching CSV record
      const matchingRecord = csvRecords.find(csvRecord => {
        const normalizedCSVName = normalizeName(csvRecord.name);
        return normalizedCSVName === normalizedEmployeeName;
      });
      
      if (matchingRecord && matchingRecord.cnic) {
        const normalizedCNIC = normalizeCNIC(matchingRecord.cnic);
        
        // Only update if CNIC is valid (13 digits)
        if (normalizedCNIC.length === 13 && /^\d+$/.test(normalizedCNIC)) {
          console.log(`Matching: "${fullName}" -> "${matchingRecord.name}" (CNIC: ${normalizedCNIC})`);
          
          try {
            // Update the employee record
            await db
              .update(employeeRecords)
              .set({
                nationalId: normalizedCNIC,
                updatedAt: new Date()
              })
              .where(eq(employeeRecords.id, employee.id));
            
            updatedCount++;
          } catch (error: any) {
            if (error.code === '23505') {
              console.log(`  -> Skipping: CNIC ${normalizedCNIC} already exists in database`);
            } else {
              console.log(`  -> Error updating ${fullName}: ${error.message}`);
            }
          }
        } else {
          console.log(`Invalid CNIC for "${fullName}": ${matchingRecord.cnic}`);
        }
        
        matchedCount++;
      } else {
        console.log(`No match found for: "${fullName}"`);
      }
    }
    
    console.log(`\nUpdate Summary:`);
    console.log(`- Total employees missing national ID: ${employeesMissingNationalId.length}`);
    console.log(`- Names matched in CSV: ${matchedCount}`);
    console.log(`- National IDs updated: ${updatedCount}`);
    
  } catch (error) {
    console.error("Error updating national IDs:", error);
  }
}

// Run the function
updateNationalIdsFromCSV().then(() => {
  console.log("National ID update process completed");
  process.exit(0);
}).catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});