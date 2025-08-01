import { db } from "./db";
import { employeePullExt } from "@shared/schema";
import { like, or, and, isNotNull } from "drizzle-orm";

async function deepSearchCnicMobile() {
  console.log("Deep searching ALL fields for mobile numbers starting with 03 and 11 digits long...\n");
  
  try {
    // Get all records to search through all fields
    const allRecords = await db
      .select()
      .from(employeePullExt)
      .limit(1000); // Sample first 1000 records to avoid timeout
    
    console.log(`Searching through ${allRecords.length} records...\n`);
    
    const mobilePattern = /^03\d{9}$/; // Exactly 11 digits starting with 03
    const foundMobiles = new Map();
    
    // Search through each record and each field
    allRecords.forEach(record => {
      // Get all field values as strings
      const fields = {
        mobile: record.mobile,
        contactTel: record.contactTel,
        officeTel: record.officeTel,
        national: record.national,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        empCode: record.empCode,
        hireDate: record.hireDate,
        verifyMode: record.verifyMode,
        city: record.city,
        cardNo: record.cardNo,
        appStatus: record.appStatus,
        appRole: record.appRole,
        createTime: record.createTime,
        changeTime: record.changeTime,
        status: record.status,
        lastActivity: record.lastActivity,
        // Add other fields as needed
      };
      
      // Check each field for mobile pattern
      Object.entries(fields).forEach(([fieldName, fieldValue]) => {
        if (fieldValue && typeof fieldValue === 'string') {
          // Check if it matches mobile pattern
          if (mobilePattern.test(fieldValue)) {
            const key = `${record.empCode}-${fieldValue}`;
            if (!foundMobiles.has(key)) {
              foundMobiles.set(key, {
                empCode: record.empCode,
                firstName: record.firstName,
                lastName: record.lastName,
                mobile: fieldValue,
                foundInField: fieldName,
                national: record.national,
                department: record.department
              });
            }
          }
          
          // Also check if field contains a mobile number (might be mixed with other text)
          const mobileMatches = fieldValue.match(/03\d{9}/g);
          if (mobileMatches) {
            mobileMatches.forEach(match => {
              const key = `${record.empCode}-${match}`;
              if (!foundMobiles.has(key)) {
                foundMobiles.set(key, {
                  empCode: record.empCode,
                  firstName: record.firstName,
                  lastName: record.lastName,
                  mobile: match,
                  foundInField: fieldName,
                  national: record.national,
                  department: record.department,
                  originalValue: fieldValue
                });
              }
            });
          }
        }
      });
    });
    
    // Display results
    console.log(`=== MOBILE NUMBERS FOUND ===`);
    console.log(`Total unique mobile numbers found: ${foundMobiles.size}\n`);
    
    const mobilesByField = {};
    const uniqueEmployees = new Set();
    
    Array.from(foundMobiles.values()).forEach(entry => {
      const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
      const deptInfo = entry.department ? JSON.stringify(entry.department) : 'No dept';
      
      console.log(`${entry.empCode}: ${fullName}`);
      console.log(`  Mobile: ${entry.mobile}`);
      console.log(`  Found in field: ${entry.foundInField}`);
      console.log(`  National ID: ${entry.national || 'MISSING'}`);
      console.log(`  Department: ${deptInfo}`);
      if (entry.originalValue && entry.originalValue !== entry.mobile) {
        console.log(`  Original field value: ${entry.originalValue}`);
      }
      console.log('');
      
      // Track statistics
      if (!mobilesByField[entry.foundInField]) {
        mobilesByField[entry.foundInField] = 0;
      }
      mobilesByField[entry.foundInField]++;
      uniqueEmployees.add(entry.empCode);
    });
    
    console.log(`=== SUMMARY ===`);
    console.log(`Total unique employees with mobiles: ${uniqueEmployees.size}`);
    console.log(`Total mobile numbers found: ${foundMobiles.size}`);
    console.log(`\nMobile numbers by field:`);
    Object.entries(mobilesByField).forEach(([field, count]) => {
      console.log(`  ${field}: ${count}`);
    });
    
    // Check for employees with mobiles but missing National IDs
    const missingNationalWithMobile = Array.from(foundMobiles.values())
      .filter(entry => !entry.national || entry.national.trim() === '');
    
    console.log(`\n=== EMPLOYEES WITH MOBILE BUT MISSING NATIONAL ID ===`);
    if (missingNationalWithMobile.length > 0) {
      console.log(`Found ${missingNationalWithMobile.length} employees with mobiles but missing National IDs:`);
      missingNationalWithMobile.forEach(entry => {
        const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
        console.log(`${entry.empCode}: ${fullName}`);
        console.log(`  Mobile: ${entry.mobile} (in ${entry.foundInField})`);
        console.log('');
      });
    } else {
      console.log("No employees found with mobiles but missing National IDs");
    }
    
  } catch (error) {
    console.error("Error in deep search:", error);
  }
}

deepSearchCnicMobile().catch(console.error);