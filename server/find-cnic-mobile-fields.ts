import { db } from "./db";
import { employeePullExt } from "@shared/schema";

async function findCnicMobileInAllFields() {
  console.log("Searching ALL fields in ALL records for 11-digit mobile numbers starting with 03...\n");
  
  try {
    // Get total count first
    const totalRecords = await db
      .select({ count: employeePullExt.empCode })
      .from(employeePullExt);
    
    console.log(`Total records to search: ${totalRecords.length}`);
    
    // Search for mobile numbers in all text fields using SQL
    const mobileInMobile = await db
      .select({
        empCode: employeePullExt.empCode,
        firstName: employeePullExt.firstName,
        lastName: employeePullExt.lastName,
        mobile: employeePullExt.mobile,
        national: employeePullExt.national,
        department: employeePullExt.department
      })
      .from(employeePullExt)
      .where(sql`mobile ~ '^03[0-9]{9}$'`);
    
    console.log(`\n=== MOBILE FIELD SEARCH ===`);
    console.log(`Found ${mobileInMobile.length} records with valid mobile numbers in 'mobile' field`);
    
    // Use raw SQL to search all text fields
    const rawResults = await db.execute(sql`
      SELECT DISTINCT emp_code, first_name, last_name, national, department,
             CASE 
               WHEN mobile ~ '^03[0-9]{9}$' THEN mobile
               WHEN contact_tel ~ '^03[0-9]{9}$' THEN contact_tel
               WHEN office_tel ~ '^03[0-9]{9}$' THEN office_tel
               WHEN national ~ '^03[0-9]{9}$' THEN national
               WHEN card_no ~ '^03[0-9]{9}$' THEN card_no
               WHEN email ~ '^03[0-9]{9}$' THEN email
               WHEN hire_date ~ '^03[0-9]{9}$' THEN hire_date
               WHEN verify_mode ~ '^03[0-9]{9}$' THEN verify_mode
               WHEN city ~ '^03[0-9]{9}$' THEN city
               WHEN app_status ~ '^03[0-9]{9}$' THEN app_status
               WHEN app_role ~ '^03[0-9]{9}$' THEN app_role
               WHEN create_time ~ '^03[0-9]{9}$' THEN create_time
               WHEN change_time ~ '^03[0-9]{9}$' THEN change_time
               WHEN status ~ '^03[0-9]{9}$' THEN status
               WHEN last_activity ~ '^03[0-9]{9}$' THEN last_activity
               ELSE NULL
             END as found_mobile,
             CASE 
               WHEN mobile ~ '^03[0-9]{9}$' THEN 'mobile'
               WHEN contact_tel ~ '^03[0-9]{9}$' THEN 'contact_tel'
               WHEN office_tel ~ '^03[0-9]{9}$' THEN 'office_tel'
               WHEN national ~ '^03[0-9]{9}$' THEN 'national'
               WHEN card_no ~ '^03[0-9]{9}$' THEN 'card_no'
               WHEN email ~ '^03[0-9]{9}$' THEN 'email'
               WHEN hire_date ~ '^03[0-9]{9}$' THEN 'hire_date'
               WHEN verify_mode ~ '^03[0-9]{9}$' THEN 'verify_mode'
               WHEN city ~ '^03[0-9]{9}$' THEN 'city'
               WHEN app_status ~ '^03[0-9]{9}$' THEN 'app_status'
               WHEN app_role ~ '^03[0-9]{9}$' THEN 'app_role'
               WHEN create_time ~ '^03[0-9]{9}$' THEN 'create_time'
               WHEN change_time ~ '^03[0-9]{9}$' THEN 'change_time'
               WHEN status ~ '^03[0-9]{9}$' THEN 'status'
               WHEN last_activity ~ '^03[0-9]{9}$' THEN 'last_activity'
               ELSE NULL
             END as found_in_field
      FROM employee_pull_ext
      WHERE mobile ~ '^03[0-9]{9}$'
         OR contact_tel ~ '^03[0-9]{9}$'
         OR office_tel ~ '^03[0-9]{9}$'
         OR national ~ '^03[0-9]{9}$'
         OR card_no ~ '^03[0-9]{9}$'
         OR email ~ '^03[0-9]{9}$'
         OR hire_date ~ '^03[0-9]{9}$'
         OR verify_mode ~ '^03[0-9]{9}$'
         OR city ~ '^03[0-9]{9}$'
         OR app_status ~ '^03[0-9]{9}$'
         OR app_role ~ '^03[0-9]{9}$'
         OR create_time ~ '^03[0-9]{9}$'
         OR change_time ~ '^03[0-9]{9}$'
         OR status ~ '^03[0-9]{9}$'
         OR last_activity ~ '^03[0-9]{9}$'
      ORDER BY emp_code, found_mobile
    `);
    
    console.log(`\n=== COMPREHENSIVE FIELD SEARCH ===`);
    console.log(`Found ${rawResults.rows.length} records with mobile numbers in ANY field`);
    
    const uniqueMobiles = new Set();
    const uniqueEmployees = new Set();
    const fieldCounts = {};
    
    rawResults.rows.forEach(row => {
      const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
      const deptInfo = row.department ? JSON.stringify(row.department) : 'No dept';
      
      console.log(`${row.emp_code}: ${fullName}`);
      console.log(`  Mobile: ${row.found_mobile}`);
      console.log(`  Found in field: ${row.found_in_field}`);
      console.log(`  National ID: ${row.national || 'MISSING'}`);
      console.log(`  Department: ${deptInfo}`);
      console.log('');
      
      uniqueMobiles.add(row.found_mobile);
      uniqueEmployees.add(row.emp_code);
      
      if (!fieldCounts[row.found_in_field]) {
        fieldCounts[row.found_in_field] = 0;
      }
      fieldCounts[row.found_in_field]++;
    });
    
    console.log(`=== FINAL SUMMARY ===`);
    console.log(`Total unique employees with mobiles: ${uniqueEmployees.size}`);
    console.log(`Total unique mobile numbers: ${uniqueMobiles.size}`);
    console.log(`Total records found: ${rawResults.rows.length}`);
    console.log(`\nMobile numbers by field:`);
    Object.entries(fieldCounts).forEach(([field, count]) => {
      console.log(`  ${field}: ${count}`);
    });
    
    // Check for employees with mobiles but missing National IDs
    const missingNationalWithMobile = rawResults.rows
      .filter(row => !row.national || row.national.trim() === '');
    
    console.log(`\n=== EMPLOYEES WITH MOBILE BUT MISSING NATIONAL ID ===`);
    if (missingNationalWithMobile.length > 0) {
      console.log(`Found ${missingNationalWithMobile.length} employees with mobiles but missing National IDs:`);
      missingNationalWithMobile.forEach(row => {
        const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim();
        console.log(`${row.emp_code}: ${fullName}`);
        console.log(`  Mobile: ${row.found_mobile} (in ${row.found_in_field})`);
        console.log('');
      });
    } else {
      console.log("No employees found with mobiles but missing National IDs");
    }
    
  } catch (error) {
    console.error("Error in comprehensive search:", error);
  }
}

findCnicMobileInAllFields().catch(console.error);