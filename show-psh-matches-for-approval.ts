import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// PSH employee data from the image
const pshEmployeeData = [
  { name: "Ishtiaq Ahmed", designation: "Assistant Manager Accounts", cnic: "17101-2437171-5", joiningDate: "01-July-2012" },
  { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5", joiningDate: "01-July-2012" },
  { name: "Zahid Hussain", designation: "Office Incharge", cnic: "13101-0794417-5", joiningDate: "01-July-2012" },
  { name: "Waqas Ahmed", designation: "Assistant Administration", cnic: "17301-1229911-7", joiningDate: "01-July-2012" },
  { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3", joiningDate: "01-July-2012" },
  { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1", joiningDate: "01-July-2012" },
  { name: "Naseer Anwar", designation: "Sales Executive", cnic: "13302-0445027-9", joiningDate: "01-July-2012" },
  { name: "Atiq-Ur-Rehman", designation: "Rigger", cnic: "17301-5334303-1", joiningDate: "01-July-2024" },
  { name: "Abid Ali", designation: "Customer Support Officer", cnic: "13101-2394113-3", joiningDate: "16-Dec-2020" },
  { name: "Faiz Malik", designation: "Customer Support Officer", cnic: "17301-8770566-9", joiningDate: "15-Oct-2021" },
  { name: "Syed Fahad Ali Shah", designation: "Customer Support Officer", cnic: "17301-3859714-1", joiningDate: "10-Jan-2022" },
  { name: "Sajjad", designation: "Security Guard", cnic: "17301-2925355-9", joiningDate: "01-OCT-2022" },
  { name: "Raheel Pervez Sethi", designation: "Customer Support Officer", cnic: "17301-3933105-7", joiningDate: "01-Jan-2022" },
  { name: "Muhammad Ali Zia", designation: "Key Accounts Manager", cnic: "17301-1562836-3", joiningDate: "07-February-2022" },
  { name: "Asim Shahzad", designation: "Customer Support Officer", cnic: "17301-1355079-7", joiningDate: "15-Jan-2022" },
  { name: "Muhammad Umer", designation: "Office Boy", cnic: "17301-7331514-3", joiningDate: "01-MAY-2023" }
];

// Normalize CNIC by removing dashes
function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Calculate match score
function calculateMatchScore(empName: string, csvName: string): number {
  const empWords = normalizeName(empName).split(' ').filter(w => w.length > 2);
  const csvWords = normalizeName(csvName).split(' ').filter(w => w.length > 2);
  
  let score = 0;
  
  // Exact word matches
  for (const empWord of empWords) {
    for (const csvWord of csvWords) {
      if (empWord === csvWord) {
        score += 10;
      } else if (empWord.includes(csvWord) || csvWord.includes(empWord)) {
        score += 5;
      }
    }
  }
  
  // Bonus for first name match
  if (empWords.length > 0 && csvWords.length > 0) {
    if (empWords[0] === csvWords[0]) {
      score += 15;
    }
  }
  
  return score;
}

async function showPSHMatchesForApproval() {
  console.log("🔍 Analyzing PSH employee matches for approval...\n");
  
  try {
    // Get all PSH employees missing CNICs
    const pshEmployees = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.department, 'PSH')
      ));
    
    const missingCnicPSH = pshEmployees.filter(emp => !emp.nationalId);
    
    console.log(`Found ${pshEmployees.length} PSH employees in database`);
    console.log(`PSH employees missing CNIC: ${missingCnicPSH.length}`);
    
    // Find potential matches
    const potentialMatches = [];
    
    for (const employee of missingCnicPSH) {
      const empFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
      
      // Check each PSH data entry
      for (const pshData of pshEmployeeData) {
        const score = calculateMatchScore(empFullName, pshData.name);
        
        // Only consider matches with score > 5
        if (score > 5) {
          // Check if CNIC is already in use
          const existingEmployee = await db
            .select()
            .from(employeeRecords)
            .where(eq(employeeRecords.nationalId, normalizeCNIC(pshData.cnic)));
          
          const isAvailable = existingEmployee.length === 0;
          
          potentialMatches.push({
            employee,
            pshData,
            score,
            isAvailable,
            existingEmployee: existingEmployee.length > 0 ? existingEmployee[0] : null
          });
        }
      }
    }
    
    // Sort by score (highest first)
    potentialMatches.sort((a, b) => b.score - a.score);
    
    console.log(`\n🎯 Found ${potentialMatches.length} potential matches\n`);
    
    console.log("=" * 80);
    console.log("POTENTIAL PSH MATCHES FOR APPROVAL");
    console.log("=" * 80);
    
    potentialMatches.forEach((match, index) => {
      const confidence = match.score >= 20 ? "HIGH" : match.score >= 10 ? "MEDIUM" : "LOW";
      
      console.log(`\n${index + 1}. MATCH CANDIDATE (Score: ${match.score} - ${confidence} confidence)`);
      console.log(`   Database Employee: ${match.employee.employeeCode}`);
      console.log(`   Name: ${match.employee.firstName} ${match.employee.middleName || ''} ${match.employee.lastName}`.trim());
      console.log(`   Current Department: ${match.employee.department}`);
      console.log(`   Current Designation: ${match.employee.designation || 'Not set'}`);
      console.log(`   Current CNIC: ${match.employee.nationalId || 'Missing'}`);
      console.log(`   `);
      console.log(`   Image Data Match: ${match.pshData.name}`);
      console.log(`   Would add CNIC: ${match.pshData.cnic} (normalized: ${normalizeCNIC(match.pshData.cnic)})`);
      console.log(`   Would add Designation: ${match.pshData.designation}`);
      console.log(`   Would add Joining Date: ${match.pshData.joiningDate}`);
      
      if (match.isAvailable) {
        console.log(`   ✅ CNIC is AVAILABLE for use`);
      } else {
        console.log(`   ❌ CNIC already in use by: ${match.existingEmployee?.employeeCode} - ${match.existingEmployee?.firstName} ${match.existingEmployee?.lastName}`);
      }
      
      console.log(`   -` * 40);
    });
    
    // Show recommended matches for approval
    const recommendedMatches = potentialMatches.filter(match => match.score >= 10 && match.isAvailable);
    
    console.log(`\n📝 RECOMMENDED MATCHES FOR APPROVAL (${recommendedMatches.length}):`);
    console.log(`These matches have score >= 10 and available CNICs:`);
    
    recommendedMatches.forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.employee.employeeCode}: "${match.employee.firstName} ${match.employee.middleName || ''} ${match.employee.lastName}".trim()`);
      console.log(`   → "${match.pshData.name}" (Score: ${match.score})`);
      console.log(`   → CNIC: ${match.pshData.cnic}`);
      console.log(`   → Designation: ${match.pshData.designation}`);
    });
    
    // Show employees still without potential matches
    const employeesWithoutMatches = missingCnicPSH.filter(emp => {
      const empFullName = `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim();
      return !potentialMatches.some(match => 
        match.employee.employeeCode === emp.employeeCode && match.score >= 5
      );
    });
    
    if (employeesWithoutMatches.length > 0) {
      console.log(`\n❌ PSH employees without potential matches (${employeesWithoutMatches.length}):`);
      employeesWithoutMatches.forEach(emp => {
        console.log(`   - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      });
    }
    
    console.log(`\n✨ Analysis complete - awaiting approval for recommended matches`);
    
  } catch (error) {
    console.error("❌ Error analyzing PSH matches:", error);
  }
}

showPSHMatchesForApproval().catch(console.error);