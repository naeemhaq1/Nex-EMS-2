import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

// ISB CSV data from the file
const isbCsvData = [
  { name: "Hafiz Shahzad Kashif", designation: "Branch Manager", cnic: "37406-5979449-3", joining: "01-July-2012" },
  { name: "Mrs.Nida Bhatti", designation: "Receptionist", cnic: "61101-1894906-8", joining: "01-July-2012" },
  { name: "Mr. Aamir Mahmood", designation: "Field Technician", cnic: "37405-2991194-1", joining: "01-July-2012" },
  { name: "Mr. Shams-ud-Din", designation: "Rigger", cnic: "13302-1741269-1", joining: "01-July-2012" },
  { name: "Mr. Yasir Ali", designation: "Office Boy", cnic: "61101-0487403-1", joining: "01-July-2012" },
  { name: "Mr. Ejaz Masih", designation: "Sweeper-Part Time", cnic: "", joining: "01-July-2012" },
  { name: "Mr. Ammar Javed", designation: "Network Engineer", cnic: "36302-3791367-1", joining: "01-July-2013" },
  { name: "Mr. Asad Ali", designation: "Rigger", cnic: "33401-0559102-7", joining: "21-Sep-2021" },
  { name: "Mr.Asad Ali", designation: "Rigger", cnic: "33401-0503365-7", joining: "15-Aug-2022" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/^(mr\.?|mrs\.?|ms\.?|hafiz|syed)\s*/i, '') // Remove titles
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

async function analyzeIsbMatching() {
  console.log("=== ISB Department Analysis ===\n");
  
  // Get all ISB employees from database
  const isbEmployees = await db
    .select()
    .from(employeeRecords)
    .where(eq(employeeRecords.department, 'ISB'))
    .orderBy(employeeRecords.employeeCode);
  
  console.log(`Database ISB employees: ${isbEmployees.length}`);
  console.log(`CSV ISB employees: ${isbCsvData.length}`);
  
  console.log("\n=== Database vs CSV Comparison ===\n");
  
  // Analyze each database employee
  for (const dbEmp of isbEmployees) {
    const dbFullName = `${dbEmp.firstName || ''} ${dbEmp.middleName || ''} ${dbEmp.lastName || ''}`.trim();
    const normalizedDbName = normalizeNameForMatching(dbFullName);
    const hasNationalId = dbEmp.nationalId ? '✓' : '✗';
    
    console.log(`${dbEmp.employeeCode}: ${dbFullName} - National ID: ${hasNationalId}`);
    console.log(`  Normalized: ${normalizedDbName}`);
    
    // Try to find matches in CSV
    const potentialMatches = isbCsvData.filter(csvEmp => {
      const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
      
      // Check for exact match
      if (normalizedCsvName === normalizedDbName) {
        return true;
      }
      
      // Check for partial matches
      const dbParts = normalizedDbName.split(' ').filter(p => p.length > 0);
      const csvParts = normalizedCsvName.split(' ').filter(p => p.length > 0);
      
      if (dbParts.length >= 2 && csvParts.length >= 2) {
        // Check if first and last names match
        const dbFirst = dbParts[0];
        const dbLast = dbParts[dbParts.length - 1];
        const csvFirst = csvParts[0];
        const csvLast = csvParts[csvParts.length - 1];
        
        if (dbFirst === csvFirst && dbLast === csvLast) {
          return true;
        }
      }
      
      // Check for contains match
      if (normalizedCsvName.includes(normalizedDbName) || normalizedDbName.includes(normalizedCsvName)) {
        return true;
      }
      
      return false;
    });
    
    if (potentialMatches.length > 0) {
      console.log(`  ✓ POTENTIAL MATCHES:`);
      potentialMatches.forEach(match => {
        console.log(`    - ${match.name} (${match.designation}) - CNIC: ${match.cnic || 'MISSING'}`);
      });
    } else {
      console.log(`  ✗ NO MATCHES FOUND`);
    }
    
    console.log('');
  }
  
  console.log('\n=== CSV Records Not Found in Database ===\n');
  
  // Check which CSV records might not be in database
  for (const csvEmp of isbCsvData) {
    const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
    
    const foundInDb = isbEmployees.some(dbEmp => {
      const dbFullName = `${dbEmp.firstName || ''} ${dbEmp.middleName || ''} ${dbEmp.lastName || ''}`.trim();
      const normalizedDbName = normalizeNameForMatching(dbFullName);
      
      return normalizedDbName === normalizedCsvName ||
             normalizedDbName.includes(normalizedCsvName) ||
             normalizedCsvName.includes(normalizedDbName);
    });
    
    if (!foundInDb) {
      console.log(`CSV: ${csvEmp.name} - Not found in database`);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`ISB employees in database: ${isbEmployees.length}`);
  console.log(`ISB employees in CSV: ${isbCsvData.length}`);
  console.log(`Missing National IDs: ${isbEmployees.filter(emp => !emp.nationalId).length}`);
  console.log(`CSV records with CNICs: ${isbCsvData.filter(emp => emp.cnic).length}`);
}

analyzeIsbMatching().catch(console.error);