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

// Parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Handle formats like "01-July-2012", "16-Dec-2020", "01-OCT-2022"
  const cleanDateStr = dateStr.trim();
  
  if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      let year = parseInt(parts[2]);
      
      // Convert month names to numbers
      const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
        'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3, 'MAY': 4, 'JUNE': 5,
        'JULY': 6, 'AUGUST': 7, 'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11,
        'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
        'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
      };
      
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
  }
  
  return null;
}

async function populatePSHCnics() {
  console.log("🚀 Populating PSH employee CNICs from image data...\n");
  
  try {
    // Get all PSH employees
    const pshEmployees = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.department, 'PSH')
      ));
    
    console.log(`Found ${pshEmployees.length} PSH employees in database`);
    
    const missingCnicPSH = pshEmployees.filter(emp => !emp.nationalId);
    console.log(`PSH employees missing CNIC: ${missingCnicPSH.length}`);
    
    // Match PSH employees to image data
    const matches = [];
    
    for (const employee of missingCnicPSH) {
      const empFullName = `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim();
      const empNormalizedName = normalizeName(empFullName);
      
      // Try exact name match first
      let dataMatch = pshEmployeeData.find(data => 
        normalizeName(data.name) === empNormalizedName
      );
      
      // Try partial matching
      if (!dataMatch) {
        const empWords = empNormalizedName.split(' ').filter(w => w.length > 2);
        
        for (const data of pshEmployeeData) {
          const dataWords = normalizeName(data.name).split(' ').filter(w => w.length > 2);
          
          // Check if at least 2 significant words match
          const matchingWords = empWords.filter(empWord => 
            dataWords.some(dataWord => 
              dataWord.includes(empWord) || empWord.includes(dataWord)
            )
          );
          
          if (matchingWords.length >= 2) {
            dataMatch = data;
            break;
          }
        }
      }
      
      // Try first and last name matching
      if (!dataMatch) {
        const firstName = employee.firstName.toLowerCase();
        const lastName = employee.lastName.toLowerCase();
        
        dataMatch = pshEmployeeData.find(data => {
          const dataName = normalizeName(data.name);
          return dataName.includes(firstName) && dataName.includes(lastName);
        });
      }
      
      if (dataMatch) {
        matches.push({
          employee,
          data: dataMatch
        });
      }
    }
    
    console.log(`\n🎯 Found ${matches.length} potential matches`);
    
    // Show matches for review
    console.log(`\n📋 PSH MATCHES FOR REVIEW:`);
    matches.forEach((match, index) => {
      console.log(`${index + 1}. ${match.employee.employeeCode}: ${match.employee.firstName} ${match.employee.middleName || ''} ${match.employee.lastName}`.trim());
      console.log(`   Current Department: ${match.employee.department}`);
      console.log(`   Image Name: ${match.data.name}`);
      console.log(`   Adding CNIC: ${match.data.cnic} (normalized: ${normalizeCNIC(match.data.cnic)})`);
      console.log(`   Adding Designation: ${match.data.designation}`);
      console.log(`   Joining Date: ${match.data.joiningDate}`);
      console.log('');
    });
    
    // Perform updates
    console.log(`\n🔄 PERFORMING PSH UPDATES...`);
    let successCount = 0;
    let errorCount = 0;
    
    for (const match of matches) {
      try {
        const updateData: any = { 
          nationalId: normalizeCNIC(match.data.cnic)
        };
        
        // Add designation if employee doesn't have one
        if (!match.employee.designation && match.data.designation) {
          updateData.designation = match.data.designation;
        }
        
        // Add joining date if available and employee doesn't have one
        if (!match.employee.joiningDate && match.data.joiningDate) {
          const parsedJoiningDate = parseDate(match.data.joiningDate);
          if (parsedJoiningDate) {
            updateData.joiningDate = parsedJoiningDate;
          }
        }
        
        await db
          .update(employeeRecords)
          .set(updateData)
          .where(eq(employeeRecords.id, match.employee.id));
        
        successCount++;
        console.log(`✅ Updated ${match.employee.employeeCode}: Added CNIC ${match.data.cnic}`);
        
        if (updateData.designation) {
          console.log(`   Added designation: ${updateData.designation}`);
        }
        if (updateData.joiningDate) {
          console.log(`   Added joining date: ${updateData.joiningDate.toDateString()}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to update ${match.employee.employeeCode}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 PSH RESULTS:`);
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
    
    // Show remaining PSH employees without CNIC
    const remainingPSHWithoutCnic = await db
      .select()
      .from(employeeRecords)
      .where(and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.department, 'PSH')
      ));
    
    const stillMissingPSH = remainingPSHWithoutCnic.filter(emp => !emp.nationalId);
    
    if (stillMissingPSH.length > 0) {
      console.log(`\n📋 PSH employees still missing CNIC:`);
      stillMissingPSH.forEach(emp => {
        console.log(`  - ${emp.employeeCode}: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
      });
    } else {
      console.log(`\n🎉 All PSH employees now have CNICs!`);
    }
    
    console.log(`\n✨ PSH CNIC population completed successfully!`);
    
  } catch (error) {
    console.error("❌ Error populating PSH CNICs:", error);
  }
}

populatePSHCnics().catch(console.error);