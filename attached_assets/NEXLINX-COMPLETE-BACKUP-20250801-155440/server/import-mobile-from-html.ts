import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import axios from "axios";

async function importMobileNumbersFromHTML() {
  console.log("=== Importing Mobile Numbers from BioTime HTML ===\n");
  
  try {
    // Fetch the HTML page with employee data
    console.log("🌐 Fetching employee data from BioTime API...");
    
    const response = await axios.get('http://202.59.80.69/employees.aspx', {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    console.log(`✅ HTML response received (${response.data.length} characters)`);
    
    // Extract employee data from HTML table
    const htmlContent = response.data;
    
    // Parse HTML table rows - look for patterns like:
    // Employee Code, Name, Mobile, Department, etc.
    const employeeDataRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const tableRows = htmlContent.match(employeeDataRegex) || [];
    
    console.log(`🔍 Found ${tableRows.length} table rows`);
    
    const employees = [];
    let mobileColumnIndex = -1;
    let empCodeColumnIndex = -1;
    let nameColumnIndex = -1;
    
    // Process each table row
    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i];
      
      // Extract cell contents
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        // Clean up cell content - remove HTML tags and trim
        const cellContent = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();
        cells.push(cellContent);
      }
      
      // Skip empty rows
      if (cells.length === 0) continue;
      
      // If this is a header row, find column indices
      if (i === 0 || cells.some(cell => cell.toLowerCase().includes('employee') || cell.toLowerCase().includes('mobile'))) {
        cells.forEach((cell, index) => {
          const cellLower = cell.toLowerCase();
          if (cellLower.includes('mobile') || cellLower.includes('phone')) {
            mobileColumnIndex = index;
          }
          if (cellLower.includes('emp') && cellLower.includes('code')) {
            empCodeColumnIndex = index;
          }
          if (cellLower.includes('name') && !cellLower.includes('user')) {
            nameColumnIndex = index;
          }
        });
        console.log(`📋 Header found - Mobile: col ${mobileColumnIndex}, EmpCode: col ${empCodeColumnIndex}, Name: col ${nameColumnIndex}`);
        continue;
      }
      
      // Extract employee data from data rows
      const empCode = empCodeColumnIndex >= 0 ? cells[empCodeColumnIndex] : null;
      const mobile = mobileColumnIndex >= 0 ? cells[mobileColumnIndex] : null;
      const name = nameColumnIndex >= 0 ? cells[nameColumnIndex] : null;
      
      // Look for mobile numbers in any cell if column not found
      let foundMobile = mobile;
      let foundEmpCode = empCode;
      
      if (!foundMobile || !foundEmpCode) {
        cells.forEach(cell => {
          if (!foundMobile && cell.match(/^03\d{9}$/)) {
            foundMobile = cell;
          }
          if (!foundEmpCode && cell.match(/^10\d{6}$/)) {
            foundEmpCode = cell;
          }
        });
      }
      
      // If we found both mobile and employee code, add to list
      if (foundMobile && foundMobile.match(/^03\d{9}$/) && foundEmpCode && foundEmpCode.match(/^10\d{6}$/)) {
        employees.push({
          empCode: foundEmpCode,
          mobile: foundMobile,
          name: name || 'Unknown',
          rawRow: cells.join(' | ')
        });
      }
    }
    
    console.log(`📱 Extracted ${employees.length} employees with mobile numbers`);
    
    if (employees.length === 0) {
      console.log("❌ No employees with valid mobile numbers found in HTML");
      return;
    }
    
    // Show sample data
    console.log(`\n📋 Sample extracted data:`);
    employees.slice(0, 5).forEach(emp => {
      console.log(`   ${emp.empCode} - ${emp.name}: ${emp.mobile}`);
    });
    
    // Current count
    const currentMobileCount = await db.select({ count: sql<number>`count(*)` })
      .from(employeeRecords)
      .where(sql`mobile IS NOT NULL AND mobile != '' AND mobile != '0' AND mobile != 'NULL' AND TRIM(mobile) != '' AND LENGTH(mobile) >= 10`);
    
    console.log(`\n📊 Current Status:`);
    console.log(`   Employees with mobile numbers: ${currentMobileCount[0].count}`);
    
    // Update employees in database
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;
    
    console.log(`\n📱 Processing mobile number updates...\n`);
    
    for (const apiEmp of employees) {
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
          skippedCount++;
          continue;
        }
        
        if (employee.mobile && employee.mobile.match(/^03[0-9]{9}$/)) {
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
          console.log(`✅ Updated ${apiEmp.empCode} - ${apiEmp.name}: ${apiEmp.mobile}`);
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
    console.log(`   Employees processed: ${employees.length}`);
    console.log(`   Employees updated: ${updatedCount}`);
    console.log(`   Employees skipped: ${skippedCount}`);
    console.log(`   Employees not found: ${notFoundCount}`);
    console.log(`   Total with mobile numbers: ${finalMobileCount[0].count}`);
    console.log(`   Coverage: ${((finalMobileCount[0].count / 312) * 100).toFixed(1)}% of active employees`);
    
    // Check WhatsApp staff directory impact
    const whatsappStaffCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM employee_records 
      WHERE is_active = true 
        AND system_account = false
        AND department != 'EX-EMPLOYEES'
        AND mobile IS NOT NULL 
        AND mobile != '' 
        AND mobile != '0' 
        AND mobile != 'NULL'
        AND TRIM(mobile) != ''
        AND LENGTH(mobile) >= 10
    `);
    
    console.log(`\n📱 WhatsApp Staff Directory:`);
    console.log(`   Employees with mobile numbers: ${whatsappStaffCount.rows[0].count}`);
    console.log(`   Ready for WhatsApp integration!`);
    
  } catch (error) {
    console.error("❌ Error importing mobile numbers:", error);
  }
}

// Run the import
importMobileNumbersFromHTML().then(() => {
  console.log("\n✅ Mobile number import from HTML complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});