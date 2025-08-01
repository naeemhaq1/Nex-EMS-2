import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function investigatePSHDuplicates() {
  console.log("🔍 Investigating PSH CNIC duplicates and remaining matches...\n");
  
  try {
    // Get the duplicate CNIC
    const duplicateCnic = "1310107944175";
    
    console.log(`Checking who already has CNIC ${duplicateCnic}:`);
    const existingEmployee = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.nationalId, duplicateCnic));
    
    if (existingEmployee.length > 0) {
      const emp = existingEmployee[0];
      console.log(`  ✅ Found: ${emp.employeeCode} - ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`     Department: ${emp.department}`);
      console.log(`     Designation: ${emp.designation || 'Not set'}`);
    }
    
    // Get all PSH employees missing CNICs
    const pshEmployees = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.department, 'PSH')
      ));
    
    const missingCnicPSH = pshEmployees.filter(emp => !emp.nationalId);
    
    console.log(`\n📋 PSH employees still missing CNIC (${missingCnicPSH.length}):`);
    missingCnicPSH.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      console.log(`   Department: ${emp.department}`);
      console.log(`   Current designation: ${emp.designation || 'Not set'}`);
      console.log('');
    });
    
    // PSH employee data from the image (excluding Zahid Hussain who's already in DB)
    const availablePSHData = [
      { name: "Ishtiaq Ahmed", designation: "Assistant Manager Accounts", cnic: "17101-2437171-5" },
      { name: "Hameed Gul", designation: "Office Boy", cnic: "17101-0691581-5" },
      { name: "Waqas Ahmed", designation: "Assistant Administration", cnic: "17301-1229911-7" },
      { name: "Fawad Ahmed", designation: "Manager Technical", cnic: "17301-8661587-3" },
      { name: "Bakht Munir", designation: "Office Boy", cnic: "15401-7338027-1" },
      { name: "Naseer Anwar", designation: "Sales Executive", cnic: "13302-0445027-9" },
      { name: "Atiq-Ur-Rehman", designation: "Rigger", cnic: "17301-5334303-1" },
      { name: "Abid Ali", designation: "Customer Support Officer", cnic: "13101-2394113-3" },
      { name: "Faiz Malik", designation: "Customer Support Officer", cnic: "17301-8770566-9" },
      { name: "Syed Fahad Ali Shah", designation: "Customer Support Officer", cnic: "17301-3859714-1" },
      { name: "Sajjad", designation: "Security Guard", cnic: "17301-2925355-9" },
      { name: "Raheel Pervez Sethi", designation: "Customer Support Officer", cnic: "17301-3933105-7" },
      { name: "Muhammad Ali Zia", designation: "Key Accounts Manager", cnic: "17301-1562836-3" },
      { name: "Asim Shahzad", designation: "Customer Support Officer", cnic: "17301-1355079-7" },
      { name: "Muhammad Umer", designation: "Office Boy", cnic: "17301-7331514-3" }
    ];
    
    console.log(`\n🔍 POTENTIAL MATCHES ANALYSIS:`);
    
    // Try to find potential matches
    for (const employee of missingCnicPSH) {
      const empFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().toLowerCase();
      
      console.log(`\n👤 ${employee.employeeCode}: ${empFullName}`);
      
      // Look for potential matches in PSH data
      const potentialMatches = availablePSHData.filter(data => {
        const dataName = data.name.toLowerCase();
        const empWords = empFullName.split(' ').filter(w => w.length > 2);
        const dataWords = dataName.split(' ').filter(w => w.length > 2);
        
        // Check for word matches
        const matchingWords = empWords.filter(empWord => 
          dataWords.some(dataWord => 
            dataWord.includes(empWord) || empWord.includes(dataWord) ||
            empWord.includes(dataWord)
          )
        );
        
        return matchingWords.length >= 1; // At least one word match
      });
      
      if (potentialMatches.length > 0) {
        console.log(`   🎯 Potential matches:`);
        potentialMatches.forEach((match, index) => {
          console.log(`     ${index + 1}. ${match.name} (${match.designation}) - CNIC: ${match.cnic}`);
        });
      } else {
        console.log(`   ❌ No potential matches found`);
      }
    }
    
    // Show name patterns for manual review
    console.log(`\n📝 NAME PATTERN ANALYSIS:`);
    console.log(`Database PSH employees missing CNIC:`);
    missingCnicPSH.forEach(emp => {
      console.log(`  - "${emp.firstName} ${emp.middleName || ''} ${emp.lastName}".trim()`);
    });
    
    console.log(`\nAvailable PSH data names:`);
    availablePSHData.forEach(data => {
      console.log(`  - "${data.name}"`);
    });
    
  } catch (error) {
    console.error("❌ Error investigating PSH duplicates:", error);
  }
}

investigatePSHDuplicates().catch(console.error);