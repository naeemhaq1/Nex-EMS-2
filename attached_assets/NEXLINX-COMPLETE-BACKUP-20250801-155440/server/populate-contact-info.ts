import { db } from "./db";
import { employeeRecords, employeePullExt } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Populate contact information from BioTime API data
 * This script updates the phone field in employee_records with mobile numbers from employee_pull_ext
 */

function isValidPakistaniMobile(mobile: string): boolean {
  if (!mobile) return false;
  
  // Remove spaces and dashes
  const cleaned = mobile.replace(/[\s-]/g, '');
  
  // Check if it's a valid Pakistani mobile number
  // Format: 03XXXXXXXXX (11 digits starting with 03)
  const mobilePattern = /^03\d{9}$/;
  
  return mobilePattern.test(cleaned);
}

function normalizeMobile(mobile: string): string {
  if (!mobile) return '';
  
  // Remove spaces and dashes
  const cleaned = mobile.replace(/[\s-]/g, '');
  
  // If it's already in correct format, return as is
  if (cleaned.startsWith('03') && cleaned.length === 11) {
    return cleaned;
  }
  
  // If it starts with +92, convert to 03 format
  if (cleaned.startsWith('+923')) {
    return '03' + cleaned.substring(4);
  }
  
  // If it starts with 923, convert to 03 format
  if (cleaned.startsWith('923')) {
    return '03' + cleaned.substring(3);
  }
  
  return cleaned;
}

async function populateContactInfo() {
  console.log('🔄 Starting contact information population...');
  
  try {
    // Get all employees from pull table with contact information
    const employeesWithContact = await db
      .select({
        empCode: employeePullExt.empCode,
        firstName: employeePullExt.firstName,
        lastName: employeePullExt.lastName,
        mobile: employeePullExt.mobile,
        contactTel: employeePullExt.contactTel,
        officeTel: employeePullExt.officeTel,
      })
      .from(employeePullExt)
      .where(eq(employeePullExt.empCode, employeePullExt.empCode)); // Get all records

    console.log(`📊 Found ${employeesWithContact.length} records in employee_pull_ext`);

    // Group by employee code to get unique employees
    const uniqueEmployees = new Map();
    
    for (const emp of employeesWithContact) {
      if (!emp.empCode) continue;
      
      const existing = uniqueEmployees.get(emp.empCode);
      if (!existing) {
        uniqueEmployees.set(emp.empCode, emp);
      } else {
        // Keep the one with the best mobile number
        const currentMobile = normalizeMobile(emp.mobile || '');
        const existingMobile = normalizeMobile(existing.mobile || '');
        
        if (isValidPakistaniMobile(currentMobile) && !isValidPakistaniMobile(existingMobile)) {
          uniqueEmployees.set(emp.empCode, emp);
        }
      }
    }

    console.log(`📋 Processing ${uniqueEmployees.size} unique employees`);

    let updatedCount = 0;
    let validMobileCount = 0;
    let invalidMobileCount = 0;
    let noMobileCount = 0;

    // Process each unique employee
    for (const [empCode, pullData] of uniqueEmployees) {
      try {
        // Find the best contact number
        let bestContact = '';
        let contactSource = '';
        
        // Priority: mobile -> contact_tel -> office_tel
        if (pullData.mobile && pullData.mobile.trim()) {
          const normalized = normalizeMobile(pullData.mobile);
          if (isValidPakistaniMobile(normalized)) {
            bestContact = normalized;
            contactSource = 'mobile';
          } else {
            bestContact = normalized;
            contactSource = 'mobile (invalid)';
          }
        } else if (pullData.contactTel && pullData.contactTel.trim()) {
          const normalized = normalizeMobile(pullData.contactTel);
          if (isValidPakistaniMobile(normalized)) {
            bestContact = normalized;
            contactSource = 'contact_tel';
          } else {
            bestContact = normalized;
            contactSource = 'contact_tel (invalid)';
          }
        } else if (pullData.officeTel && pullData.officeTel.trim()) {
          const normalized = normalizeMobile(pullData.officeTel);
          if (isValidPakistaniMobile(normalized)) {
            bestContact = normalized;
            contactSource = 'office_tel';
          } else {
            bestContact = normalized;
            contactSource = 'office_tel (invalid)';
          }
        }

        if (bestContact) {
          // Update employee record
          const result = await db
            .update(employeeRecords)
            .set({ phone: bestContact })
            .where(eq(employeeRecords.employeeCode, empCode))
            .returning({ id: employeeRecords.id, employeeCode: employeeRecords.employeeCode });

          if (result.length > 0) {
            updatedCount++;
            
            if (isValidPakistaniMobile(bestContact)) {
              validMobileCount++;
              console.log(`✅ ${empCode} (${pullData.firstName} ${pullData.lastName}): ${bestContact} (${contactSource})`);
            } else {
              invalidMobileCount++;
              console.log(`⚠️  ${empCode} (${pullData.firstName} ${pullData.lastName}): ${bestContact} (${contactSource}) - Invalid format`);
            }
          }
        } else {
          noMobileCount++;
          console.log(`❌ ${empCode} (${pullData.firstName} ${pullData.lastName}): No contact information`);
        }
      } catch (error) {
        console.error(`Error updating employee ${empCode}:`, error);
      }
    }

    console.log('\n📈 Contact Information Population Summary:');
    console.log(`✅ Total employees updated: ${updatedCount}`);
    console.log(`📱 Valid Pakistani mobile numbers: ${validMobileCount}`);
    console.log(`⚠️  Invalid mobile numbers: ${invalidMobileCount}`);
    console.log(`❌ No contact information: ${noMobileCount}`);
    console.log(`📊 Total employees processed: ${uniqueEmployees.size}`);
    
    // Show some examples of valid mobile numbers
    console.log('\n📱 Examples of valid mobile numbers updated:');
    const validExamples = await db
      .select({
        employeeCode: employeeRecords.employeeCode,
        firstName: employeeRecords.firstName,
        lastName: employeeRecords.lastName,
        phone: employeeRecords.phone
      })
      .from(employeeRecords)
      .where(eq(employeeRecords.phone, employeeRecords.phone))
      .limit(10);

    validExamples.forEach(emp => {
      if (emp.phone && isValidPakistaniMobile(emp.phone)) {
        console.log(`  ${emp.employeeCode}: ${emp.firstName} ${emp.lastName} - ${emp.phone}`);
      }
    });

  } catch (error) {
    console.error('❌ Error populating contact information:', error);
  }
}

// Run the script
populateContactInfo()
  .then(() => {
    console.log('✅ Contact information population completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

export { populateContactInfo };