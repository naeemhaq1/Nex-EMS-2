import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { eq } from "drizzle-orm";

// Clear PSH matches based on the analysis
const clearMatches = [
  { 
    employeeCode: "10090318", 
    name: "Bakhtiar Azam", 
    matchName: "Bakht Munir", 
    designation: "Office Boy", 
    cnic: "15401-7338027-1",
    confidence: "High - Name similarity: Bakhtiar/Bakht"
  },
  { 
    employeeCode: "10090369", 
    name: "Muhammad Fawad", 
    matchName: "Fawad Ahmed", 
    designation: "Manager Technical", 
    cnic: "17301-8661587-3",
    confidence: "High - First name match: Fawad"
  },
  { 
    employeeCode: "10090313", 
    name: "Muhammad Sajid", 
    matchName: "Sajjad", 
    designation: "Security Guard", 
    cnic: "17301-2925355-9",
    confidence: "Medium - Name similarity: Sajid/Sajjad"
  }
];

// Normalize CNIC by removing dashes
function normalizeCNIC(cnic: string): string {
  return cnic.replace(/[-\s]/g, '');
}

async function populatePSHTargetedMatches() {
  console.log("🎯 Populating PSH targeted CNIC matches...\n");
  
  try {
    console.log("📋 TARGETED PSH MATCHES:");
    clearMatches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.employeeCode}: ${match.name}`);
      console.log(`   Matches with: ${match.matchName} (${match.designation})`);
      console.log(`   CNIC: ${match.cnic} (normalized: ${normalizeCNIC(match.cnic)})`);
      console.log(`   Confidence: ${match.confidence}`);
      console.log('');
    });
    
    // Perform updates
    console.log(`🔄 PERFORMING TARGETED UPDATES...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of clearMatches) {
      try {
        // Find the employee
        const employee = await db
          .select()
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, match.employeeCode));
        
        if (employee.length === 0) {
          console.log(`❌ Employee ${match.employeeCode} not found`);
          errorCount++;
          continue;
        }
        
        const emp = employee[0];
        
        // Check if employee already has CNIC
        if (emp.nationalId) {
          console.log(`ℹ️ Employee ${match.employeeCode} already has CNIC: ${emp.nationalId}`);
          continue;
        }
        
        const updateData: any = { 
          nationalId: normalizeCNIC(match.cnic)
        };
        
        // Add designation if employee doesn't have one
        if (!emp.designation && match.designation) {
          updateData.designation = match.designation;
        }
        
        await db
          .update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, emp.id));
        
        successCount++;
        console.log(`✅ Updated ${match.employeeCode} (${match.name}): Added CNIC ${match.cnic}`);
        
        if (updateData.designation) {
          console.log(`   Added designation: ${updateData.designation}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to update ${match.employeeCode}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 TARGETED PSH RESULTS:`);
    console.log(`✅ Successfully updated: ${successCount} PSH employees`);
    console.log(`❌ Failed updates: ${errorCount} PSH employees`);
    
    // Final verification for all employees
    const allUpdatedEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.isActive, true));
    
    const withCnic = allUpdatedEmployees.filter(emp => emp.nationalId).length;
    const withDesignation = allUpdatedEmployees.filter(emp => emp.designation).length;
    const withoutCnic = allUpdatedEmployees.filter(emp => !emp.nationalId).length;
    
    console.log(`\n📊 OVERALL UPDATED STATUS:`);
    console.log(`👥 Total active employees: ${allUpdatedEmployees.length}`);
    console.log(`🆔 Employees with CNIC: ${withCnic} (${((withCnic / allUpdatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Employees without CNIC: ${withoutCnic} (${((withoutCnic / allUpdatedEmployees.length) * 100).toFixed(1)}%)`);
    console.log(`🏷️ Employees with designation: ${withDesignation} (${((withDesignation / allUpdatedEmployees.length) * 100).toFixed(1)}%)`);
    
    // Check remaining PSH employees without CNIC
    const pshEmployees = await db
      .select()
      .from(employeeRecords)
      .where(eq(employeeRecords.department, 'PSH'));
    
    const pshWithoutCnic = pshEmployees.filter(emp => !emp.nationalId);
    
    if (pshWithoutCnic.length > 0) {
      console.log(`\n📋 PSH employees still missing CNIC (${pshWithoutCnic.length}):`);
      pshWithoutCnic.forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      });
    } else {
      console.log(`\n🎉 All PSH employees now have CNICs!`);
    }
    
    console.log(`\n✨ PSH targeted CNIC population completed!`);
    
  } catch (error) {
    console.error("❌ Error populating PSH targeted matches:", error);
  }
}

populatePSHTargetedMatches().catch(console.error);