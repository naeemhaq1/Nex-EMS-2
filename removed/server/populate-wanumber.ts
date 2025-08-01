import { db } from './db';
import { employeeRecords } from '../shared/schema';
import { eq, and, isNotNull, ne, sql } from 'drizzle-orm';

async function populateWanumbers() {
  console.log("=== Populating WhatsApp Numbers (92x format) ===\n");
  
  try {
    // Get all employees with mobile numbers but missing wanumber
    console.log("🔍 Finding employees with mobile numbers but missing wanumber...");
    
    const employees = await db.select({
      id: employeeRecords.id,
      employee_code: employeeRecords.employeeCode,
      first_name: employeeRecords.firstName,
      last_name: employeeRecords.lastName,
      mobile: employeeRecords.mobile,
      wanumber: employeeRecords.wanumber
    }).from(employeeRecords)
    .where(
      and(
        eq(employeeRecords.isActive, true),
        eq(employeeRecords.systemAccount, false),
        isNotNull(employeeRecords.mobile),
        ne(employeeRecords.mobile, ''),
        ne(employeeRecords.mobile, '0'),
        ne(employeeRecords.mobile, 'NULL'),
        sql`LENGTH(${employeeRecords.mobile}) >= 10`,
        sql`${employeeRecords.mobile} ~ '^03[0-9]{9}$'` // Valid Pakistani mobile format
      )
    );
    
    console.log(`📱 Found ${employees.length} employees with valid mobile numbers\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const employee of employees) {
      const mobile = employee.mobile!;
      
      // Convert 03xxxxxxxxx to 92xxxxxxxxx
      if (mobile.startsWith('03')) {
        const wanumber = '92' + mobile.substring(1); // Remove '0' and add '92'
        
        // Check if wanumber already exists and is correct
        if (employee.wanumber === wanumber) {
          console.log(`⏭️  Skipped ${employee.employee_code} - ${employee.first_name} ${employee.last_name}: wanumber already correct (${wanumber})`);
          skippedCount++;
          continue;
        }
        
        // Update the wanumber field
        await db.update(employee_records)
          .set({ 
            wanumber: wanumber,
            updated_at: new Date()
          })
          .where(eq(employee_records.id, employee.id));
        
        console.log(`✅ Updated ${employee.employee_code} - ${employee.first_name} ${employee.last_name}: ${mobile} → ${wanumber}`);
        updatedCount++;
        
        // Add small delay to prevent overwhelming the database
        if (updatedCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log(`   ... processed ${updatedCount} updates so far`);
        }
      } else {
        console.log(`⚠️  Invalid mobile format for ${employee.employee_code}: ${mobile}`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 WANUMBER POPULATION RESULTS:");
    console.log("=".repeat(60));
    console.log(`✅ Employees updated: ${updatedCount}`);
    console.log(`⏭️  Employees skipped: ${skippedCount}`);
    console.log(`📱 Total processed: ${employees.length}`);
    console.log(`📞 WhatsApp format: 92xxxxxxxxx (removed 0, added 92)`);
    console.log("=".repeat(60));
    
    // Verify the results
    console.log("\n🔍 Verification - Sample wanumbers:");
    const sampleWanumbers = await db.select({
      employee_code: employee_records.employee_code,
      first_name: employee_records.first_name,
      mobile: employee_records.mobile,
      wanumber: employee_records.wanumber
    }).from(employee_records)
    .where(
      and(
        isNotNull(employee_records.wanumber),
        ne(employee_records.wanumber, ''),
        employee_records.is_active.eq(true)
      )
    )
    .limit(10);
    
    sampleWanumbers.forEach((emp, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${emp.employee_code} | ${emp.mobile} → ${emp.wanumber} | ${emp.first_name}`);
    });
    
    console.log(`\n✅ WhatsApp number population complete! ${updatedCount} employees now have 92x format numbers.`);
    
  } catch (error) {
    console.error("❌ Error populating wanumbers:", error);
  }
}

// Run the population
populateWanumbers().then(() => {
  console.log("\n✅ Wanumber population script complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});