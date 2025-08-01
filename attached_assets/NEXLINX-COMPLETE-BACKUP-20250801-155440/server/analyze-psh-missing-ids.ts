import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, and, isNull, or } from "drizzle-orm";

// PSH CSV data from the file
const pshCsvData = [
  { name: "Ishtiaq Ahmed", designation: "Ass. Manager Accounts", cnic: "17101-2437171-5", joining: "01-July-2012" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5", joining: "01-July-2012" },
  { name: "Zahid Hussain", designation: "Office Incharge-Abbotabad", cnic: "13101-0794417-5", joining: "01-July-2012" },
  { name: "Waqas Ahmed", designation: "Ass. Admin.", cnic: "17301-1229911-7", joining: "01-July-2012" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3", joining: "01-July-2012" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1", joining: "01-July-2012" },
  { name: "Naseer Anwar", designation: "Sales Executive-Haripur Part Time", cnic: "13302-0445027-9", joining: "01-July-2012" },
  { name: "Atiq-Ur-Rehman", designation: "Riggar", cnic: "", joining: "01-July-2024" },
  { name: "Abid Ali", designation: "C S Officer", cnic: "13101-2394113-3", joining: "16-Dec-2020" },
  { name: "Faiz Malik", designation: "C S Officer- Peshawar", cnic: "", joining: "15-Oct-2021" },
  { name: "Syed Fahad Ali Shah", designation: "C S Officer- Peshawar", cnic: "17301-3859714-1", joining: "10-Jan-2022" },
  { name: "SAJJAD", designation: "Security Guard", cnic: "17301-2925355-9", joining: "01-OCT-2022" },
  { name: "Raheel Pervez Sethi", designation: "C S Officer- Peshawar", cnic: "17301-3933105-7", joining: "01-Jan-2022" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager PSH", cnic: "17301-1562836-3", joining: "07-February-2022" },
  { name: "Asim Shahzad", designation: "C S Officer- Peshawar", cnic: "17301-1355079-7", joining: "15-Jan-2022" },
  { name: "Muhammad Umer", designation: "Office Boy", cnic: "17301-7331514-3", joining: "01-MAY-2023" }
];

function normalizeNameForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

async function analyzePshMissingIds() {
  console.log("Analyzing PSH employees with missing national IDs...\n");
  
  // Get PSH employees missing national IDs
  const pshEmployeesMissing = await db
    .select()
    .from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.department, 'PSH'),
        eq(employeeRecords.isActive, true),
        or(
          isNull(employeeRecords.nationalId),
          eq(employeeRecords.nationalId, '')
        )
      )
    )
    .orderBy(employeeRecords.employeeCode);

  console.log(`Found ${pshEmployeesMissing.length} PSH employees missing national IDs:\n`);
  
  // Analyze each missing employee
  for (const emp of pshEmployeesMissing) {
    const fullName = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
    const normalizedEmpName = normalizeNameForMatching(fullName);
    
    console.log(`Employee Code: ${emp.employeeCode}`);
    console.log(`Name: ${fullName}`);
    console.log(`Normalized: ${normalizedEmpName}`);
    
    // Try to find matches in PSH CSV data
    const potentialMatches = pshCsvData.filter(csvEmp => {
      const normalizedCsvName = normalizeNameForMatching(csvEmp.name);
      
      // Check for exact match
      if (normalizedCsvName === normalizedEmpName) {
        return true;
      }
      
      // Check for partial matches (first name + last name)
      const empParts = normalizedEmpName.split(' ').filter(p => p.length > 0);
      const csvParts = normalizedCsvName.split(' ').filter(p => p.length > 0);
      
      if (empParts.length >= 2 && csvParts.length >= 2) {
        // Check if first and last names match
        const empFirst = empParts[0];
        const empLast = empParts[empParts.length - 1];
        const csvFirst = csvParts[0];
        const csvLast = csvParts[csvParts.length - 1];
        
        if (empFirst === csvFirst && empLast === csvLast) {
          return true;
        }
      }
      
      // Check for contains match
      if (normalizedCsvName.includes(normalizedEmpName) || normalizedEmpName.includes(normalizedCsvName)) {
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
  
  console.log('\n=== PSH CSV Data Analysis Complete ===');
  console.log(`Total PSH employees in CSV: ${pshCsvData.length}`);
  console.log(`PSH employees missing national IDs: ${pshEmployeesMissing.length}`);
  console.log(`PSH CSV records with CNICs: ${pshCsvData.filter(emp => emp.cnic).length}`);
  
  console.log('\n📊 PSH analysis completed successfully!');
}

analyzePshMissingIds().catch(console.error);or);