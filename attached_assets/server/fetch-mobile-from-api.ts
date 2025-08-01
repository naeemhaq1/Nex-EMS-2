import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import axios from "axios";

interface BioTimeEmployee {
  empCode: string;
  firstName: string;
  lastName: string;
  mobile: string;
  department: string;
  designation: string;
  isActive: boolean;
}

async function fetchMobileNumbersFromAPI() {
  console.log("=== Fetching Mobile Numbers from BioTime API ===\n");
  console.log("🌐 Connecting to: http://202.59.80.69/employees.aspx\n");
  
  try {
    // First, count current mobile numbers in our database
    const currentMobileCount = await db.select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(sql`mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10`);
    
    console.log(`📊 Current Status:`);
    console.log(`   Employees with mobile numbers: ${currentMobileCount[0].count}`);
    
    // Fetch employees from BioTime API
    console.log(`\n🔍 Fetching employee data from BioTime API...`);
    
    const response = await axios.get('http://202.59.80.69/employees.aspx', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    console.log(`✅ API Response received (${response.status})`);
    console.log(`📦 Response size: ${response.data.length} characters`);
    
    // Parse the response data
    let apiEmployees: BioTimeEmployee[] = [];
    
    try {
      // Try parsing as JSON first
      if (typeof response.data === 'object') {
        apiEmployees = response.data;
      } else if (typeof response.data === 'string' && response.data.startsWith('[')) {
        apiEmployees = JSON.parse(response.data);
      } else {
        console.log(`📝 Response format: ${typeof response.data}`);
        console.log(`📝 First 200 characters: ${response.data.substring(0, 200)}`);
        
        // If it's HTML, we need to parse it differently
        if (response.data.includes('<html') || response.data.includes('<!DOCTYPE')) {
          console.log("⚠️  Received HTML response - API might require authentication or different endpoint");
          console.log("🔧 Attempting to extract mobile data from HTML...");
          
          // Try to extract mobile numbers from HTML tables or JSON embedded in HTML
          const mobileMatches = response.data.match(/03\d{9}/g);
          if (mobileMatches) {
            console.log(`📱 Found ${mobileMatches.length} mobile numbers in HTML response`);
            console.log(`📋 Sample mobile numbers: ${mobileMatches.slice(0, 5).join(', ')}`);
          } else {
            console.log("❌ No mobile numbers found in HTML response");
          }
          
          return;
        }
      }
    } catch (parseError) {
      console.error("❌ Error parsing API response:", parseError);
      return;
    }
    
    console.log(`📊 API returned ${apiEmployees.length} employee records`);
    
    // Filter employees with valid mobile numbers
    const employeesWithMobile = apiEmployees.filter(emp => 
      emp.mobile && 
      emp.mobile.match(/^03[0-9]{9}$/) &&
      emp.empCode
    );
    
    console.log(`📱 Found ${employeesWithMobile.length} employees with valid mobile numbers`);
    
    if (employeesWithMobile.length === 0) {
      console.log("❌ No employees with valid mobile numbers found in API response");
      return;
    }
    
    // Update employees in our database
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    
    console.log(`\n📱 Processing mobile number updates...\n`);
    
    for (const apiEmp of employeesWithMobile) {
      try {
        // Find employee in our database
        const existingEmployee = await db.select()
          .from(employeeRecords)
          .where(eq(employeeRecords.employeeCode, apiEmp.empCode));
        
        if (existingEmployee.length === 0) {
          console.log(`⚠️  Employee ${apiEmp.empCode} not found in local database`);
          notFoundCount++;
          continue;
        }
        
        const employee = existingEmployee[0];
        
        // Check if employee needs mobile number update
        if (!employee.isActive || employee.systemAccount) {
          console.log(`⚠️  Skipping ${apiEmp.empCode} - inactive or system account`);
          skippedCount++;
          continue;
        }
        
        if (employee.mobile && employee.mobile.match(/^03[0-9]{9}$/)) {
          console.log(`⚠️  ${apiEmp.empCode} already has mobile: ${employee.mobile}`);
          skippedCount++;
          continue;
        }
        
        // Update mobile number
        const result = await db.update(employeeRecords)
          .set({ 
            mobile: apiEmp.mobile,
            updatedAt: new Date()
          })
          .where(eq(employeeRecords.employeeCode, apiEmp.empCode))
          .returning();
        
        if (result.length > 0) {
          console.log(`✅ Updated ${apiEmp.empCode} - ${apiEmp.firstName} ${apiEmp.lastName || ''}: ${apiEmp.mobile}`);
          updatedCount++;
        }
        
      } catch (updateError) {
        console.error(`❌ Error updating ${apiEmp.empCode}:`, updateError);
      }
    }
    
    // Final count
    const finalMobileCount = await db.select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(sql`mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10`);
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   Employees updated: ${updatedCount}`);
    console.log(`   Employees skipped: ${skippedCount}`);
    console.log(`   Employees not found: ${notFoundCount}`);
    console.log(`   Total with mobile numbers: ${finalMobileCount[0].count}`);
    console.log(`   Coverage: ${((finalMobileCount[0].count / 312) * 100).toFixed(1)}% of active employees`);
    
    // Show department breakdown
    const deptBreakdown = await db.execute(sql`
      SELECT 
        department,
        COUNT(*) as total,
        COUNT(CASE WHEN mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10 THEN 1 END) as with_mobile
      FROM employee_records 
      WHERE is_active = true AND system_account = false
      GROUP BY department
      ORDER BY (COUNT(*) - COUNT(CASE WHEN mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10 THEN 1 END)) DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Department Status (top departments needing mobile numbers):`);
    deptBreakdown.rows.forEach((dept: any) => {
      const missing = dept.total - dept.with_mobile;
      if (missing > 0) {
        console.log(`   ${dept.department}: ${missing}/${dept.total} missing mobile numbers`);
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching from BioTime API:", error);
    
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Status Text: ${error.response?.statusText}`);
      console.error(`   URL: ${error.config?.url}`);
      
      if (error.response?.status === 404) {
        console.log("\n💡 Possible solutions:");
        console.log("   - Check if the endpoint URL is correct");
        console.log("   - Verify the API is accessible from this server");
        console.log("   - Try alternative endpoints like /api/employees or /employees.json");
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log("\n💡 Authentication required:");
        console.log("   - API might require login credentials");
        console.log("   - Try accessing with proper authentication headers");
      }
    }
  }
}

// Run the fetch
fetchMobileNumbersFromAPI().then(() => {
  console.log("\n✅ Mobile number fetch from API complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});