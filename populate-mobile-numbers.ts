import { db } from "./db";
import { employeePullExt, employeeRecords } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

async function populateMobileNumbers() {
  console.log("=== Populating Mobile Numbers from BioTime API ===\n");
  
  try {
    // First, let's count how many employees already have mobile numbers
    const existingMobileCount = await db.select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(sql`mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10`);
    
    console.log(`📊 Current Status:`);
    console.log(`   Employees with valid mobile numbers: ${existingMobileCount[0].count}\n`);
    
    // Find all records with valid mobile numbers in either mobile or contact_tel fields
    const mobileInMobileField = await db.execute(sql`
      SELECT 
        employee_code,
        all_fields->>'first_name' as first_name,
        all_fields->>'last_name' as last_name,
        all_fields->>'mobile' as mobile_value
      FROM employee_pull_ext
      WHERE all_fields->>'mobile' ~ '^03[0-9]{9}$'
    `);
    
    const mobileInContactField = await db.execute(sql`
      SELECT 
        employee_code,
        all_fields->>'first_name' as first_name,
        all_fields->>'last_name' as last_name,
        all_fields->>'contact_tel' as mobile_value
      FROM employee_pull_ext
      WHERE all_fields->>'contact_tel' ~ '^03[0-9]{9}$'
    `);
    
    console.log(`🔍 Found mobile numbers:`);
    console.log(`   In 'mobile' field: ${mobileInMobileField.rows.length} employees`);
    console.log(`   In 'contact_tel' field: ${mobileInContactField.rows.length} employees\n`);
    
    // Process mobile field first
    console.log(`📱 Processing mobile numbers from 'mobile' field...\n`);
    let updatedCount = 0;
    
    for (const row of mobileInMobileField.rows) {
      const emp = row as any;
      
      // Check if employee exists and needs mobile number update
      const existing = await db.select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, emp.employee_code));
      
      if (existing.length > 0) {
        const employee = existing[0];
        
        // Only update if employee is active and doesn't have a mobile number yet
        if (employee.isActive && employee.systemAccount === false && 
            (!employee.mobile || employee.mobile === '' || employee.mobile === '0' || employee.mobile === 'NULL' || employee.mobile.trim() === '')) {
          
          const result = await db.update(employeeRecords)
            .set({ 
              mobile: emp.mobile_value,
              updatedAt: new Date()
            })
            .where(eq(employeeRecords.employeeCode, emp.employee_code))
            .returning();
          
          if (result.length > 0) {
            console.log(`✅ Updated ${emp.employee_code} - ${emp.first_name} ${emp.last_name || ''}: ${emp.mobile_value}`);
            updatedCount++;
          }
        } else if (employee.mobile && employee.mobile.match(/^03[0-9]{9}$/)) {
          // Skip - already has mobile
        } else if (!employee.isActive) {
          console.log(`⚠️  Skipping ${emp.employee_code} - inactive employee`);
        }
      } else {
        console.log(`⚠️  Employee ${emp.employee_code} not found in employee_records`);
      }
    }
    
    // Process contact_tel field
    console.log(`\n📱 Processing mobile numbers from 'contact_tel' field...\n`);
    
    for (const row of mobileInContactField.rows) {
      const emp = row as any;
      
      // Check if this employee already has a mobile number from the mobile field
      const existing = await db.select()
        .from(employeeRecords)
        .where(eq(employeeRecords.employeeCode, emp.employee_code));
      
      if (existing.length > 0 && existing[0].mobile && existing[0].mobile.match(/^03[0-9]{9}$/)) {
        console.log(`⚠️  ${emp.employee_code} already has mobile: ${existing[0].mobile} (skipping contact_tel: ${emp.mobile_value})`);
      } else {
        // Update employee_records with the mobile number
        const result = await db.update(employeeRecords)
          .set({ 
            mobile: emp.mobile_value,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.employeeCode, emp.employee_code))
          .returning();
        
        if (result.length > 0) {
          console.log(`✅ Updated ${emp.employee_code} - ${emp.first_name} ${emp.last_name || ''}: ${emp.mobile_value}`);
          updatedCount++;
        }
      }
    }
    
    // Final count
    const finalMobileCount = await db.select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(sql`mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10`);
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   Total employees updated: ${updatedCount}`);
    console.log(`   Total employees with valid mobile numbers: ${finalMobileCount[0].count}`);
    console.log(`   Coverage: ${((finalMobileCount[0].count / 385) * 100).toFixed(1)}% of all employees`);
    
    // Show some examples
    console.log(`\n📋 Sample updated records:`);
    const samples = await db.select()
      .from(employeeRecords)
      .where(sql`phone IS NOT NULL AND phone != '' AND phone ~ '^03[0-9]{9}$'`)
      .limit(10);
    
    samples.forEach(emp => {
      console.log(`   ${emp.employeeCode} - ${emp.firstName} ${emp.lastName || ''}: ${emp.phone}`);
    });
    
  } catch (error) {
    console.error("Error populating mobile numbers:", error);
  }
}

// Run the population
populateMobileNumbers().then(() => {
  console.log("\n✅ Mobile number population complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});