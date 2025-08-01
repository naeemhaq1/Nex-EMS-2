import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { isNotNull, like } from "drizzle-orm";

async function checkCnicData() {
  console.log("Checking CNIC data in database...\n");
  
  // Get some sample employees with CNICs
  const employeesWithCnic = await db.select({
    id: employeeRecords.id,
    name: employeeRecords.name,
    cnic: employeeRecords.cnic,
    department: employeeRecords.department
  })
  .from(employeeRecords)
  .where(isNotNull(employeeRecords.cnic))
  .limit(20);
  
  console.log("Sample employees with CNIC:");
  for (const emp of employeesWithCnic) {
    console.log(`- ${emp.name}: ${emp.cnic} (${emp.department})`);
  }
  
  // Check for specific CNICs from CSV
  const testCnics = [
    '37406-6461178-9',
    '36102-6292379-3',
    '35201-6705767-5'
  ];
  
  console.log("\n\nSearching for specific CNICs from CSV:");
  for (const cnic of testCnics) {
    // Try different search patterns
    const normalizedCnic = cnic.replace(/[-\s]/g, '');
    
    console.log(`\nSearching for CNIC: ${cnic} (normalized: ${normalizedCnic})`);
    
    // Search with exact match
    const exact = await db.select()
      .from(employeeRecords)
      .where(like(employeeRecords.cnic, `%${normalizedCnic}%`));
    
    if (exact.length > 0) {
      console.log(`  Found ${exact.length} matches:`);
      for (const emp of exact) {
        console.log(`    - ${emp.name}: ${emp.cnic}`);
      }
    } else {
      console.log(`  No matches found`);
    }
  }
  
  // Check total employees with CNIC
  const totalWithCnic = await db.select()
  .from(employeeRecords)
  .where(isNotNull(employeeRecords.cnic));
  
  console.log(`\n\nTotal employees with CNIC: ${totalWithCnic.length}`);
  
  process.exit(0);
}

checkCnicData();