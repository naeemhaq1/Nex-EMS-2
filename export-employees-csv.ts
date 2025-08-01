import { db } from "./db";
import { employeeRecords } from "@shared/schema";
import { sql } from "drizzle-orm";
import axios from "axios";
import fs from "fs";
import path from "path";

async function exportEmployeesToCSV() {
  console.log("=== Exporting Full Employee Table to CSV ===\n");
  
  try {
    console.log("🌐 Fetching complete employee data from BioTime API...");
    
    // Try multiple potential endpoints
    const endpoints = [
      'http://202.59.80.69/employees.aspx',
      'http://202.59.80.69/api/employees',
      'http://202.59.80.69/employees.json',
      'http://202.59.80.69/personnel/api/employees/'
    ];
    
    let apiData = null;
    let successEndpoint = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Trying endpoint: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        });
        
        console.log(`✅ Response received (${response.status}) - ${response.data.length} characters`);
        
        // Try to parse as JSON
        if (typeof response.data === 'object') {
          apiData = response.data;
          successEndpoint = endpoint;
          break;
        } else if (typeof response.data === 'string') {
          try {
            apiData = JSON.parse(response.data);
            successEndpoint = endpoint;
            break;
          } catch (parseError) {
            console.log(`⚠️  Could not parse as JSON: ${parseError.message}`);
            
            // If it's HTML, try to extract table data
            if (response.data.includes('<table') || response.data.includes('<tr')) {
              console.log("🔍 Detected HTML table - attempting to extract data...");
              
              // Look for mobile numbers in the HTML
              const mobileMatches = response.data.match(/03\d{9}/g);
              const empCodeMatches = response.data.match(/\b10\d{6}\b/g);
              
              if (mobileMatches && empCodeMatches) {
                console.log(`📱 Found ${mobileMatches.length} mobile numbers and ${empCodeMatches.length} employee codes in HTML`);
                
                // Create basic data structure from HTML
                apiData = [];
                for (let i = 0; i < Math.min(mobileMatches.length, empCodeMatches.length); i++) {
                  apiData.push({
                    empCode: empCodeMatches[i],
                    mobile: mobileMatches[i],
                    source: 'html_extraction'
                  });
                }
                successEndpoint = endpoint;
                break;
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ Failed to fetch from ${endpoint}: ${error.message}`);
        continue;
      }
    }
    
    if (!apiData) {
      console.log("❌ Could not fetch data from any endpoint. Exporting current database data instead...");
      
      // Export current database data
      const dbEmployees = await db.select().from(employeeRecords);
      
      const csvContent = [
        'employee_code,first_name,last_name,mobile,department,designation,is_active,system_account,email',
        ...dbEmployees.map(emp => 
          `"${emp.employeeCode}","${emp.firstName || ''}","${emp.lastName || ''}","${emp.mobile || ''}","${emp.department || ''}","${emp.designation || ''}","${emp.isActive}","${emp.systemAccount}","${emp.email || ''}"`
        )
      ].join('\n');
      
      const csvPath = path.join(process.cwd(), 'employees.csv');
      fs.writeFileSync(csvPath, csvContent);
      
      console.log(`📄 Database export complete: ${dbEmployees.length} employees`);
      console.log(`💾 Saved to: ${csvPath}`);
      return;
    }
    
    console.log(`✅ Successfully fetched data from: ${successEndpoint}`);
    console.log(`📊 Processing ${Array.isArray(apiData) ? apiData.length : 'unknown'} records...`);
    
    // Convert API data to CSV
    let csvRows = [];
    
    if (Array.isArray(apiData)) {
      // Add CSV header
      const headers = Object.keys(apiData[0] || {});
      csvRows.push(headers.join(','));
      
      // Add data rows
      apiData.forEach(record => {
        const row = headers.map(header => {
          const value = record[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(','));
      });
      
    } else if (typeof apiData === 'object') {
      // Single object - convert to single row
      const headers = Object.keys(apiData);
      csvRows.push(headers.join(','));
      
      const row = headers.map(header => {
        const value = apiData[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const csvPath = path.join(process.cwd(), 'employees.csv');
    
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`\n📄 CSV Export Complete!`);
    console.log(`💾 File: employees.csv`);
    console.log(`📊 Records: ${csvRows.length - 1}`);
    console.log(`🌐 Source: ${successEndpoint}`);
    
    // Show preview of mobile numbers found
    const mobileCount = csvContent.match(/03\d{9}/g)?.length || 0;
    console.log(`📱 Mobile numbers found: ${mobileCount}`);
    
    if (mobileCount > 0) {
      const mobileNumbers = csvContent.match(/03\d{9}/g);
      console.log(`📋 Sample mobile numbers: ${mobileNumbers.slice(0, 5).join(', ')}`);
    }
    
    console.log(`\n✅ Ready for mobile number import!`);
    
  } catch (error) {
    console.error("❌ Error exporting employees:", error);
  }
}

// Run the export
exportEmployeesToCSV().then(() => {
  console.log("\n✅ Employee CSV export complete!");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});